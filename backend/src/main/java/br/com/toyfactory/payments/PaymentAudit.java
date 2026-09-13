package br.com.toyfactory.payments;
import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="payment_audit")
public class PaymentAudit {
  @Id public String id;
  public String machineId;
  public String sessionId;
  public String paymentId;
  public String event;
  public String status;
  public int creditDelta;
  public int balanceAfter;
  public Instant createdAt;
}
