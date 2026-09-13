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
public class PaymentReconciliation {
  private final PaymentStore store;
  private final MercadoPago mp;
  private final PaymentStatusService statuses;
  private final PaymentApprovalService approvals;
  public PaymentReconciliation(PaymentStore store, MercadoPago mp, PaymentStatusService statuses, PaymentApprovalService approvals) {
    this.store=store;
    this.mp=mp;
    this.statuses=statuses;
    this.approvals=approvals;
  }
  @org.springframework.scheduling.annotation.Scheduled(fixedDelayString="${toy.reconcile-ms:15000}", initialDelayString="${toy.reconcile-initial-ms:5000}")
  public void reconcile() {
    if(!store.config.ready()) return;
    for(var p:store.payments.pending(org.springframework.data.domain.PageRequest.of(0,50))) {
      try {
        if(p.paymentId!=null) {
          approvals.accept(mp.get(p.paymentId));
          if(!store.clock.instant().isBefore(p.expiresAt) && Set.of("pending","in_process").contains(p.providerStatus)) approvals.accept(mp.cancel(p.paymentId));
        } else if(!p.closed && store.clock.instant().isBefore(p.expiresAt)) approvals.accept(mp.create(p));
        else {
          var results=mp.search(p.externalReference);
          if(results!=null) for(var remote:results.path("results")) approvals.webhook(remote.path("id").asText());
        }
        statuses.status(p.id);
      } catch(Exception ignored) { org.slf4j.LoggerFactory.getLogger(PaymentReconciliation.class).warn("Reconciliation deferred for session {}", p.id); }
      finally { store.tx.executeWithoutResult(s->{ store.lockMachine();var current=store.ownPayment(p.id);current.lastReconciledAt=store.clock.instant();store.payments.save(current); }); }
    }
  }
}
