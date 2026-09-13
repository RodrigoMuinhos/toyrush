package br.com.toyfactory.payments;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import java.util.Map;

@RestControllerAdvice
public class ApiErrors {
  private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(ApiErrors.class);
  private final com.fasterxml.jackson.databind.ObjectMapper json;
  public ApiErrors(com.fasterxml.jackson.databind.ObjectMapper json) { this.json=json; }
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> status(ResponseStatusException error) {return ResponseEntity.status(error.getStatusCode()).body(Map.of("message",error.getReason()==null?"Solicitação não autorizada":error.getReason()));}
  @ExceptionHandler({MethodArgumentNotValidException.class,IllegalArgumentException.class})
  ResponseEntity<?> invalid(Exception error) {return ResponseEntity.badRequest().body(Map.of("message","Confira os dados informados"));}
  @ExceptionHandler(RestClientException.class)
  ResponseEntity<?> provider(Exception error) {
    if(error instanceof org.springframework.web.client.RestClientResponseException remote) {
      var codes=new java.util.ArrayList<String>();
      try {
        var response=json.readTree(remote.getResponseBodyAsString());
        for(var cause:response.path("cause")) {
          String code=cause.path("code").asText();
          if(code.matches("[0-9]{1,12}")) codes.add(code);
        }
      } catch(Exception ignored) { /* Never log the raw response: it may contain payer data. */ }
      log.warn("pix_provider_error httpStatus={} causeCodes={}",remote.getStatusCode().value(),codes);
      if(codes.contains("13253")) return ResponseEntity.status(503).body(Map.of(
        "code","PIX_RECEIVER_NOT_ENABLED",
        "message","A conta recebedora ainda não está habilitada para gerar QR Pix no Mercado Pago. Procure o atendimento."));
    } else log.warn("pix_provider_unavailable type={}",error.getClass().getSimpleName());
    return ResponseEntity.status(502).body(Map.of("message","Não foi possível consultar o Pix. Tente novamente sem gerar outra cobrança."));
  }
}
