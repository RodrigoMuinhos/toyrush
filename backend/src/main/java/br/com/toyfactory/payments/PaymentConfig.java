package br.com.toyfactory.payments;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@ConfigurationProperties("toy")
public record PaymentConfig(String machineId, String machineKey, String accessToken, String webhookSecret,
    String webhookUrl, boolean liveMode, List<Package> packages, int sessionSeconds, String pixPayerEmail, String adminPin) {
  public record Package(String id, int credits, BigDecimal amount) {}
  public boolean ready() {
    return configurationIssues().isEmpty();
  }
  public List<String> configurationIssues() {
    var issues=new java.util.ArrayList<String>();
    if(machineId==null || machineId.isBlank()) issues.add("TOY_MACHINE_ID");
    if(machineKey==null || machineKey.length()<32) issues.add("TOY_MACHINE_KEY");
    if(accessToken==null || accessToken.isBlank()) issues.add("MP_ACCESS_TOKEN");
    if(webhookSecret==null || webhookSecret.isBlank()) issues.add("MP_WEBHOOK_SECRET");
    if(webhookUrl==null || !webhookUrl.startsWith("https://")) issues.add("MP_WEBHOOK_URL");
    if(pixPayerEmail==null || !pixPayerEmail.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) issues.add("MP_PIX_PAYER_EMAIL");
    if(packages==null || packages.isEmpty() || !packages.stream().allMatch(this::validPackage)) issues.add("TOY_PACKAGE_*");
    if(sessionSeconds<120 || sessionSeconds>300) issues.add("TOY_SESSION_SECONDS");
    return List.copyOf(issues);
  }
  public boolean adminConfigured() { return adminPin != null && adminPin.length() >= 4; }
  private boolean validPackage(Package p) {
    return p.id()!=null && !p.id().isBlank() && p.credits()>0 && p.amount()!=null && p.amount().signum()>0;
  }
  public Optional<Package> find(String id) {
    return packages==null ? Optional.empty() : packages.stream().filter(p->p.id().equals(id)).findFirst();
  }
}
