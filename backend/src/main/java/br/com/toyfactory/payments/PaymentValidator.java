package br.com.toyfactory.payments;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.CONFLICT;

@Component
class PaymentValidator {
  private final PaymentConfig config;
  PaymentValidator(PaymentConfig config) { this.config=config; }
  void validate(Models.Payment p, JsonNode remote) {
    String id=remote.path("id").asText();
    String reference=remote.path("external_reference").asText();
      JsonNode metadata=remote.path("metadata");
      if(id.isBlank() || (p.paymentId!=null&&!p.paymentId.equals(id)) || !p.externalReference.equals(reference)
        || !p.machineId.equals(metadata.path("machine_id").asText()) || !p.id.equals(metadata.path("session_id").asText())
        || !"pix".equals(remote.path("payment_method_id").asText()) || !"BRL".equals(remote.path("currency_id").asText())
        || !remote.has("live_mode") || remote.path("live_mode").asBoolean()!=config.liveMode()
        || !remote.path("transaction_amount").isNumber() || p.amount.compareTo(remote.path("transaction_amount").decimalValue())!=0)
        throw new ResponseStatusException(CONFLICT,"Dados de pagamento divergentes");
    if(!java.util.Set.of("approved","pending","in_process","authorized","cancelled","rejected","refunded","charged_back").contains(remote.path("status").asText()))
      throw new ResponseStatusException(CONFLICT,"Status do provedor não reconhecido");
  }
}
