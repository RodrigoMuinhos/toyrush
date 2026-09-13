package br.com.toyfactory.payments;

import org.springframework.web.bind.annotation.*;
import java.time.Instant;

// Only reports what this process can actually verify: itself (trivially — it
// answered), the database, Mercado Pago reachability, and the last signed
// webhook received. No hardware telemetry (CPU/RAM/audio/display/controllers)
// — none of that is observable from this backend.
@RestController @RequestMapping("/api/admin")
public class HealthApi {
  private final Machines machines; private final MercadoPago mp; private final PaymentConfig config;
  public HealthApi(Machines machines, MercadoPago mp, PaymentConfig config) {
    this.machines = machines; this.mp = mp; this.config = config;
  }

  public record HealthView(
    boolean databaseOnline,
    String mercadoPago, // "online" | "offline" | "not_configured"
    Instant lastWebhookAt,
    boolean webhookConfigured
  ) {}

  @GetMapping("/health")
  public HealthView health() {
    boolean dbOnline;
    Instant lastWebhookAt;
    try {
      var machine = machines.findById(config.machineId());
      dbOnline = true;
      lastWebhookAt = machine.map(m -> m.lastWebhookAt).orElse(null);
    } catch (Exception e) {
      dbOnline = false;
      lastWebhookAt = null;
    }

    String mercadoPagoStatus;
    if (config.accessToken() == null || config.accessToken().isBlank()) mercadoPagoStatus = "not_configured";
    else mercadoPagoStatus = mp.ping() ? "online" : "offline";

    boolean webhookConfigured = config.webhookUrl() != null && config.webhookUrl().startsWith("https://");
    return new HealthView(dbOnline, mercadoPagoStatus, lastWebhookAt, webhookConfigured);
  }
}
