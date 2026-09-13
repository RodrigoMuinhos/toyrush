package br.com.toyfactory.payments;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@ConfigurationProperties("toy")
public record PaymentConfig(String machineId, String machineKey, String accessToken, String webhookSecret,
    String webhookUrl, boolean liveMode, List<Package> packages, int sessionSeconds, String pixPayerEmail) {
  public record Package(String id, int credits, BigDecimal amount) {}
  public boolean ready() {
    return machineKey != null && machineKey.length() >= 32 && accessToken != null && !accessToken.isBlank()
      && webhookSecret != null && !webhookSecret.isBlank() && webhookUrl != null && webhookUrl.startsWith("https://")
      && pixPayerEmail != null && pixPayerEmail.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
      && packages != null && !packages.isEmpty() && packages.stream().allMatch(this::validPackage)
      && sessionSeconds >= 120 && sessionSeconds <= 300;
  }
  private boolean validPackage(Package p) {
    return p.id()!=null && !p.id().isBlank() && p.credits()>0 && p.amount()!=null && p.amount().signum()>0;
  }
  public Optional<Package> find(String id) {
    return packages==null ? Optional.empty() : packages.stream().filter(p->p.id().equals(id)).findFirst();
  }
}
