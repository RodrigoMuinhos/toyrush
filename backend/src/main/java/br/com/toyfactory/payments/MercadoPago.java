package br.com.toyfactory.payments;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
public class MercadoPago {
  private final RestClient client;
  private final PaymentConfig config;
  public MercadoPago(PaymentConfig config) {
    this.config=config;
    var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
    factory.setReadTimeout(Duration.ofSeconds(15));
    client=RestClient.builder().baseUrl("https://api.mercadopago.com").requestFactory(factory)
      .defaultHeader("Authorization","Bearer "+config.accessToken()).build();
  }
  public JsonNode create(Models.Payment payment) {
    Map<String,Object> payer=new HashMap<>(); payer.put("email",payment.payerEmail);
    if(payment.payerCpf!=null && !payment.payerCpf.isBlank()) payer.put("identification",Map.of("type","CPF","number",payment.payerCpf));
    Map<String,Object> body=new HashMap<>();
    body.put("transaction_amount",payment.amount); body.put("description","Toy Factory · "+payment.credits+" créditos");
    body.put("payment_method_id","pix"); body.put("payer",payer);
    body.put("external_reference",payment.externalReference);
    body.put("notification_url",config.webhookUrl());
    body.put("date_of_expiration",DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXX").withZone(ZoneOffset.UTC).format(payment.providerExpiresAt));
    body.put("metadata",Map.of("machine_id",payment.machineId,"session_id",payment.id));
    return client.post().uri("/v1/payments").header("X-Idempotency-Key",payment.id).body(body).retrieve().body(JsonNode.class);
  }
  public JsonNode search(String reference) { return client.get().uri(b->b.path("/v1/payments/search").queryParam("external_reference",reference).build()).retrieve().body(JsonNode.class); }
  // Lightweight reachability check for the health panel — never throws.
  public boolean ping() {
    try { client.get().uri("/users/me").retrieve().toBodilessEntity(); return true; }
    catch (Exception e) { return false; }
  }
  public JsonNode get(String id) { return client.get().uri("/v1/payments/{id}",id).retrieve().body(JsonNode.class); }
  public JsonNode cancel(String id) { return client.put().uri("/v1/payments/{id}",id).body(Map.of("status","cancelled")).retrieve().body(JsonNode.class); }
}
