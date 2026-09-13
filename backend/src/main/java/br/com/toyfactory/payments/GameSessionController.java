package br.com.toyfactory.payments;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import static br.com.toyfactory.payments.dto.PaymentDtos.*;
import java.util.Map;

@RestController @RequestMapping("/api/game-sessions")
public class GameSessionController {
  private final GameSessionService service;
  public GameSessionController(GameSessionService service) { this.service=service; }
  @PostMapping public GameView start(@Valid @RequestBody StartGame req) { return service.startGame(req.requestId().toString(),req.mode()); }
  @PostMapping("/{id}/complete") public Map<String,String> complete(@PathVariable String id) { service.completeGame(id); return Map.of("status","COMPLETED"); }
}
