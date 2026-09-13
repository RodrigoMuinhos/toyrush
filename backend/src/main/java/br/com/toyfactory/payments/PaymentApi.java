package br.com.toyfactory.payments;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.scheduling.annotation.Scheduled;
import static org.springframework.http.HttpStatus.*;
import java.util.Map;

@RestController @RequestMapping("/api")
public class PaymentApi {
  private final PaymentService service;private final WebhookSignature signature;
  public PaymentApi(PaymentService service,WebhookSignature signature) {this.service=service;this.signature=signature;}
  record CreatePix(@NotNull java.util.UUID requestId,@NotBlank String packageId) {}
  record StartGame(@NotNull java.util.UUID requestId,@Pattern(regexp="1p|coop|1v1") @NotNull String mode) {}
  @GetMapping("/payments/packages") public Map<String,Object> packages() {return service.catalog();}
  @GetMapping("/machine/balance") public PaymentService.BalanceView balance() {return service.balance();}
  @PostMapping("/payments/pix") public PaymentService.PaymentView pix(@Valid @RequestBody CreatePix req) {return service.createForKiosk(req.requestId().toString(),req.packageId());}
  @GetMapping("/payments/{id}/status") public PaymentService.PaymentView status(@PathVariable String id) {return service.status(id);}
  @PostMapping("/payments/{id}/close") public PaymentService.PaymentView close(@PathVariable String id) {return service.close(id);}
  @PostMapping("/game-sessions") public PaymentService.GameView start(@Valid @RequestBody StartGame req) {return service.startGame(req.requestId().toString(),req.mode());}
  @PostMapping("/game-sessions/{id}/complete") public Map<String,String> complete(@PathVariable String id) {service.completeGame(id);return Map.of("status","COMPLETED");}
  @PostMapping("/webhooks/mercadopago") public Map<String,String> webhook(@RequestParam("data.id") String id,
      @RequestHeader(value="x-request-id",required=false) String requestId,@RequestHeader(value="x-signature",required=false) String sig,
      @RequestBody(required=false) com.fasterxml.jackson.databind.JsonNode body) {
    if(!signature.valid(id,requestId,sig)) throw new ResponseStatusException(UNAUTHORIZED);
    if(body!=null && body.has("data") && !id.equals(body.path("data").path("id").asText())) throw new ResponseStatusException(BAD_REQUEST);
    service.webhook(id);return Map.of("status","ok");
  }
  @Scheduled(fixedDelayString="${toy.reconcile-ms:15000}", initialDelayString="${toy.reconcile-initial-ms:5000}") public void reconcile() {service.reconcile();}
}
