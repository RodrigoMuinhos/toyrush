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
public class PaymentApprovalService {
  private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(PaymentApprovalService.class);
  private final PaymentStore store;
  private final MercadoPago mp;
  private final PaymentValidator validator;
  public PaymentApprovalService(PaymentStore store, MercadoPago mp, PaymentValidator validator) {
    this.store=store;
    this.mp=mp;
    this.validator=validator;
  }
  public void accept(JsonNode remote) {
    if(remote==null) throw new ResponseStatusException(BAD_GATEWAY);
    String reference=remote.path("external_reference").asText();
    var found=store.payments.findByExternalReference(reference);
    if(found.isEmpty()) return; // Another integration on the same Mercado Pago account.
    store.tx.executeWithoutResult(s->{
      var m=store.lockMachine();var p=store.ownPayment(found.get().id);
      String id=remote.path("id").asText();String providerStatus=remote.path("status").asText();
      validator.validate(p,remote);
      String previous=p.status;
      p.paymentId=id; p.providerStatus=providerStatus;
      log.info("pix_validated machineId={} sessionId={} paymentId={} providerStatus={}",m.id,p.id,id,providerStatus);
      if(p.creditsReleased) { log.info("pix_duplicate_ignored paymentId={}",id);return; }
      if("approved".equals(providerStatus)) {
        Instant approvedAt;
        try { approvedAt=OffsetDateTime.parse(remote.path("date_approved").asText()).toInstant(); }
        catch(Exception e) { throw new ResponseStatusException(CONFLICT,"Data de aprovação inválida"); }
        if(approvedAt.isBefore(p.createdAt.minusSeconds(60)) || approvedAt.isAfter(store.clock.instant().plusSeconds(60)))
          throw new ResponseStatusException(CONFLICT,"Data de aprovação divergente");
        if(p.closed || Set.of("EXPIRED","CANCELLED","REJECTED","PAID_LATE").contains(p.status) || !approvedAt.isBefore(p.expiresAt)) {
          p.status="PAID_LATE"; p.autoStartAllowed=false;
          if(!previous.equals(p.status)) store.audit.record(m.id,p.id,id,"LATE_APPROVAL_HELD",p.status,0,m.credits);
          store.payments.save(p); return;
        }
        p.status="PAID";
        m.credits=Math.addExact(m.credits,p.credits);store.machines.save(m);
        p.creditsReleased=true;p.status="CREDITS_RELEASED";
        if(p.closed || !approvedAt.isBefore(p.expiresAt) || !store.clock.instant().isBefore(p.expiresAt)) p.autoStartAllowed=false;
      } else if(Set.of("cancelled","rejected","refunded","charged_back").contains(providerStatus)) {
        p.status="rejected".equals(providerStatus)?"REJECTED":"CANCELLED";p.autoStartAllowed=false;
      } else if(!Set.of("CANCELLED","REJECTED","PAID_LATE").contains(p.status) && !p.closed && store.clock.instant().isBefore(p.expiresAt)) {
        p.status="WAITING_PAYMENT";
        var data=remote.path("point_of_interaction").path("transaction_data");
        p.qrCode=data.path("qr_code").asText();p.qrCodeBase64=data.path("qr_code_base64").asText();
      } else store.expire(p);
      if(!previous.equals(p.status)) store.audit.record(m.id,p.id,id,p.creditsReleased?"CREDITS_RELEASED":"STATUS_CHANGED",p.status,p.creditsReleased?p.credits:0,m.credits);
      store.payments.save(p);
      if(p.creditsReleased) {
        final String machineId=m.id, sessionId=p.id; final int delta=p.credits;
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
          new org.springframework.transaction.support.TransactionSynchronization() {
            @Override public void afterCommit() { log.info("pix_credit_granted machineId={} sessionId={} paymentId={} credits={}",machineId,sessionId,id,delta); }
          });
      }
    });
  }
  public void webhook(String paymentId) { var remote=mp.get(paymentId);if(!paymentId.equals(remote.path("id").asText())) throw new ResponseStatusException(CONFLICT);accept(remote); }
}
