// Isolated browser test: every API request is mocked; no real payment or credit is created.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1720 } });
let session = null, credits = 0, creates = 0, games = 0;
const errors=[];page.on('pageerror', e=>errors.push(e.message));
await page.route('**/api/**', async route => {
  const path=new URL(route.request().url()).pathname;
  let result={};
  if(path==='/api/payments/packages')result={ready:true,packages:[{id:'pkg-2-5',credits:2,amount:5},{id:'pkg-4-10',credits:4,amount:10},{id:'pkg-6-15',credits:6,amount:15}]};
  else if(path==='/api/machine/balance')result={machineId:'TF-001',credits,activePayment:session};
  else if(path==='/api/payments/pix') {
    const body=route.request().postDataJSON();assert.deepEqual(Object.keys(body).sort(),['packageId','requestId']);creates++;
    session={sessionId:body.requestId,paymentId:'test-only',status:'WAITING_PAYMENT',qrCode:'test-only',qrCodeBase64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=',expiresAt:new Date(Date.now()+180000).toISOString(),credits:2,amount:5,creditsReleased:false,autoStartAllowed:true,balance:credits};result=session;
  } else if(path.endsWith('/status')) result=session;
  else if(path.endsWith('/close')) {result=session;session=null;}
  else if(path==='/api/game-sessions'){games++; result={};}
  await route.fulfill({json:result});
});
await page.addInitScript(() => {
  window.testButtons=Array.from({length:16},()=>({pressed:false,touched:false,value:0}));
  Object.defineProperty(navigator,'getGamepads',{value:()=>[{connected:true,id:'test arcade',index:0,mapping:'standard',axes:[0,0],buttons:window.testButtons}]});
});
await page.goto('http://127.0.0.1:8443');
await page.getByRole('button',{name:/COMPRAR CRÉDITOS/}).click();
await page.getByRole('option',{name:/2 CRÉDITOS/}).waitFor();
assert.equal(await page.locator('[role="dialog"] input').count(),0);
await page.waitForTimeout(400);
async function pressButton(index) {
  await page.evaluate(i => { window.testButtons[i] = {pressed:true,touched:true,value:1}; }, index);
  await page.waitForTimeout(120);
  await page.evaluate(i => { window.testButtons[i] = {pressed:false,touched:false,value:0}; }, index);
  await page.waitForTimeout(150);
}
await pressButton(15);
assert.equal(await page.getByRole('option',{name:/4 CRÉDITOS/}).getAttribute('aria-selected'), 'true');
await pressButton(14);
assert.equal(await page.getByRole('option',{name:/2 CRÉDITOS/}).getAttribute('aria-selected'), 'true');
await page.evaluate(()=>{window.testButtons[1]={pressed:true,touched:true,value:1};});
await page.waitForTimeout(180);
await page.evaluate(()=>{window.testButtons[1]={pressed:false,touched:false,value:0};});
await page.getByAltText('QR Code Pix para pagar este pacote').waitFor();
assert.equal(creates,1);assert.equal(games,0);
const qr=await page.getByAltText('QR Code Pix para pagar este pacote').boundingBox();assert.ok(qr.width>=240);
await page.reload();
await page.getByAltText('QR Code Pix para pagar este pacote').waitFor();
assert.equal(creates,1);
credits=2;session={...session,status:'CREDITS_RELEASED',creditsReleased:true,balance:2};
await page.getByText('Pagamento aprovado!',{exact:true}).waitFor();
await page.getByRole('dialog').waitFor({state:'hidden',timeout:7000});
assert.equal(games,0);assert.equal(creates,1);assert.equal(errors.length,0,errors.join('\n'));
await page.getByRole('button',{name:/COMPRAR CRÉDITOS/}).click();
await page.getByRole('option',{name:/2 CRÉDITOS/}).click();
session={...session,expiresAt:new Date(Date.now()-1000).toISOString(),status:'EXPIRED'};
await page.getByText('Pix expirado',{exact:true}).waitFor({timeout:6000});
assert.equal(await page.getByAltText('QR Code Pix para pagar este pacote').count(),0);
await pressButton(0);
await page.getByRole('dialog').waitFor({state:'hidden'});
console.log('Pix UI: package selection, no form, large QR, server approval, automatic return without debit, expiry and cancellation passed.');
await browser.close();







