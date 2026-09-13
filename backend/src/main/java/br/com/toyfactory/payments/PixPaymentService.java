package br.com.toyfactory.payments;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;
import static br.com.toyfactory.payments.dto.PaymentDtos.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
public class PixPaymentService {
  private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(PixPaymentService.class);
  private final PaymentStore store;
  private final MercadoPago mp;
  private final PaymentStatusService statuses;
  private final PaymentApprovalService approvals;
  public PixPaymentService(PaymentStore store, MercadoPago mp, PaymentStatusService statuses, PaymentApprovalService approvals) {
    this.store=store;
    this.mp=mp;
    this.statuses=statuses;
    this.approvals=approvals;
  }
  public PaymentView createForKiosk(String requestId,String packageId) {
    return create(requestId,packageId,store.config.pixPayerEmail(),null);
  }
  public PaymentView create(String requestId,String packageId,String email,String cpf) {
    if(!store.config.ready()) {
      log.warn("pix_not_configured fields={}",store.config.configurationIssues());
      throw new ResponseStatusException(SERVICE_UNAVAILABLE,"Pagamento ainda não configurado nesta máquina");
    }
    log.info("pix_requested machineId={} sessionId={} packageId={}",store.config.machineId(),requestId,packageId);
    UUID.fromString(requestId);
    var chosen=store.config.find(packageId).orElseThrow(()->new ResponseStatusException(BAD_REQUEST,"Pacote inválido"));
    Models.Payment p=store.tx.execute(status->{
      var m=store.lockMachine();var existing=store.payments.findById(requestId);
      if(existing.isPresent()) {
        var old=store.ownPayment(requestId);
        if(!old.payerEmail.equals(email) || !Objects.equals(old.payerCpf,cpf) || old.credits!=chosen.credits() || old.amount.compareTo(chosen.amount())!=0)
          throw new ResponseStatusException(CONFLICT,"Tentativa de pagamento diferente");
        return old;
      }
      var active=store.payments.findFirstByMachineIdAndClosedFalseOrderByCreatedAtDesc(m.id);
      if(active.isPresent()) { store.expire(active.get()); throw new ResponseStatusException(CONFLICT,"Retome ou feche a cobrança atual antes de criar outra"); }
      var created=new Models.Payment();created.id=requestId;created.machineId=m.id;created.credits=chosen.credits();created.amount=chosen.amount();
      created.payerEmail=email;created.payerCpf=cpf;created.createdAt=store.clock.instant();created.expiresAt=created.createdAt.plusSeconds(store.config.sessionSeconds());
      created.lastReconciledAt=created.createdAt;created.providerExpiresAt=created.createdAt.plusSeconds(1800);created.externalReference=m.id+":"+requestId;
      created.status="CREATED";created.autoStartAllowed=true;
      store.payments.saveAndFlush(created);
      store.audit.record(m.id,created.id,null,"CREATED",created.status,0,m.credits);
      return created;
    });
    // The intent commits BEFORE contacting the provider, preserving the exact body/key across timeouts/restarts.
    if(p.paymentId==null && !p.closed && store.clock.instant().isBefore(p.expiresAt)) approvals.accept(mp.create(p));
    else log.info("pix_reused sessionId={} paymentId={}",p.id,p.paymentId);
    return statuses.status(p.id);
  }
  public PaymentView close(String id) {
    var p=store.tx.execute(s->{var m=store.lockMachine();var payment=store.ownPayment(id);boolean wasClosed=payment.closed;payment.closed=true;payment.autoStartAllowed=false;
      if(!payment.creditsReleased && !"PAID_LATE".equals(payment.status)) payment.status="CANCELLED";
      if(!wasClosed) store.audit.record(m.id,payment.id,payment.paymentId,"CLOSED",payment.status,0,m.credits);
      return store.payments.saveAndFlush(payment);});
    // Closing never authorizes a game. Approvals received after closure are held for review.
    if(p.paymentId!=null && !p.creditsReleased) { try { approvals.accept(mp.cancel(p.paymentId)); } catch(Exception ignored) { /* Reconciliation retries authoritative status. */ } }
    return statuses.status(id);
  }
}
