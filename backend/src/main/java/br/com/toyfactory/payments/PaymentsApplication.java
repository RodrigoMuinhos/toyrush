package br.com.toyfactory.payments;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import java.time.Clock;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties(PaymentConfig.class)
@EnableScheduling
public class PaymentsApplication {
  public static void main(String[] args) { SpringApplication.run(PaymentsApplication.class,args); }
  @Bean Clock clock() { return Clock.systemUTC(); }
}
