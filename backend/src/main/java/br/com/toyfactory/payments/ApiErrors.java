package br.com.toyfactory.payments;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import java.util.Map;

@RestControllerAdvice
public class ApiErrors {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> status(ResponseStatusException error) {return ResponseEntity.status(error.getStatusCode()).body(Map.of("message",error.getReason()==null?"Solicitação não autorizada":error.getReason()));}
  @ExceptionHandler({MethodArgumentNotValidException.class,IllegalArgumentException.class})
  ResponseEntity<?> invalid(Exception error) {return ResponseEntity.badRequest().body(Map.of("message","Confira os dados informados"));}
  @ExceptionHandler(RestClientException.class)
  ResponseEntity<?> provider(Exception error) {return ResponseEntity.status(502).body(Map.of("message","Não foi possível consultar o Pix. Tente novamente sem gerar outra cobrança."));}
}
