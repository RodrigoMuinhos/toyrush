import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";
registerHooks({ resolve(specifier,context,next) {
  if(context.parentURL?.endsWith(".ts") && specifier.startsWith(".") && !specifier.endsWith(".ts")) specifier+=".ts";
  return next(specifier,context);
} });
const { getBaseScore, calculateComboScore, calculatePowerGearScore, calculateResolutionScore, officialScore }=await import("../src/game/scoring.ts");
const { resolvePowerGears }=await import("../src/game/powerGears.ts");
const { emptyGrid }=await import("../src/game/grid.ts");
test("scoring starts at four; exact nonlinear table and extras",()=>{
  for(const [size,points] of [[0,0],[1,0],[2,0],[3,0],[4,500],[5,800],[6,1200],[7,1700],[8,2300],[9,3000],[10,4000],[11,4500],[13,5500]]) assert.equal(getBaseScore(size),points);
});
test("cascade multipliers are linear and powers use 100 points each",()=>{
  assert.equal(calculateComboScore(4,1),500);
  assert.equal(calculateComboScore(5,2),1600);
  assert.equal(calculateComboScore(6,3),3600);
  assert.equal(calculatePowerGearScore(8,4),3200);
});
test("five-piece creation receives 800 despite leaving a gear behind",()=>{
  const grid=emptyGrid();grid[12].fill("win");
  const resolution=resolvePowerGears(grid,"12,2");
  assert.equal(resolution.matches.size,4);
  assert.equal(calculateResolutionScore(resolution.matchSizes,resolution.powerPieces,1),800);
});
test("three adjacent pieces neither clear nor score",()=>{
  const grid=emptyGrid();grid[12]=["str","str","str",null,null];
  const r=resolvePowerGears(grid,null);
  assert.equal(r.matches.size,0);assert.equal(calculateResolutionScore(r.matchSizes,r.powerPieces,1),0);
});
test("powers do not score original match cells twice",()=>{
  const grid=emptyGrid();grid[12]=["gearBlast","wL","wL","wL",null];
  grid[11][0]="win";grid[11][1]="cone";
  const r=resolvePowerGears(grid,null);
  assert.deepEqual(r.matchSizes,[4]);assert.equal(r.powerPieces,2);
  assert.equal(calculateResolutionScore(r.matchSizes,r.powerPieces,2),1400);
});
test("official score is consistent in solo, coop and versus",()=>{
  assert.equal(officialScore("1p",12400,9900),12400);
  assert.equal(officialScore("coop",12400,9900),22300);
  assert.equal(officialScore("1v1",12400,14900),14900);
});
test("every supported match and cascade awards integer multiples of 100",()=>{
  for(let size=4;size<=65;size++) for(let cascade=1;cascade<=10;cascade++) {
    const score=calculateResolutionScore([size],7,cascade);
    assert.ok(Number.isInteger(score));assert.equal(score%100,0);
  }
});
