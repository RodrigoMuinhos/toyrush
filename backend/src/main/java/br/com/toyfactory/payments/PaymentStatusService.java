package br.com.toyfactory.payments;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;
import static br.com.toyfactory.payments.dto.PaymentDtos.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
public class PaymentStatusService {
  private final PaymentStore store;
  public PaymentStatusService(PaymentStore store) {
    this.store=store;
  }
  public Map<String,Object> catalog() {
    var packages=store.config.packages()==null?List.<PackageView>of():store.config.packages().stream().map(p->new PackageView(p.id(),p.credits(),p.amount())).toList();
    return Map.of("machineId",store.config.machineId(),"ready",store.config.ready(),"packages",packages,
      "configurationIssues",store.config.configurationIssues());
  }
  public BalanceView balance() {
    return store.tx.execute(status->{ var m=store.lockMachine();var active=store.payments.findFirstByMachineIdAndClosedFalseOrderByCreatedAtDesc(m.id);
      active.ifPresent(store::expire);return new BalanceView(m.id,m.credits,active.map(p->store.view(p,m.credits)).orElse(null)); });
  }
  public PaymentView status(String id) {
    return store.tx.execute(s->{var m=store.lockMachine();var p=store.ownPayment(id);store.expire(p);return store.view(p,m.credits);});
  }
}
