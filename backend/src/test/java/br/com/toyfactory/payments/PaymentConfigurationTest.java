package br.com.toyfactory.payments;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class PaymentConfigurationTest {
  @Test void missingPayerReportsTheActualConfigurationBlockerWithoutSecrets() {
    var config=new PaymentConfig("TF-001","x".repeat(32),"secret-token","secret-signature",
      "https://example.com/api/webhooks/mercadopago",true,
      List.of(new PaymentConfig.Package("pkg-2-5",2,new BigDecimal("5.00"))),180,"",null);
    assertFalse(config.ready());
    assertEquals(List.of("MP_PIX_PAYER_EMAIL"),config.configurationIssues());
  }
}
