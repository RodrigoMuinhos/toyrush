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
public class GameSessionService {
  private final PaymentStore store;
  private final Games games;
  public GameSessionService(PaymentStore store, Games games) {
    this.store=store;
    this.games=games;
  }
  public GameView startGame(String requestId,String mode) {
    UUID.fromString(requestId);
    int cost=switch(mode) {case "1p" -> 1;case "coop","1v1" -> 2;default -> throw new ResponseStatusException(BAD_REQUEST);};
    return store.tx.execute(s->{var m=store.lockMachine();var old=games.findById(requestId);
      if(old.isPresent()) {
        var g=old.get();if(!g.machineId.equals(m.id)||!g.mode.equals(mode)) throw new ResponseStatusException(CONFLICT);
        return new GameView(g.id,g.status,m.credits);
      }
      var active=games.findFirstByMachineIdAndStatusOrderByCreatedAtDesc(m.id,"GAME_STARTED");
      if(active.isPresent()) {
        var g=active.get();
        if(!g.mode.equals(mode)) throw new ResponseStatusException(CONFLICT,"Existe uma partida não concluída no modo "+g.mode+". Selecione esse modo para retomá-la.");
        return new GameView(g.id,g.status,m.credits);
      }
      if(m.credits<cost) throw new ResponseStatusException(PAYMENT_REQUIRED,"Créditos insuficientes");
      m.credits-=cost;store.machines.save(m);
      var game=new Models.Game();game.id=requestId;game.machineId=m.id;game.mode=mode;game.cost=cost;game.status="GAME_STARTED";game.createdAt=store.clock.instant();games.save(game);
      store.audit.record(m.id,game.id,null,"GAME_STARTED",game.status,-cost,m.credits);
      return new GameView(game.id,game.status,m.credits);
    });
  }
  public void completeGame(String id) {
    store.tx.executeWithoutResult(s->{store.lockMachine();var g=games.findById(id).orElseThrow(()->new ResponseStatusException(NOT_FOUND));
      if(!g.machineId.equals(store.config.machineId())) throw new ResponseStatusException(NOT_FOUND);if(!g.status.equals("COMPLETED")) { g.status="COMPLETED";games.save(g);store.audit.record(g.machineId,g.id,null,"GAME_COMPLETED",g.status,0,store.lockMachine().credits); }});
  }
}
