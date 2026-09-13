package br.com.toyfactory.payments;

import org.springframework.stereotype.Component;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.*;

@Component
public class WebhookSignature {
  private final PaymentConfig config;private final Clock clock;
  public WebhookSignature(PaymentConfig config,Clock clock) {this.config=config;this.clock=clock;}
  public boolean valid(String dataId,String requestId,String header) {
    try {
      if(config.webhookSecret().isBlank()||dataId==null||!dataId.matches("[0-9]+")||requestId==null||requestId.isBlank()||header==null) return false;
      Map<String,String> parts=new HashMap<>();
      for(String item:header.split(",")) {var pair=item.trim().split("=",2);if(pair.length==2)parts.put(pair[0],pair[1]);}
      String ts=parts.get("ts");long timestamp=Long.parseLong(ts);if(timestamp>100000000000L) timestamp/=1000;
      if(Math.abs(clock.instant().getEpochSecond()-timestamp)>600) return false;
      String manifest="id:"+dataId.toLowerCase(Locale.ROOT)+";request-id:"+requestId+";ts:"+ts+";";
      var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(config.webhookSecret().getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
      return MessageDigest.isEqual(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)),HexFormat.of().parseHex(parts.get("v1")));
    } catch(Exception e) {return false;}
  }
}
