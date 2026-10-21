// Live read-only RPC checks against the final export, served at a gateway-style subpath.
// The connected provider is a deterministic test adapter. It never signs or sends.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.IMD_PLAYWRIGHT?pathToFileURL(process.env.IMD_PLAYWRIGHT).href:'playwright');
const root=resolve('dist'),out=resolve('test/scratch/live-browser');await mkdir(out,{recursive:true});
const config=JSON.parse(await readFile(resolve(root,'imd-deployment.json'),'utf8'));
const upstreams=process.env.SWORN_RPC?[process.env.SWORN_RPC]:config.network.rpcUrls;
const server=createServer(async(req,res)=>{const path=decodeURIComponent((req.url??'').split('?')[0]);const file=resolve(root,path.replace(/^\/preview\//,''));if(!path.startsWith('/preview/')||!file.startsWith(root+sep)){res.writeHead(404);res.end();return;}try{const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[extname(file)]??'text/plain');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/preview/index.html`;
const browser=await chromium.launch({headless:true});const results=[],errors=[],requests=[];let failed=false,mode='live';
const publicRpc=url=>config.network.rpcUrls.some(r=>String(url).startsWith(r));
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'*'};
async function routeLive(context){await context.route(publicRpc,async route=>{
 if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
 const body=route.request().postDataJSON(),calls=Array.isArray(body)?body:[body];
 const unavailable=()=>calls.map(call=>({jsonrpc:'2.0',id:call.id,error:{code:-32000,message:'Deliberate unavailable-RPC test'}}));
 if(mode==='offline'){const responses=unavailable();await route.fulfill({contentType:'application/json',body:JSON.stringify(Array.isArray(body)?responses:responses[0]),headers});return;}
 for(const upstream of upstreams){try{const response=await fetch(upstream,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const text=await response.text();if(!response.ok)continue;JSON.parse(text);requests.push({endpoint:upstream,methods:calls.map(call=>call.method),status:response.status});await route.fulfill({status:response.status,contentType:'application/json',body:text,headers});return;}catch{/* Try the next configured public transport. */}}
 const responses=unavailable();await route.fulfill({contentType:'application/json',body:JSON.stringify(Array.isArray(body)?responses:responses[0]),headers});
});}
const account='0x200e710acaa6a93bbc77146026328c40f1d60fb1';
async function check(name,run){try{const details=await run();results.push({name,passed:true,details});console.log('PASS',name);}catch(error){failed=true;results.push({name,passed:false,error:error.message});console.log('FAIL',name,error.message);}}
try{
 const context=await browser.newContext({viewport:{width:1280,height:900},locale:'fr-FR'});await routeLive(context);const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.goto(`${url}#/explorer?address=${account}`);
 await check('live contributor lookup reads 25 facts, 13 families and the deployed Renderer image',async()=>{
  await page.locator('.explorer-grid').waitFor({timeout:60000});await page.waitForFunction(()=>document.querySelector('.explorer-card img')?.naturalWidth>0);
  assert.equal(await page.getByRole('region',{name:'13-family wallet summary'}).locator('tbody tr').count(),13);assert.equal(await page.getByRole('region',{name:'Every hasTrait result'}).locator('tbody tr').count(),25);
  const caption=await page.locator('.explorer-card figcaption').innerText();assert(/preview, no card minted|Sworn #[\d,]+ · minted/.test(caption));
  assert.match(await page.locator('.requests-table').innerText(),/[\d,.]+ IMD/);const desktop=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert(desktop.scroll<=desktop.width);
  await page.screenshot({path:resolve(out,'explorer-live-1280.png')});await page.setViewportSize({width:390,height:844});
  const phone=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,tables:[...document.querySelectorAll('.table-scroll:not(.scroll-only)')].map(table=>({width:table.clientWidth,scroll:table.scrollWidth}))}));assert(phone.scroll<=phone.width);assert(phone.tables.every(table=>table.scroll<=table.width+1));await page.screenshot({path:resolve(out,'explorer-live-390.png')});return {status:await page.locator('.read-status').innerText(),caption,desktop,phone};
 });
 await check('unclaimed oracle facts do not imply a false verdict',async()=>{
  const rows=await page.getByRole('region',{name:'Every hasTrait result'}).locator('tbody tr').evaluateAll(items=>items.map(row=>({id:Number.parseInt(row.querySelector('td').textContent,10),text:row.textContent})));assert(rows.length===25);const oracle=rows.filter(row=>row.id>=601);assert.equal(oracle.length,12);assert(oracle.every(row=>!/\bfalse\b/.test(row.text)));return {oracleRows:oracle.length};
 });
 await check('a live Explorer recovers after an RPC outage without reloading',async()=>{
  mode='offline';await page.goto(`${url}#/explorer?address=0x000000000000000000000000000000000000c1a1`);await page.locator('.read-status').filter({hasText:'RPC unavailable'}).waitFor();assert.equal(await page.locator('.explorer-grid').count(),0);
  mode='live';await page.getByRole('button',{name:'Retry reads',exact:true}).click();await page.locator('.explorer-grid').waitFor({timeout:60000});
  const blocked=page.locator('.requests-table tbody tr').filter({hasText:'cannot be true: not in WhitelistCurator.sol'});assert.equal(await blocked.count(),10);assert.equal(await blocked.getByRole('link',{name:/claim guide|shared fact/}).count(),0);return {blockedFacts:await blocked.count(),status:await page.locator('.read-status').innerText()};
 });
 await context.close();
 const connected=await browser.newContext({viewport:{width:390,height:844}});await routeLive(connected);
 await connected.addInitScript(({account})=>{
  const listeners={};let authorized=false;window.__swornLiveWalletCalls=[];
  const provider={request:async({method,params})=>{window.__swornLiveWalletCalls.push({method,params});if(method==='eth_chainId')return '0x1';if(method==='eth_accounts')return authorized?[account]:[];if(method==='eth_requestAccounts'){authorized=true;return [account];}if(method==='wallet_getPermissions'||method==='wallet_requestPermissions')return [{parentCapability:'eth_accounts'}];if(method==='wallet_revokePermissions'){authorized=false;return null;}throw Object.assign(Error(`No signing or sending is permitted by this read-only adapter: ${method}`),{code:4200});},on:(event,fn)=>(listeners[event]??=[]).push(fn),removeListener:(event,fn)=>{listeners[event]=(listeners[event]??[]).filter(value=>value!==fn);}};
  const announce=()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'52c56a86-6ce0-4d14-a2bf-0451b2f5b2e1',name:'Read-only validation wallet',rdns:'validation.sworn.readonly',icon:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"%3E%3Ccircle cx="14" cy="14" r="12" fill="%2300ff41"/%3E%3C/svg%3E'},provider}}));window.addEventListener('eip6963:requestProvider',announce);announce();
 },{account});
 const walletPage=await connected.newPage();walletPage.setDefaultTimeout(25000);walletPage.on('pageerror',e=>errors.push(e.message));walletPage.on('console',message=>{if(message.type()==='error')errors.push(message.text());});await walletPage.goto(`${url}#/claim?trait=601`);
 await check('connected Claim actions recover after a real-RPC outage without reconnecting or reloading',async()=>{
  await walletPage.getByRole('button',{name:'Connect',exact:true}).click();await walletPage.getByRole('button',{name:'Read-only validation wallet',exact:true}).click();await walletPage.getByRole('button',{name:/Disconnect$/}).waitFor();await walletPage.locator('#oracle-disclaimer').check();
  const prepare=walletPage.getByRole('button',{name:'Prepare paid upgrade',exact:true});await prepare.waitFor();await walletPage.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent==='Prepare paid upgrade'&&!button.disabled),null,{timeout:60000});
  mode='offline';await walletPage.getByRole('button',{name:'Refresh live prices',exact:true}).click();await walletPage.locator('.claim-page .error-text').filter({hasText:'RPC unavailable'}).first().waitFor();assert.equal(await prepare.isEnabled(),false);
  mode='live';await walletPage.getByRole('button',{name:'Refresh live prices',exact:true}).click();await walletPage.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent==='Prepare paid upgrade'&&!button.disabled),null,{timeout:60000});assert(await walletPage.getByRole('button',{name:/Disconnect$/}).isVisible());
  const calls=await walletPage.evaluate(()=>window.__swornLiveWalletCalls);assert.equal(calls.filter(call=>call.method==='eth_requestAccounts').length,1);assert.equal(calls.filter(call=>/send|sign/i.test(call.method)).length,0);return {walletCalls:calls.map(call=>call.method),livePrice:await walletPage.locator('.live-prices').innerText()};
 });
 await check('live rendered pages have no page errors and no wallet transaction was sent',async()=>{assert.deepEqual(errors,[]);return {pageErrors:errors,successfulRpcBatches:requests.length};});await connected.close();
}finally{await browser.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'results.json'),JSON.stringify({results,errors,rpc:{configured:config.network.rpcUrls,proxiedFromNode:true,successfulBatches:requests.length,methods:[...new Set(requests.flatMap(request=>request.methods))]},limitations:['Public RPC is proxied through the local validation process; browser CORS behavior on each operator is not established.','The wallet provider is a read-only test adapter; no extension, phone application, passkey creation or real transaction is exercised.']},null,2)+'\n');}
if(failed)process.exitCode=1;
