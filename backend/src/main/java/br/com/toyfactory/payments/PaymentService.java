package br.com.toyfactory.payments;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;
import static br.com.toyfactory.payments.dto.PaymentDtos.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Thin internal facade; business rules live in the focused services. */
@Service
public class PaymentService {
  private final PixPaymentService pix;
  private final PaymentStatusService statuses;
  private final PaymentApprovalService approvals;
  private final GameSessionService games;
  private final PaymentReconciliation reconciliation;
  public PaymentService(PixPaymentService pix, PaymentStatusService statuses, PaymentApprovalService approvals,
      GameSessionService games, PaymentReconciliation reconciliation) {
    this.pix=pix; this.statuses=statuses; this.approvals=approvals; this.games=games; this.reconciliation=reconciliation;
  }
  public Map<String,Object> catalog() { return statuses.catalog(); }
  public BalanceView balance() { return statuses.balance(); }
  public PaymentView status(String id) { return statuses.status(id); }
  public PaymentView create(String id,String pack,String email,String cpf) { return pix.create(id,pack,email,cpf); }
  public PaymentView createForKiosk(String id,String pack) { return pix.createForKiosk(id,pack); }
  public PaymentView close(String id) { return pix.close(id); }
  public void accept(JsonNode remote) { approvals.accept(remote); }
  public void webhook(String id) { approvals.webhook(id); }
  public GameView startGame(String id,String mode) { return games.startGame(id,mode); }
  public void completeGame(String id) { games.completeGame(id); }
  public void reconcile() { reconciliation.reconcile(); }
}
