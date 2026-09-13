package br.com.toyfactory.payments;

import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;

interface Machines extends JpaRepository<Models.Machine,String> {
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select m from Machine m where m.id = :id")
  Optional<Models.Machine> locked(String id);
}
interface Payments extends JpaRepository<Models.Payment,String> {
  @Query("select p from Payment p where p.creditsReleased = false and (p.providerStatus is null or p.providerStatus in ('pending','in_process','authorized')) order by p.lastReconciledAt asc")
  List<Models.Payment> pending(org.springframework.data.domain.Pageable page);
  Optional<Models.Payment> findByPaymentId(String id);
  Optional<Models.Payment> findByExternalReference(String reference);
  Optional<Models.Payment> findFirstByMachineIdAndClosedFalseOrderByCreatedAtDesc(String machineId);
  List<Models.Payment> findByMachineIdAndCreatedAtBetween(String machineId, java.time.Instant from, java.time.Instant to);
}
interface Games extends JpaRepository<Models.Game,String> {
  Optional<Models.Game> findFirstByMachineIdAndStatusOrderByCreatedAtDesc(String machineId,String status);
  List<Models.Game> findByMachineIdAndCreatedAtBetween(String machineId, java.time.Instant from, java.time.Instant to);
}
