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
class PaymentStore implements org.springframework.boot.ApplicationRunner {
  final PaymentAuditService audit;
  final Machines machines;
  final Payments payments;
  final PaymentConfig config;
  final Clock clock;
  final org.springframework.transaction.support.TransactionTemplate tx;
  PaymentStore(Machines machines, Payments payments, PaymentConfig config, Clock clock,
      org.springframework.transaction.PlatformTransactionManager manager, PaymentAuditService audit) {
    this.audit=audit; this.machines=machines; this.payments=payments; this.config=config; this.clock=clock;
    this.tx=new org.springframework.transaction.support.TransactionTemplate(manager);
  }
  public void run(org.springframework.boot.ApplicationArguments args) {
    if(!machines.existsById(config.machineId())) { var m=new Models.Machine();m.id=config.machineId();machines.saveAndFlush(m); }
  }
  Models.Machine lockMachine() { return machines.locked(config.machineId()).orElseThrow(); }
  Models.Payment ownPayment(String id) {
    var p=payments.findById(id).orElseThrow(()->new ResponseStatusException(NOT_FOUND,"Cobrança não encontrada"));
    if(!p.machineId.equals(config.machineId())) throw new ResponseStatusException(NOT_FOUND);
    return p;
  }
  PaymentView view(Models.Payment p,int balance) {
    boolean visible=!p.closed && clock.instant().isBefore(p.expiresAt) && p.status.equals("WAITING_PAYMENT");
    return new PaymentView(p.id,p.paymentId,p.status,visible?p.qrCode:null,visible?p.qrCodeBase64:null,p.expiresAt,p.credits,p.amount,p.creditsReleased,p.autoStartAllowed&&!p.closed,balance);
  }
  void expire(Models.Payment p) {
    if(!p.creditsReleased && !clock.instant().isBefore(p.expiresAt) && Set.of("CREATED","WAITING_PAYMENT").contains(p.status)) {
      p.status="EXPIRED"; p.autoStartAllowed=false;payments.save(p);
      audit.record(p.machineId,p.id,p.paymentId,"EXPIRED",p.status,0,lockMachine().credits);
    }
  }
}
