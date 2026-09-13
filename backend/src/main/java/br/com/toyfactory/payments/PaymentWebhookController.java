package br.com.toyfactory.payments;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;
import java.util.Map;

@RestController @RequestMapping("/api")
public class PaymentWebhookController {
  private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(PaymentWebhookController.class);
  private final PaymentApprovalService service;
  private final WebhookSignature signature;
  private final PaymentStore store;
  public PaymentWebhookController(PaymentApprovalService service, WebhookSignature signature, PaymentStore store) {
    this.service=service; this.signature=signature; this.store=store;
  }
  @PostMapping("/webhooks/mercadopago") public Map<String,String> webhook(@RequestParam("data.id") String id,
      @RequestHeader(value="x-request-id",required=false) String requestId,@RequestHeader(value="x-signature",required=false) String sig,
      @RequestBody(required=false) com.fasterxml.jackson.databind.JsonNode body) {
    if(!signature.valid(id,requestId,sig)) { log.warn("pix_webhook signature_rejected");throw new ResponseStatusException(UNAUTHORIZED); }
    log.info("pix_webhook received paymentId={}",id);
    if(body!=null && body.has("data") && !id.equals(body.path("data").path("id").asText())) throw new ResponseStatusException(BAD_REQUEST);
    store.tx.executeWithoutResult(s->{ var m=store.lockMachine(); m.lastWebhookAt=store.clock.instant(); store.machines.save(m); });
    service.webhook(id);return Map.of("status","ok");
  }
}
