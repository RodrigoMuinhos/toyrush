import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";
registerHooks({ resolve(specifier,context,next) {
  if(context.parentURL?.endsWith(".ts") && specifier.startsWith(".") && !specifier.endsWith(".ts")) specifier+=".ts";
  return next(specifier,context);
} });
const { initPS }=await import("../src/game/grid.ts");
const { resolvePowerGears }=await import("../src/game/powerGears.ts");
const { ATTACKS, startAttack, tickAttack, attackGravity, boardPaused, protectedCell, reversed, lockedAttackColumn }=await import("../src/game/versusAttacks.ts");
function ready(kind,size=5) {
  const state=initPS();
  for(let r=10;r<13;r++) for(let c=0;c<5;c++) state.grid[r][c]=["cone","win","str","wL","wR"][(r+c)%5];
  state.versusAttack=startAttack({kind,size,from:1,id:"test"},0);
  return state;
}
function activate(state) { const warning=tickAttack(state,700,()=>0.5); return tickAttack(warning,warning.versusAttack.until,()=>0.5); }
test("only matched groups of 5+ issue attacks, not four pieces or blast area",()=>{
  const s=initPS(); s.grid[12]=["str","str","str","str",null];
  assert.deepEqual(resolvePowerGears(s.grid,"12,3").comboSizes,[]);
  s.grid[12][4]="str"; assert.deepEqual(resolvePowerGears(s.grid,"12,4").comboSizes,[5]);
  s.grid[12]=["gearBlast","wL","wL","wL",null];
  s.grid[11][0]="win"; s.grid[11][1]="cone";
  assert.equal(resolvePowerGears(s.grid,null).matches.size,6);
  assert.deepEqual(resolvePowerGears(s.grid,null).comboSizes,[]);
});
test("all seven attacks pass through flight, warning, effect and recovery",()=>{
  for(const kind of Object.keys(ATTACKS)) {
    const s=ready(kind); assert.equal(s.versusAttack.stage,"flight");
    const w=tickAttack(s,700,()=>0.5); assert.equal(w.versusAttack.stage,"warning");
    const e=tickAttack(w,w.versusAttack.until,()=>0.5); assert.equal(e.versusAttack.stage,"effect");
    const r=tickAttack(e,e.versusAttack.until); assert.equal(r.versusAttack.stage,"recovery");
    assert.equal(tickAttack(r,r.versusAttack.until).versusAttack,null);
  }
});
test("freeze escalates from one piece to two and then a local region; expires",()=>{
  for(const size of [5,6,7]) {
    const e=activate(ready("freezeBlock",size));
    assert.equal(e.versusAttack.cells.length,size===5?1:size===6?2:9);
    assert.equal(e.versusAttack.remaining,3000);
    const [r,c]=e.versusAttack.cells[0].split(",").map(Number);
    assert.ok(protectedCell(e,r,c,1300));
    assert.equal(Object.keys(tickAttack(e,e.versusAttack.until).frozen).length,0);
  }
});
test("gravity cannot move frozen pieces or pieces in a locked column",()=>{
  const s=initPS(); s.grid[4][0]="str";s.grid[1][0]="win";s.grid[6][0]="cone";
  s.frozen["4,0"]=5000;
  const g=attackGravity(s.grid,s,1000);
  assert.equal(g[4][0],"str");assert.equal(g[3][0],"win");assert.equal(g[12][0],"cone");
  s.versusAttack={...startAttack({kind:"lockedColumn",size:5,from:1,id:"lock"},0),stage:"effect",column:0};
  assert.deepEqual(attackGravity(s.grid,s,1000).map(row=>row[0]),s.grid.map(row=>row[0]));
});
test("rising row enters at bottom and preserves natural rise accounting",()=>{
  const s=ready("risingRow"); const e=activate(s);
  assert.deepEqual(e.grid[9],s.grid[10]); assert.ok(e.grid[12].every(Boolean));
  assert.equal(e.rises-e.attackRises,s.rises-s.attackRises);
  assert.equal(e.grid.length,13);
});
test("shuffle animates before applying and preserves all pieces and empty slots",()=>{
  const s=ready("shuffle"); const w=tickAttack(s,700,()=>0.1);
  assert.ok(boardPaused(w));assert.deepEqual(w.grid,s.grid);assert.ok(Object.keys(w.versusAttack.moves).length);
  const e=tickAttack(w,1600);
  assert.deepEqual(e.grid.flat().filter(Boolean).sort(),s.grid.flat().filter(Boolean).sort());
  assert.notDeepEqual(e.grid,s.grid);
  assert.deepEqual(e.grid.map(row=>row.map(Boolean)),s.grid.map(row=>row.map(Boolean)));
});
test("board freeze blocks, reverse expires, lock avoids falling piece, fog permits play",()=>{
  assert.ok(boardPaused(activate(ready("boardFreeze"))));
  const r=activate(ready("reverse"));assert.ok(reversed(r));assert.ok(!reversed(tickAttack(r,r.versusAttack.until)));
  const l=activate(ready("lockedColumn"));assert.notEqual(lockedAttackColumn(l),l.cursor);
  assert.ok(!boardPaused(activate(ready("fog"))));
});
test("attack waits for pending combo without overwriting it",()=>{
  const s=ready("shuffle");s.phase="exploding";
  const waiting=tickAttack(s,700);
  assert.equal(waiting.phase,"exploding");assert.equal(waiting.versusAttack.stage,"flight");assert.deepEqual(waiting.grid,s.grid);
});
