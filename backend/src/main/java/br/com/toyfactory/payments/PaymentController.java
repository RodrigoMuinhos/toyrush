package br.com.toyfactory.payments;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import static br.com.toyfactory.payments.dto.PaymentDtos.*;
import java.util.Map;

@RestController @RequestMapping("/api")
public class PaymentController {
  private final PixPaymentService pix;
  private final PaymentStatusService statuses;
  public PaymentController(PixPaymentService pix, PaymentStatusService statuses) { this.pix=pix; this.statuses=statuses; }
  @GetMapping("/payments/packages") public Map<String,Object> packages() { return statuses.catalog(); }
  @GetMapping("/machine/balance") public BalanceView balance() { return statuses.balance(); }
  @PostMapping("/payments/pix") public PaymentView pix(@Valid @RequestBody CreatePix req) { return pix.createForKiosk(req.requestId().toString(),req.packageId()); }
  @GetMapping("/payments/{id}/status") public PaymentView status(@PathVariable String id) { return statuses.status(id); }
  @PostMapping("/payments/{id}/close") public PaymentView close(@PathVariable String id) { return pix.close(id); }
}
