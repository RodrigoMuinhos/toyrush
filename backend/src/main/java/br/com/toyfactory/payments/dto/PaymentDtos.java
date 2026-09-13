package br.com.toyfactory.payments.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import jakarta.validation.constraints.*;

public final class PaymentDtos {
  private PaymentDtos() {}
  public record CreatePix(@NotNull UUID requestId, @NotBlank String packageId) {}
  public record StartGame(@NotNull UUID requestId, @NotNull @Pattern(regexp="1p|coop|1v1") String mode) {}
  public record PaymentView(String sessionId, String paymentId, String status, String qrCode,
      String qrCodeBase64, Instant expiresAt, int credits, BigDecimal amount,
      boolean creditsReleased, boolean autoStartAllowed, int balance) {}
  public record BalanceView(String machineId, int credits, PaymentView activePayment) {}
  public record GameView(String gameSessionId, String status, int credits) {}
  public record PackageView(String id, int credits, BigDecimal amount) {}
}
