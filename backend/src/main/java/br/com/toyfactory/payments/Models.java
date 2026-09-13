package br.com.toyfactory.payments;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

public final class Models {
  @Entity(name="Machine") @Table(name="machine_balance")
  public static class Machine {
    @Id public String id;
    public int credits;
  }
  @Entity(name="Payment") @Table(name="payment_session")
  public static class Payment {
    @Id public String id;
    public String machineId;
    public int credits;
    public BigDecimal amount;
    public String payerEmail;
    public String payerCpf;
    public Instant createdAt;
    public Instant expiresAt;
    public Instant providerExpiresAt;
    public Instant lastReconciledAt;
    public String paymentId;
    public String externalReference;
    public String status;
    public String providerStatus;
    @Column(columnDefinition="text") public String qrCode;
    @Column(columnDefinition="text") public String qrCodeBase64;
    public boolean creditsReleased;
    public boolean autoStartAllowed;
    public boolean closed;
  }
  @Entity(name="Game") @Table(name="game_session")
  public static class Game {
    @Id public String id;
    public String machineId;
    public String mode;
    public int cost;
    public String status;
    public Instant createdAt;
  }
}
