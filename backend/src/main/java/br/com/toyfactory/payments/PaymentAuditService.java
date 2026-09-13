package br.com.toyfactory.payments;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.data.jpa.repository.JpaRepository;

interface PaymentAudits extends JpaRepository<PaymentAudit,String> {
  long countByEvent(String event);
}

/** Called inside the same locked transaction as the balance/state change. */
@Service
class PaymentAuditService {
  private final PaymentAudits repository;
  private final Clock clock;
  PaymentAuditService(PaymentAudits repository,Clock clock) { this.repository=repository; this.clock=clock; }
  void record(String machineId,String sessionId,String paymentId,String event,String status,int delta,int balance) {
    var row=new PaymentAudit();row.id=UUID.randomUUID().toString();row.machineId=machineId;
    row.sessionId=sessionId;row.paymentId=paymentId;row.event=event;row.status=status;
    row.creditDelta=delta;row.balanceAfter=balance;row.createdAt=clock.instant();repository.save(row);
    org.slf4j.LoggerFactory.getLogger(getClass()).info("Payment event={} machine={} session={} payment={} delta={}",event,machineId,sessionId,paymentId,delta);
  }
}
