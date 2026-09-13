package br.com.toyfactory.payments;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
public class PaymentService implements ApplicationRunner {
  private final Machines machines; private final Payments payments; private final Games games;
  private final MercadoPago mp; private final PaymentConfig config; private final Clock clock; private final TransactionTemplate tx;
  public PaymentService(Machines machines,Payments payments,Games games,MercadoPago mp,PaymentConfig config,Clock clock,PlatformTransactionManager manager) {
    this.machines=machines; this.payments=payments; this.games=games; this.mp=mp; this.config=config; this.clock=clock; tx=new TransactionTemplate(manager);
  }
  @Override public void run(ApplicationArguments args) {
    if(!machines.existsById(config.machineId())) { var m=new Models.Machine();m.id=config.machineId();machines.saveAndFlush(m); }
  }
  public record PaymentView(String sessionId,String paymentId,String status,String qrCode,String qrCodeBase64,Instant expiresAt,
      int credits,BigDecimal amount,boolean creditsReleased,boolean autoStartAllowed,int balance) {}
  public record BalanceView(String machineId,int credits,PaymentView activePayment) {}
  public record GameView(String gameSessionId,String status,int credits) {}
  public record PackageView(String id,int credits,BigDecimal amount) {}
  public Map<String,Object> catalog() {
    var packages=config.packages()==null?List.<PackageView>of():config.packages().stream().map(p->new PackageView(p.id(),p.credits(),p.amount())).toList();
    return Map.of("machineId",config.machineId(),"ready",config.ready(),"packages",packages);
  }
  private Models.Machine lockMachine() { return machines.locked(config.machineId()).orElseThrow(); }
  private Models.Payment ownPayment(String id) {
    var p=payments.findById(id).orElseThrow(()->new ResponseStatusException(NOT_FOUND,"Cobrança não encontrada"));
    if(!p.machineId.equals(config.machineId())) throw new ResponseStatusException(NOT_FOUND);
    return p;
  }
  private PaymentView view(Models.Payment p,int balance) {
    boolean visible=!p.closed && clock.instant().isBefore(p.expiresAt) && p.status.equals("WAITING_PAYMENT");
    return new PaymentView(p.id,p.paymentId,p.status,visible?p.qrCode:null,visible?p.qrCodeBase64:null,p.expiresAt,p.credits,p.amount,p.creditsReleased,p.autoStartAllowed&&!p.closed,balance);
  }
  public BalanceView balance() {
    return tx.execute(status->{ var m=lockMachine();var active=payments.findFirstByMachineIdAndClosedFalseOrderByCreatedAtDesc(m.id);
      active.ifPresent(this::expire);return new BalanceView(m.id,m.credits,active.map(p->view(p,m.credits)).orElse(null)); });
  }
  private void expire(Models.Payment p) {
    if(!p.creditsReleased && !clock.instant().isBefore(p.expiresAt) && Set.of("CREATED","WAITING_PAYMENT").contains(p.status)) {
      p.status="EXPIRED"; p.autoStartAllowed=false;payments.save(p);
    }
  }
  public PaymentView createForKiosk(String requestId,String packageId) {
    return create(requestId,packageId,config.pixPayerEmail(),null);
  }
  public PaymentView create(String requestId,String packageId,String email,String cpf) {
    if(!config.ready()) throw new ResponseStatusException(SERVICE_UNAVAILABLE,"Pagamento ainda não configurado nesta máquina");
    UUID.fromString(requestId);
    var chosen=config.find(packageId).orElseThrow(()->new ResponseStatusException(BAD_REQUEST,"Pacote inválido"));
    Models.Payment p=tx.execute(status->{
      var m=lockMachine();var existing=payments.findById(requestId);
      if(existing.isPresent()) {
        var old=ownPayment(requestId);
        if(!old.payerEmail.equals(email) || !Objects.equals(old.payerCpf,cpf) || old.credits!=chosen.credits() || old.amount.compareTo(chosen.amount())!=0)
          throw new ResponseStatusException(CONFLICT,"Tentativa de pagamento diferente");
        return old;
      }
      var active=payments.findFirstByMachineIdAndClosedFalseOrderByCreatedAtDesc(m.id);
      if(active.isPresent()) { expire(active.get()); throw new ResponseStatusException(CONFLICT,"Retome ou feche a cobrança atual antes de criar outra"); }
      var created=new Models.Payment();created.id=requestId;created.machineId=m.id;created.credits=chosen.credits();created.amount=chosen.amount();
      created.payerEmail=email;created.payerCpf=cpf;created.createdAt=clock.instant();created.expiresAt=created.createdAt.plusSeconds(config.sessionSeconds());
      created.lastReconciledAt=created.createdAt;created.providerExpiresAt=created.createdAt.plusSeconds(1800);created.externalReference=m.id+":"+requestId;
      created.status="CREATED";created.autoStartAllowed=true;
      return payments.saveAndFlush(created);
    });
    // The intent commits BEFORE contacting the provider, preserving the exact body/key across timeouts/restarts.
    if(p.paymentId==null && !p.closed && clock.instant().isBefore(p.expiresAt)) accept(mp.create(p));
    return status(p.id);
  }
  public PaymentView status(String id) {
    return tx.execute(s->{var m=lockMachine();var p=ownPayment(id);expire(p);return view(p,m.credits);});
  }
  public void accept(JsonNode remote) {
    if(remote==null) throw new ResponseStatusException(BAD_GATEWAY);
    String reference=remote.path("external_reference").asText();
    var found=payments.findByExternalReference(reference);
    if(found.isEmpty()) return; // Another integration on the same Mercado Pago account.
    tx.executeWithoutResult(s->{
      var m=lockMachine();var p=ownPayment(found.get().id);
      String id=remote.path("id").asText();String providerStatus=remote.path("status").asText();
      JsonNode metadata=remote.path("metadata");
      if(id.isBlank() || (p.paymentId!=null&&!p.paymentId.equals(id)) || !p.externalReference.equals(reference)
        || !p.machineId.equals(metadata.path("machine_id").asText()) || !p.id.equals(metadata.path("session_id").asText())
        || !"pix".equals(remote.path("payment_method_id").asText()) || !"BRL".equals(remote.path("currency_id").asText())
        || !remote.has("live_mode") || remote.path("live_mode").asBoolean()!=config.liveMode()
        || !remote.path("transaction_amount").isNumber() || p.amount.compareTo(remote.path("transaction_amount").decimalValue())!=0)
        throw new ResponseStatusException(CONFLICT,"Dados de pagamento divergentes");
      p.paymentId=id; p.providerStatus=providerStatus;
      if(p.creditsReleased) return;
      if("approved".equals(providerStatus)) {
        Instant approvedAt;
        try { approvedAt=OffsetDateTime.parse(remote.path("date_approved").asText()).toInstant(); }
        catch(Exception e) { throw new ResponseStatusException(CONFLICT,"Data de aprovação inválida"); }
        if(approvedAt.isBefore(p.createdAt.minusSeconds(60)) || approvedAt.isAfter(clock.instant().plusSeconds(60)))
          throw new ResponseStatusException(CONFLICT,"Data de aprovação divergente");
        p.status="PAID";
        m.credits=Math.addExact(m.credits,p.credits);machines.save(m);
        p.creditsReleased=true;p.status="CREDITS_RELEASED";
        if(p.closed || !approvedAt.isBefore(p.expiresAt) || !clock.instant().isBefore(p.expiresAt)) p.autoStartAllowed=false;
      } else if(Set.of("cancelled","rejected","refunded","charged_back").contains(providerStatus)) {
        p.status="CANCELLED";p.autoStartAllowed=false;
      } else if(!p.closed && clock.instant().isBefore(p.expiresAt)) {
        p.status="WAITING_PAYMENT";
        var data=remote.path("point_of_interaction").path("transaction_data");
        p.qrCode=data.path("qr_code").asText();p.qrCodeBase64=data.path("qr_code_base64").asText();
      } else expire(p);
      payments.save(p);
    });
  }
  public PaymentView close(String id) {
    var p=tx.execute(s->{var m=lockMachine();var payment=ownPayment(id);payment.closed=true;payment.autoStartAllowed=false;
      if(!payment.creditsReleased && !"PAID_LATE".equals(payment.status)) payment.status="CANCELLED";
      return payments.saveAndFlush(payment);});
    // Closing never authorizes a game. A verified payment racing with cancellation still keeps the purchased balance.
    if(p.paymentId!=null && !p.creditsReleased) { try { accept(mp.cancel(p.paymentId)); } catch(Exception ignored) { /* Reconciliation retries authoritative status. */ } }
    return status(id);
  }
  public void webhook(String paymentId) { var remote=mp.get(paymentId);if(!paymentId.equals(remote.path("id").asText())) throw new ResponseStatusException(CONFLICT);accept(remote); }
  public GameView startGame(String requestId,String mode) {
    UUID.fromString(requestId);
    int cost=switch(mode) {case "1p" -> 1;case "coop","1v1" -> 2;default -> throw new ResponseStatusException(BAD_REQUEST);};
    return tx.execute(s->{var m=lockMachine();var old=games.findById(requestId);
      if(old.isPresent()) {
        var g=old.get();if(!g.machineId.equals(m.id)||!g.mode.equals(mode)) throw new ResponseStatusException(CONFLICT);
        return new GameView(g.id,g.status,m.credits);
      }
      var active=games.findFirstByMachineIdAndStatusOrderByCreatedAtDesc(m.id,"GAME_STARTED");
      if(active.isPresent()) {
        var g=active.get();
        if(!g.mode.equals(mode)) throw new ResponseStatusException(CONFLICT,"Existe uma partida não concluída no modo "+g.mode+". Selecione esse modo para retomá-la.");
        return new GameView(g.id,g.status,m.credits);
      }
      if(m.credits<cost) throw new ResponseStatusException(PAYMENT_REQUIRED,"Créditos insuficientes");
      m.credits-=cost;machines.save(m);
      var game=new Models.Game();game.id=requestId;game.machineId=m.id;game.mode=mode;game.cost=cost;game.status="GAME_STARTED";game.createdAt=clock.instant();games.save(game);
      return new GameView(game.id,game.status,m.credits);
    });
  }
  public void completeGame(String id) {
    tx.executeWithoutResult(s->{lockMachine();var g=games.findById(id).orElseThrow(()->new ResponseStatusException(NOT_FOUND));
      if(!g.machineId.equals(config.machineId())) throw new ResponseStatusException(NOT_FOUND);g.status="COMPLETED";games.save(g);});
  }
  public void reconcile() {
    if(!config.ready()) return;
    for(var p:payments.pending(org.springframework.data.domain.PageRequest.of(0,50))) {
      try {
        if(p.paymentId!=null) {
          accept(mp.get(p.paymentId));
          if(!clock.instant().isBefore(p.expiresAt) && Set.of("pending","in_process").contains(p.providerStatus)) accept(mp.cancel(p.paymentId));
        } else if(!p.closed && clock.instant().isBefore(p.expiresAt)) accept(mp.create(p));
        else {
          var results=mp.search(p.externalReference);
          if(results!=null) for(var remote:results.path("results")) webhook(remote.path("id").asText());
        }
        status(p.id);
      } catch(Exception ignored) { org.slf4j.LoggerFactory.getLogger(PaymentService.class).warn("Reconciliation deferred for session {}", p.id); }
      finally { tx.executeWithoutResult(s->{ lockMachine();var current=ownPayment(p.id);current.lastReconciledAt=clock.instant();payments.save(current); }); }
    }
  }
}
