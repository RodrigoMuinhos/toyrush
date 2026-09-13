package br.com.toyfactory.payments;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={
  "spring.datasource.url=jdbc:h2:mem:paymenttest;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
  "toy.pix-payer-email=payer@example.com", "toy.machine-key=abcdefghijklmnopqrstuvwxyz1234567890", "toy.access-token=test-only-token",
  "toy.webhook-secret=test-webhook-secret", "toy.webhook-url=https://example.com/api/webhooks/mercadopago",
  "toy.reconcile-initial-ms=3600000", "logging.level.root=WARN", "debug=false", "logging.level.org.springframework=WARN", "logging.level.org.hibernate=WARN"
})
@AutoConfigureMockMvc
class PaymentFlowTest {
  @Autowired PaymentService service; @Autowired Payments payments; @Autowired Games games; @Autowired Machines machines;
  @Autowired ObjectMapper json; @Autowired MockMvc mvc; @Autowired WebhookSignature signatures;
  @MockitoBean MercadoPago mp; @MockitoBean Clock clock;
  final Instant now=Instant.parse("2026-09-12T12:00:00Z");
  @BeforeEach void setup() {
    games.deleteAll();payments.deleteAll();
    var m=machines.findById("TF-001").orElseThrow();m.credits=0;machines.saveAndFlush(m);
    when(clock.instant()).thenReturn(now);
    doAnswer(inv->remote(inv.getArgument(0),"pending")).when(mp).create(any());
  }
  ObjectNode remote(Models.Payment p,String status) {
    var r=json.createObjectNode();r.put("id","12345678");r.put("external_reference",p.externalReference);
    r.put("transaction_amount",p.amount);r.put("payment_method_id","pix");r.put("currency_id","BRL");
    r.put("live_mode",false);r.put("status",status);r.put("date_approved",now.plusSeconds(30).toString());
    r.putObject("metadata").put("machine_id",p.machineId).put("session_id",p.id);
    r.putObject("point_of_interaction").putObject("transaction_data").put("qr_code","pix-test").put("qr_code_base64","dGVzdA==");
    return r;
  }
  // pkg-4-10 = 4 créditos / R$ 10,00, um dos três pacotes reais expostos pelo catálogo (ver catalogExposesTheThreeConfiguredPackages).
  static final String PKG="pkg-4-10";
  PaymentService.PaymentView create() { return service.create(UUID.randomUUID().toString(),PKG,"payer@example.com",null); }
  ObjectNode approved(String id) { return remote(payments.findById(id).orElseThrow(),"approved"); }
  @Test void pendingDoesNotGrantAndRetryReusesPayment() {
    var p=create();assertEquals("WAITING_PAYMENT",p.status());assertEquals(0,service.balance().credits());
    var retry=service.create(p.sessionId(),PKG,"payer@example.com",null);
    assertEquals(p.paymentId(),retry.paymentId());verify(mp,times(1)).create(any());
  }
  @Test void duplicateAndConcurrentApprovalsReleaseExactlyOnce() throws Exception {
    var p=create();var remote=approved(p.sessionId());
    try(var executor=Executors.newFixedThreadPool(6)) {
      var tasks=new ArrayList<Callable<Void>>();
      for(int i=0;i<12;i++) tasks.add(()->{service.accept(remote);return null;});
      for(var result:executor.invokeAll(tasks)) result.get();
    }
    assertEquals(4,service.balance().credits());assertTrue(service.status(p.sessionId()).creditsReleased());
  }
  @Test void rejectsWrongAmountMachineMethodAndPaymentId() {
    var p=create();var good=approved(p.sessionId());
    var wrong=good.deepCopy();wrong.put("transaction_amount",new BigDecimal("0.01"));
    assertThrows(ResponseStatusException.class,()->service.accept(wrong));
    var machine=good.deepCopy();((ObjectNode)machine.path("metadata")).put("machine_id","OTHER");
    assertThrows(ResponseStatusException.class,()->service.accept(machine));
    var id=good.deepCopy();id.put("id","999999");assertThrows(ResponseStatusException.class,()->service.accept(id));
    var method=good.deepCopy();method.put("payment_method_id","visa");assertThrows(ResponseStatusException.class,()->service.accept(method));
    assertEquals(0,service.balance().credits());
  }
  @Test void anotherIntegrationDoesNotGrantCredits() {
    var p=create();var other=approved(p.sessionId());other.put("external_reference","other-project");
    service.accept(other);assertEquals(0,service.balance().credits());
  }
  @Test void timeoutKeepsIntentAndSameIdempotencyKey() {
    doThrow(new ResourceAccessException("timeout")).when(mp).create(any());
    String id=UUID.randomUUID().toString();
    assertThrows(ResourceAccessException.class,()->service.create(id,PKG,"payer@example.com",null));
    assertEquals(id,service.balance().activePayment().sessionId());
    doAnswer(inv->remote(inv.getArgument(0),"pending")).when(mp).create(any());
    service.create(id,PKG,"payer@example.com",null);
    assertEquals(1,payments.count());verify(mp,times(2)).create(argThat(p->p.id.equals(id)));
  }
  @Test void expiredSessionHidesQrAndLateApprovalNeverAutostarts() {
    var p=create();when(clock.instant()).thenReturn(now.plusSeconds(240));
    assertEquals("EXPIRED",service.status(p.sessionId()).status());assertNull(service.status(p.sessionId()).qrCodeBase64());
    var remote=approved(p.sessionId());remote.put("date_approved",now.plusSeconds(220).toString());service.accept(remote);
    assertEquals(4,service.balance().credits());assertFalse(service.status(p.sessionId()).autoStartAllowed());
  }
  @Test void closedSessionCanKeepPaidBalanceWithoutAutostart() {
    var p=create();when(mp.cancel(anyString())).thenThrow(new ResourceAccessException("offline"));
    service.close(p.sessionId());service.accept(approved(p.sessionId()));
    assertEquals(4,service.balance().credits());assertNull(service.balance().activePayment());assertFalse(service.status(p.sessionId()).autoStartAllowed());
  }
  @Test void debitIsIdempotentAndUnfinishedGameIsRecoverable() {
    var p=create();service.accept(approved(p.sessionId()));
    // 4 créditos comprados; um 1p (custo 1) é jogado e encerrado antes para deixar 3, o mesmo saldo inicial do cenário original.
    var warmUp=service.startGame(UUID.randomUUID().toString(),"1p");assertEquals(3,warmUp.credits());
    service.completeGame(warmUp.gameSessionId());
    String id=UUID.randomUUID().toString();
    var game=service.startGame(id,"coop");assertEquals(1,game.credits());
    assertEquals(1,service.startGame(id,"coop").credits());
    assertEquals(game.gameSessionId(),service.startGame(UUID.randomUUID().toString(),"coop").gameSessionId());
    service.completeGame(id);assertEquals("COMPLETED",service.startGame(id,"coop").status());
    assertThrows(ResponseStatusException.class,()->service.startGame(UUID.randomUUID().toString(),"coop"));
    assertEquals(0,service.startGame(UUID.randomUUID().toString(),"1p").credits());
  }
  @Test void reconciliationRecoversApprovalAfterNetworkFailure() {
    var p=create();when(mp.get(p.paymentId())).thenThrow(new ResourceAccessException("offline"));
    service.reconcile();assertEquals(0,service.balance().credits());
    doReturn(approved(p.sessionId())).when(mp).get(p.paymentId());service.reconcile();
    assertEquals(4,service.balance().credits());service.reconcile();assertEquals(4,service.balance().credits());
  }
  @Test void clientCannotChoosePriceOrCreditQuantity() throws Exception {
    mvc.perform(post("/api/payments/pix").header("X-Machine-Key","abcdefghijklmnopqrstuvwxyz1234567890")
      .contentType("application/json").content("{\"requestId\":\""+UUID.randomUUID()+"\",\"packageId\":\""+PKG+"\",\"amount\":0.01,\"credits\":999}"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.credits").value(4)).andExpect(jsonPath("$.amount").value(10.0));
  }
  @Test void invalidPackageIdIsRejected() {
    assertThrows(ResponseStatusException.class,()->service.create(UUID.randomUUID().toString(),"unknown-package","payer@example.com",null));
  }
  @Test void catalogExposesTheThreeConfiguredPackages() throws Exception {
    mvc.perform(get("/api/payments/packages").header("X-Machine-Key","abcdefghijklmnopqrstuvwxyz1234567890"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.packages.length()").value(3))
      .andExpect(jsonPath("$.packages[0].id").value("pkg-2-5")).andExpect(jsonPath("$.packages[0].credits").value(2)).andExpect(jsonPath("$.packages[0].amount").value(5.0))
      .andExpect(jsonPath("$.packages[1].id").value("pkg-4-10")).andExpect(jsonPath("$.packages[1].credits").value(4)).andExpect(jsonPath("$.packages[1].amount").value(10.0))
      .andExpect(jsonPath("$.packages[2].id").value("pkg-6-15")).andExpect(jsonPath("$.packages[2].credits").value(6)).andExpect(jsonPath("$.packages[2].amount").value(15.0));
  }
  String signature(String id,String request,String timestamp) throws Exception {
    var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec("test-webhook-secret".getBytes(),"HmacSHA256"));
    return "ts="+timestamp+",v1="+HexFormat.of().formatHex(mac.doFinal(("id:"+id+";request-id:"+request+";ts:"+timestamp+";").getBytes()));
  }
  @Test void signedWebhookFetchesProviderAndDuplicateIsHarmless() throws Exception {
    var p=create();when(mp.get(p.paymentId())).thenReturn(approved(p.sessionId()));
    String sig=signature(p.paymentId(),"request-1",String.valueOf(now.getEpochSecond()));
    for(int i=0;i<2;i++) mvc.perform(post("/api/webhooks/mercadopago").param("data.id",p.paymentId())
      .header("x-request-id","request-1").header("x-signature",sig)).andExpect(status().isOk());
    assertEquals(4,service.balance().credits());verify(mp,times(2)).get(p.paymentId());
  }
  @Test void unsignedWebhookAndUnauthenticatedMachineAreRejected() throws Exception {
    mvc.perform(post("/api/webhooks/mercadopago").param("data.id","12345678")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/machine/balance")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/machine/balance").header("X-Machine-Key","abcdefghijklmnopqrstuvwxyz1234567890")).andExpect(status().isOk());
    verifyNoInteractions(mp);
  }
  @Test void tamperedAndStaleSignaturesFail() throws Exception {
    String ts=String.valueOf(now.getEpochSecond());String sig=signature("12345678","r",ts);
    assertTrue(signatures.valid("12345678","r",sig));assertFalse(signatures.valid("12345679","r",sig));
    assertFalse(signatures.valid("12345678","r",signature("12345678","r",String.valueOf(now.minusSeconds(601).getEpochSecond()))));
  }
}
