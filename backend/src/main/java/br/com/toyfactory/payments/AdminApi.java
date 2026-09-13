package br.com.toyfactory.payments;

import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import static org.springframework.http.HttpStatus.*;

// Everything under /api is already behind the X-Machine-Key interceptor (ApiSecurity).
// This adds a second, human-facing gate for the hidden operator panel (F8x3 in the kiosk).
@RestController @RequestMapping("/api/admin")
public class AdminApi {
  private final PaymentConfig config;
  public AdminApi(PaymentConfig config) { this.config = config; }
  record VerifyPin(@NotBlank String pin) {}
  @PostMapping("/verify-pin") public Map<String,Boolean> verifyPin(@RequestBody VerifyPin body) {
    if (!config.adminConfigured()) throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Painel administrativo não configurado");
    boolean match = MessageDigest.isEqual(
      config.adminPin().getBytes(StandardCharsets.UTF_8),
      body.pin().getBytes(StandardCharsets.UTF_8));
    if (!match) throw new ResponseStatusException(UNAUTHORIZED, "PIN incorreto");
    return Map.of("ok", true);
  }
}
