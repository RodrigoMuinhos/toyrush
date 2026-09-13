package br.com.toyfactory.payments;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;
import java.nio.file.Path;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class RestartPersistenceTest {
  @TempDir Path directory;
  ConfigurableApplicationContext start() {
    return new SpringApplicationBuilder(PaymentsApplication.class).web(WebApplicationType.NONE).run(
      "--spring.datasource.url=jdbc:h2:file:"+directory.resolve("machine").toString().replace('\\','/')+";MODE=PostgreSQL;DB_CLOSE_ON_EXIT=FALSE",
      "--toy.machine-id=RESTART-TEST", "--toy.access-token=", "--toy.reconcile-initial-ms=3600000",
      "--logging.level.root=WARN", "--debug=false", "--logging.level.org.springframework=WARN", "--logging.level.org.hibernate=WARN");
  }
  @Test void balanceAndGameAuthorizationSurviveBackendRestart() {
    String id=UUID.randomUUID().toString();
    try(var app=start()) {
      var machines=app.getBean(Machines.class);var m=machines.findById("RESTART-TEST").orElseThrow();
      m.credits=3;machines.saveAndFlush(m);
      assertEquals(2,app.getBean(PaymentService.class).startGame(id,"1p").credits());
    }
    try(var app=start()) {
      var service=app.getBean(PaymentService.class);
      assertEquals(2,service.balance().credits());
      assertEquals(id,service.startGame(UUID.randomUUID().toString(),"1p").gameSessionId());
      assertEquals(2,service.balance().credits());
      service.completeGame(id);assertEquals("COMPLETED",app.getBean(Games.class).findById(id).orElseThrow().status);
    }
  }
}
