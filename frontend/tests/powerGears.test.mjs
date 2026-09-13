import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.endsWith(".ts") && specifier.startsWith(".") && !specifier.endsWith(".ts")) specifier += ".ts";
  return nextResolve(specifier, context);
} });
const { resolvePowerGears } = await import("../src/game/powerGears.ts");
const { emptyGrid } = await import("../src/game/grid.ts");

test("four pieces clear normally; five create one gear of each color at the placed cell", () => {
  for (const [color,gear] of [["cone","gearFireRow"],["win","gearFreezeRow"],["wL","gearBlast"],["str","gearCross"],["wR","gearHunter"]]) {
    const grid = emptyGrid();
    grid[12] = [color,color,color,color,null];
    assert.equal(resolvePowerGears(grid,"12,3").matches.size,4);
    grid[12][4] = color;
    const result = resolvePowerGears(grid,"12,2");
    assert.equal(result.grid[12][2],gear);
    assert.equal(result.matches.size,4);
    assert.ok(!result.matches.has("12,2"));
    assert.equal(grid[12][2],color);
  }
});
test("vertical sequences and six/seven piece rewards", () => {
  for (const length of [5,6,7]) {
    const grid = emptyGrid();
    for (let r=13-length;r<13;r++) grid[r][2] = "win";
    const result = resolvePowerGears(grid,`${13-length},2`);
    assert.equal(result.grid[13-length][2],"gearFreezeColumn");
    assert.deepEqual(result.matchSizes,[length]);
  }
});
test("valid joined shapes create one gear and unrelated colors do not merge", () => {
  const grid = emptyGrid();
  for (const [r,c] of [[9,0],[10,0],[11,0],[12,0],[12,1]]) grid[r][c]="str";
  const result=resolvePowerGears(grid,"12,1");
  assert.equal(result.grid[12][1],"gearCross");
  assert.equal(result.matches.size,4);
});
test("an isolated gear waits for a compatible match or explosion", () => {
  const grid=emptyGrid(); grid[12][0]="gearBlast";
  assert.equal(resolvePowerGears(grid,null).matches.size,0);
});
test("freeze waits 750ms; fire propagates sequentially", () => {
  for (const [gear,color] of [["gearFreezeRow","win"],["gearFireRow","cone"]]) {
    const grid=emptyGrid(); grid[12]=[gear,color,color,color,"wR"];
    const result=resolvePowerGears(grid,null);
    assert.equal(result.matches.size,5);
    if (color==="win") {
      assert.equal(result.effects["12,1"].delay,750);
      assert.equal(result.effects["12,4"].delay,750);
      assert.equal(result.duration,1250);
    } else {
      assert.equal(result.effects["12,1"].delay,65);
      assert.equal(result.effects["12,4"].delay,260);
      assert.equal(result.effects["12,4"].start,260);
    }
  }
});
test("blast reaches a centered 3x3 and clips at the border", () => {
  const grid=emptyGrid();
  grid[6]=["wL","gearBlast","wL","wL",null];
  for (const r of [5,7]) for (let c=0;c<3;c++) grid[r][c]="cone";
  const result=resolvePowerGears(grid,null);
  assert.equal(result.matches.size,10); // nine blast cells plus the fourth match cell
  const corner=emptyGrid(); corner[12]=["gearBlast","wL","wL","wL",null];
  corner[11][0]="win"; corner[11][1]="str";
  assert.equal(resolvePowerGears(corner,null).matches.size,6);
});
test("cross reaches four cells in each direction, stopping at edges", () => {
  const grid=emptyGrid(); grid[6]=["str","str","gearCross","str","cone"];
  for(let r=0;r<13;r++) if(r!==6) grid[r][2]=r%2 ? "win" : "cone";
  const result=resolvePowerGears(grid,null);
  for(let r=2;r<=10;r++) assert.ok(result.matches.has(`${r},2`));
  assert.ok(!result.matches.has("1,2")); assert.ok(!result.matches.has("11,2"));
});
test("blast triggers fire then hunter; hunter only targets present normal pieces", () => {
  const grid=emptyGrid();
  grid[8]=["wL","gearBlast","wL","wL",null];
  grid[7][1]="gearFireRow"; grid[7][4]="gearHunter";
  grid[1][0]="str"; grid[2][4]="str";
  grid[0][2]="gearCross";
  const result=resolvePowerGears(grid,null,()=>0);
  assert.ok(result.matches.has("7,1")); assert.ok(result.matches.has("7,4"));
  assert.ok(result.matches.has("1,0")); assert.ok(result.matches.has("2,4"));
  assert.ok(!result.matches.has("0,2"));
  assert.match(result.notice,/SAPINHO/);
});
test("hunter with no remaining normal target terminates safely", () => {
  const grid=emptyGrid(); grid[12]=["gearHunter","gearHunter","gearHunter","gearHunter",null];
  assert.equal(resolvePowerGears(grid,null).matches.size,4);
});
test("a newly created gear also activates if another power hits it", () => {
  const grid=emptyGrid();
  grid[12]=["str","str","str","str","str"];
  grid[11]=["wL","gearBlast","wL","wL",null];
  grid[8][2]="win";
  const result=resolvePowerGears(grid,"12,2");
  assert.equal(result.grid[12][2],"gearCross");
  assert.ok(result.matches.has("12,2"));
  assert.ok(result.matches.has("8,2"));
});
