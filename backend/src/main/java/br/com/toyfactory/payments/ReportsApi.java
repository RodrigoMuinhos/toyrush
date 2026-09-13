package br.com.toyfactory.payments;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

// Every number here is computed live from Payment/Game rows for the requested
// window — nothing mocked. Credits are a pooled wallet (see PaymentService),
// so there is no 1:1 payment<->session link; "sold vs consumed" is the
// correct reconciliation for that model, not a per-transaction trace.
@RestController @RequestMapping("/api/admin")
public class ReportsApi {
  private final Payments payments; private final Games games; private final Machines machines; private final PaymentConfig config;
  public ReportsApi(Payments payments, Games games, Machines machines, PaymentConfig config) {
    this.payments = payments; this.games = games; this.machines = machines; this.config = config;
  }

  public record PackageSales(int credits, BigDecimal amount, long sales, BigDecimal revenue) {}
  public record DayPoint(String date, BigDecimal revenue, long sessions) {}
  public record ReportsView(
    Instant from, Instant to,
    BigDecimal revenue, BigDecimal previousRevenue,
    Map<String,Long> paymentsByStatus, long paymentsTotal,
    long sessionsTotal, Map<String,Long> sessionsByMode,
    int creditsSold, int creditsConsumed, int creditsBalance,
    BigDecimal ticketMedio,
    List<PackageSales> packages,
    List<DayPoint> daily
  ) {}

  @GetMapping("/reports")
  public ReportsView reports(@RequestParam String from, @RequestParam String to) {
    Instant fromI, toI;
    try { fromI = Instant.parse(from); toI = Instant.parse(to); }
    catch (Exception e) { throw new ResponseStatusException(BAD_REQUEST, "Datas inválidas"); }
    if (!toI.isAfter(fromI)) throw new ResponseStatusException(BAD_REQUEST, "Intervalo inválido");

    String machineId = config.machineId();
    var pays = payments.findByMachineIdAndCreatedAtBetween(machineId, fromI, toI);
    var sessions = games.findByMachineIdAndCreatedAtBetween(machineId, fromI, toI);
    var released = pays.stream().filter(p -> p.creditsReleased).toList();

    BigDecimal revenue = sum(released);

    Duration span = Duration.between(fromI, toI);
    var previousReleased = payments.findByMachineIdAndCreatedAtBetween(machineId, fromI.minus(span), fromI)
      .stream().filter(p -> p.creditsReleased).toList();
    BigDecimal previousRevenue = sum(previousReleased);

    Map<String,Long> byStatus = pays.stream().collect(Collectors.groupingBy(p -> p.status, Collectors.counting()));
    Map<String,Long> byMode = sessions.stream().collect(Collectors.groupingBy(g -> g.mode, Collectors.counting()));

    int creditsSold = released.stream().mapToInt(p -> p.credits).sum();
    int creditsConsumed = sessions.stream().mapToInt(g -> g.cost).sum();
    int creditsBalance = machines.findById(machineId).map(m -> m.credits).orElse(0);

    BigDecimal ticketMedio = released.isEmpty() ? BigDecimal.ZERO
      : revenue.divide(BigDecimal.valueOf(released.size()), 2, RoundingMode.HALF_UP);

    var packages = released.stream()
      .collect(Collectors.groupingBy(p -> p.credits + "|" + p.amount))
      .values().stream()
      .map(list -> new PackageSales(list.get(0).credits, list.get(0).amount, list.size(),
        list.get(0).amount.multiply(BigDecimal.valueOf(list.size()))))
      .sorted(Comparator.comparing(PackageSales::revenue).reversed())
      .toList();

    ZoneId zone = ZoneId.of("America/Sao_Paulo");
    Map<LocalDate,BigDecimal> dailyRevenue = released.stream()
      .collect(Collectors.groupingBy(p -> LocalDate.ofInstant(p.createdAt, zone),
        Collectors.reducing(BigDecimal.ZERO, p -> p.amount, BigDecimal::add)));
    Map<LocalDate,Long> dailySessions = sessions.stream()
      .collect(Collectors.groupingBy(g -> LocalDate.ofInstant(g.createdAt, zone), Collectors.counting()));
    var allDates = new TreeSet<LocalDate>();
    allDates.addAll(dailyRevenue.keySet());
    allDates.addAll(dailySessions.keySet());
    var daily = allDates.stream()
      .map(d -> new DayPoint(d.toString(), dailyRevenue.getOrDefault(d, BigDecimal.ZERO), dailySessions.getOrDefault(d, 0L)))
      .toList();

    return new ReportsView(fromI, toI, revenue, previousRevenue, byStatus, pays.size(),
      sessions.size(), byMode, creditsSold, creditsConsumed, creditsBalance, ticketMedio, packages, daily);
  }

  private BigDecimal sum(List<Models.Payment> list) {
    return list.stream().map(p -> p.amount).reduce(BigDecimal.ZERO, BigDecimal::add);
  }
}
