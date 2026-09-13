package br.com.toyfactory.payments;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public readiness probe: no credentials, machine data or provider calls. */
@RestController
public class ReadinessController {
  private final JdbcTemplate database;

  public ReadinessController(JdbcTemplate database) {
    this.database = database;
  }

  @GetMapping("/healthz")
  public ResponseEntity<Map<String, String>> ready() {
    try {
      database.queryForObject("SELECT 1", Integer.class);
      return ResponseEntity.ok(Map.of("status", "UP"));
    } catch (Exception unavailable) {
      return ResponseEntity.status(503).body(Map.of("status", "DOWN"));
    }
  }
}
