// Deterministic contract/wallet protocol fixtures exercise the exported production UI.
// This never broadcasts a transaction. Live chain verification is recorded separately.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {decodeFunctionData,encodeFunctionResult,toHex} from 'viem';
const {chromium}=await import(process.env.IMD_PLAYWRIGHT?pathToFileURL(process.env.IMD_PLAYWRIGHT).href:'playwright');
const root=resolve('dist'),out=resolve('test/scratch/site-validation');await mkdir(out,{recursive:true});
const deploymentBytes=await readFile(resolve(root,'imd-deployment.json'));
const exportManifestSha256=createHash('sha256').update(deploymentBytes).digest('hex');
const deployment=JSON.parse(deploymentBytes.toString());
const deps=JSON.parse(await readFile('web/dependencies.json','utf8'));
const abis=Object.fromEntries(await Promise.all(deployment.contracts.map(async contract=>[contract.name,JSON.parse(await readFile(resolve(root,contract.abiPath),'utf8'))])));
const runtime=JSON.parse(await readFile('web/tests/fixtures/runtime.json','utf8'));
const sample=await readFile(resolve(root,'assets/sample-card.svg'),'utf8');
const metadata='data:application/json;base64,'+Buffer.from(JSON.stringify({name:'Sworn deterministic test fixture',image:'data:image/svg+xml;base64,'+Buffer.from(sample).toString('base64'),oracle:[]})).toString('base64');
const registry=deployment.contracts.find(c=>c.name==='Registry').address;
const addresses={...deps,...Object.fromEntries(deployment.contracts.map(c=>[c.name,c.address]))};
const {parseAbi}=await import('viem');
const curator=parseAbi(['function firstHourOf(address) view returns (uint256 hour,bool hasJoined)','function txCountOf(address) view returns(uint256)','function contributedBy(address) view returns(uint256)','function pointsOf(address) view returns(uint256)']);
const intake=parseAbi(['function priceOf(bytes32,address) view returns(uint256)']);
const token=parseAbi(['function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function approve(address,uint256) returns(bool)']);
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{const path=decodeURIComponent((req.url??'').split('?')[0]),file=resolve(root,path.replace(/^\/preview\//,''));if(!path.startsWith('/preview/')||!file.startsWith(root+sep)){res.writeHead(404);res.end();return;}try{res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/preview/index.html`;
const browser=await chromium.launch({headless:true});const results=[];let failed=false;
async function check(name,run){try{const details=await run();results.push({name,passed:true,details});console.log('PASS',name);}catch(error){failed=true;results.push({name,passed:false,error:error.message});console.log('FAIL',name,error.message);}}
const state={joined:false,tokenId:0n,price:500000000000000000n,balance:0n,verified601:false,fail:false};
const zeroHash='0x'+'0'.repeat(64);const errors=[],unsupported=[];
function reply(call){
 if(state.fail)throw Error('Synthetic public-RPC outage');
 if(call.method==='eth_chainId')return '0x1';
 if(call.method==='eth_blockNumber')return toHex(26240000n);
 if(call.method==='eth_getCode'){const name=deployment.contracts.find(c=>c.address.toLowerCase()===call.params[0].toLowerCase())?.name;if(!name)throw Error(`Unknown code target ${call.params[0]}`);return runtime[name];}
 if(call.method==='eth_call'){
  const tx=call.params[0],target=tx.to.toLowerCase();
  const abi=target===addresses.Registry.toLowerCase()?abis.Registry:target===addresses.Renderer.toLowerCase()?abis.Renderer:target===addresses.Composer.toLowerCase()?abis.Composer:target===addresses.WhitelistCurator.toLowerCase()?curator:target===addresses.IntakeV2.toLowerCase()?intake:target===addresses.IMD.toLowerCase()?token:undefined;
  if(!abi)throw Error(`Unknown call target ${target}`);
  const decoded=decodeFunctionData({abi,data:tx.data});let result;
  const getters={curator:addresses.WhitelistCurator,imd:addresses.IMD,intake:addresses.IntakeV2,attester:addresses.attester,renderer:addresses.Renderer,composer:addresses.Composer,burnExecutor:addresses.BurnExecutorV2};
  if(decoded.functionName in getters)result=getters[decoded.functionName];
  else if(decoded.functionName==='hasTrait')result=state.verified601&&Number(decoded.args[1])===601;
  else if(decoded.functionName==='verified')result=['0x'+'1'.repeat(64),'0x'+'2'.repeat(64),25090085n,26239000n];
  else if(decoded.functionName==='verifiedSpecsOf')result=[];
  else if(decoded.functionName==='tokenOf')result=state.tokenId;
  else if(decoded.functionName==='totalSupply')result=state.tokenId;
  else if(decoded.functionName==='firstHourOf')result=[0n,state.joined];
  else if(['txCountOf','contributedBy','pointsOf'].includes(decoded.functionName))result=0n;
  else if(decoded.functionName==='priceOf')result=state.price;
  else if(['tokenURI','tokenURIOf'].includes(decoded.functionName))result=metadata;
  else if(['pendingOf','sharedPending'].includes(decoded.functionName))result=zeroHash;
  else if(decoded.functionName==='sharedFact')result=[zeroHash,zeroHash,0];
  else if(decoded.functionName==='nextSpecId')result=10001;
  else if(decoded.functionName==='validateSpec')result=undefined;
  else if(decoded.functionName==='balanceOf')result=state.balance;
  else if(decoded.functionName==='allowance')result=0n;
  else throw Error(`Unhandled ${decoded.functionName}`);
  return encodeFunctionResult({abi,functionName:decoded.functionName,result});
 }
 throw Error(`Unhandled ${call.method}`);
}
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route(url=>deployment.network.rpcUrls.some(rpc=>url.href.startsWith(rpc)),async route=>{
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'*'};
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  const body=route.request().postDataJSON(),calls=Array.isArray(body)?body:[body];
  const replies=calls.map(call=>{try{return {jsonrpc:'2.0',id:call.id,result:reply(call)};}catch(error){if(!state.fail)unsupported.push(error.message);return {jsonrpc:'2.0',id:call.id,error:{code:-32000,message:error.message}};}});
  await route.fulfill({contentType:'application/json',body:JSON.stringify(Array.isArray(body)?replies:replies[0]),headers});
 });
 await context.addInitScript(()=>{
  const account='0x000000000000000000000000000000000000c1a1',listeners=new Map();window.__siteWalletCalls=[];
  const provider={on(event,fn){listeners.set(event,[...(listeners.get(event)??[]),fn]);},removeListener(event,fn){listeners.set(event,(listeners.get(event)??[]).filter(v=>v!==fn));},async request({method,params}){window.__siteWalletCalls.push({method,params});if(method==='eth_chainId')return '0x1';if(method==='eth_accounts')return sessionStorage.getItem('site-test.connected')?[account]:[];if(method==='eth_requestAccounts'){sessionStorage.setItem('site-test.connected','true');return [account];}if(method==='wallet_requestPermissions'||method==='wallet_getPermissions')return [{parentCapability:'eth_accounts'}];throw Error(`Unexpected signing method: ${method}`);}};
  const announce=()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'9dfdf0e7-5577-4c81-b7ae-a991ac064e1c',name:'Read-only test wallet',rdns:'test.sworn',icon:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"%3E%3Ccircle cx="14" cy="14" r="12"/%3E%3C/svg%3E'},provider}}));window.addEventListener('eip6963:requestProvider',announce);announce();
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${url}#/claim`);await page.getByRole('button',{name:'Connect',exact:true}).click();await page.getByRole('button',{name:'Read-only test wallet',exact:true}).click();
 await page.getByText('preview, no card minted',{exact:true}).waitFor();
 await check('F28: non-Curator facts are refused and only eligible oracle facts remain requestable',async()=>{
  await page.getByRole('checkbox',{name:'I understand:',exact:false}).check();
  const upgrade=page.getByRole('button',{name:'Prepare paid upgrade',exact:true});assert(!await upgrade.isEnabled());
  assert(await page.locator('#claim-trait-701').getByText('cannot be true: not in WhitelistCurator.sol',{exact:true}).isVisible());
  assert(!await page.getByRole('button',{name:'Prepare shared request',exact:true}).isEnabled());
  await page.getByRole('checkbox',{name:'701 / Uptime',exact:true}).uncheck();await page.getByRole('checkbox',{name:'601 / Swarmed',exact:true}).check();
  await upgrade.waitFor();await page.waitForFunction(()=>!document.querySelector('#step-02 > .step-body > button').disabled);assert(await upgrade.isEnabled());
  return {nonCurator:701,requestable:601};
 });
 await check('F30: one oracle acknowledgement remains adjacent to its first button and its reason focuses it',async()=>{
  const checkbox=page.locator('#oracle-disclaimer');await checkbox.uncheck();assert.equal(await page.locator('#oracle-disclaimer').count(),1);
  await page.locator('#step-02 > .step-body > .guard-reason').getByRole('link',{name:'accept the oracle disclaimer first',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'oracle-disclaimer');
  const a=await checkbox.boundingBox(),b=await page.getByRole('button',{name:'Prepare paid upgrade',exact:true}).boundingBox();assert(a&&b&&b.y+b.height-a.y<844);await checkbox.check();
  return {verticalSpan:b.y+b.height-a.y};
 });
 await check('F35/F29: preparing a fact names its subject, exact price and originating step; preflight failures stay local',async()=>{
  await page.getByRole('button',{name:'Prepare paid upgrade',exact:true}).click();await page.locator('#transaction-flow').waitFor();
  assert.match(await page.locator('#transaction-flow h2').innerText(),/601 \/ Swarmed/i);assert.match(await page.locator('.review-facts').innerText(),/601 \/ Swarmed · 0.50 IMD/);
  assert.equal(await page.locator('#transaction-flow a[href="#/claim#step-02"]').innerText(),'from step 02');
  await page.getByRole('button',{name:'Approve exact IMD',exact:true}).click();await page.locator('.transaction-steps .error-text').filter({hasText:'Insufficient IMD'}).waitFor();
  assert.match(await page.locator('.transaction-steps li').first().innerText(),/failed/);
  assert(!(await page.evaluate(()=>window.__siteWalletCalls)).some(call=>call.method==='eth_sendTransaction'));
  await page.screenshot({path:resolve(out,'local-transaction-error-390.png')});
  await page.getByRole('button',{name:'Clear finished flow',exact:true}).click();await page.getByRole('checkbox',{name:'1301 / Pretrained',exact:true}).check();await page.waitForFunction(()=>!document.querySelector('#step-02 > .step-body > button').disabled);await page.getByRole('button',{name:'Prepare paid upgrade',exact:true}).click();await page.locator('#transaction-flow').waitFor();assert.equal(await page.locator('.review-facts li').count(),2);assert.match(await page.locator('#transaction-flow h2').innerText(),/Request 2 oracle facts/i);
 });
 await check('F29/F27: invalid spec reports by its button and registration reads the current oracle price on click',async()=>{
  await page.getByRole('button',{name:'Clear finished flow',exact:true}).click();
  await page.getByLabel('Claimant indexed argument',{exact:true}).fill('amount');
  await page.getByRole('button',{name:'Prepare spec registration',exact:true}).click();
  await page.locator('#step-03 .action-status.error-text').filter({hasText:'indexed address field'}).waitFor();
  const button=await page.getByRole('button',{name:'Prepare spec registration',exact:true}).boundingBox(),status=await page.locator('#step-03 .action-status').boundingBox();assert(button&&status&&status.y-button.y<120);
  await page.getByLabel('Claimant indexed argument',{exact:true}).fill('contributor');await page.getByLabel('Trait name (1 to 32 ASCII characters)',{exact:true}).fill('Historical participation');state.price=900000000000000000n;
  await page.getByRole('button',{name:'Prepare spec registration',exact:true}).click();await page.locator('#transaction-flow').waitFor();assert.match(await page.locator('#transaction-flow').innerText(),/Separate first claim at preparation: 0.90 IMD/);
 });
 await check('F31: a connected minted wallet shows its own card and disables mint',async()=>{
  state.tokenId=1n;await page.reload();await page.getByText('Sworn #1 · minted',{exact:true}).waitFor();assert(!await page.getByRole('button',{name:'Prepare card mint',exact:true}).isEnabled());assert(await page.getByText('already minted',{exact:true}).isVisible());await page.screenshot({path:resolve(out,'minted-wallet-390.png')});
 });
 await check('F23/F28: unminted Explorer keeps its card preview and omits impossible request links',async()=>{
  state.tokenId=0n;await page.goto(`${url}#/explorer?address=0x000000000000000000000000000000000000c1a1`);await page.locator('.explorer-card figcaption').filter({hasText:'preview, no card minted'}).waitFor();
  for(const id of [701,801,901,1001,1101,1102,1103,1104,1105,1201])assert.equal(await page.locator(`.requests-table a[href="#/claim?trait=${id}"]`).count(),0);
  for(const id of [601,1301])assert.equal(await page.locator(`.requests-table a[href="#/claim?trait=${id}"]`).count(),1);
  assert.equal(await page.locator('img[alt="Onchain Sworn card showing this wallet’s true traits"]').count(),1);await page.screenshot({path:resolve(out,'non-curator-explorer-390.png')});
 });
 await check('F32: every rendered data table fits 390px without sideways scrolling',async()=>{
  const tables=await page.locator('.responsive-table').evaluateAll(nodes=>nodes.map(node=>({label:node.getAttribute('aria-label'),width:node.clientWidth,scroll:node.scrollWidth})));assert(tables.length>=3);assert(tables.every(table=>table.scroll<=table.width+1));for(const cls of ['summary-table','facts-table','requests-table'])await page.locator(`.${cls}`).screenshot({path:resolve(out,`${cls}-390.png`)});return tables;
 });
 await check('F33: direct-load claim traits and shared block are visible and highlighted',async()=>{
  for(const id of [601,1201]){await page.goto(`${url}#/claim?trait=${id}`);const target=page.locator(id===1201?'#shared-fact':`#claim-trait-${id}`);await target.waitFor();await page.waitForFunction(selector=>{const node=document.querySelector(selector),rect=node?.getBoundingClientRect();return node?.classList.contains('selected-trait')&&rect.top<innerHeight&&rect.bottom>0;},id===1201?'#shared-fact':`#claim-trait-${id}`);assert.equal(await page.title(),'Claim | Sworn');}
 });
 await check('F26: outage and recovery restore transaction guards without a reload',async()=>{
  await page.goto(`${url}#/claim?trait=601`);await page.locator('#oracle-disclaimer').check();await page.getByRole('button',{name:'Refresh live prices',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#step-02 > .step-body > button').disabled);
  state.fail=true;await page.getByRole('button',{name:'Refresh live prices',exact:true}).click();await page.locator('#step-02 > .step-body > .guard-reason').filter({hasText:'could not read, retry'}).waitFor();assert(!await page.getByRole('button',{name:'Prepare paid upgrade',exact:true}).isEnabled());
  state.fail=false;await page.getByRole('button',{name:'Refresh live prices',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#step-02 > .step-body > button').disabled);assert(await page.getByRole('button',{name:'Prepare paid upgrade',exact:true}).isEnabled());
 });

 await check('F25: Explorer displays the accepted Swarmed window without recomputing it',async()=>{
  state.verified601=true;await page.goto(`${url}#/explorer?address=0x000000000000000000000000000000000000c1a1`);await page.locator('.verified-table').waitFor();const text=await page.locator('.verified-table').innerText();assert.match(text,/601 \/ Swarmed/);assert.match(text,/25,090,085/);assert.match(text,/26,239,000/);state.verified601=false;
 });
 await check('F28/F31: desktop non-Curator guards and minted-wallet preview match the phone',async()=>{
  await page.setViewportSize({width:1280,height:900});await page.goto(`${url}#/claim?trait=701`);await page.locator('#oracle-disclaimer').check();await page.getByRole('button',{name:'Refresh live prices',exact:true}).click();await page.locator('#step-02 > .step-body > .guard-reason').filter({hasText:'cannot be true'}).waitFor();assert(!await page.getByRole('button',{name:'Prepare paid upgrade',exact:true}).isEnabled());state.tokenId=1n;await page.getByRole('button',{name:'Refresh live prices',exact:true}).click();await page.getByText('Sworn #1 · minted',{exact:true}).waitFor();assert(!await page.getByRole('button',{name:'Prepare card mint',exact:true}).isEnabled());await page.screenshot({path:resolve(out,'minted-wallet-1280.png')});state.tokenId=0n;
 });
 await check('F47: both integration examples copy their complete text',async()=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);await page.goto(`${url}#/integrate`);for(const label of ['Solidity integration example','cast integration commands']){await page.getByRole('button',{name:`Copy ${label}`,exact:true}).click();const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(copied,await page.getByRole('region',{name:label,exact:true}).textContent());}
 });

 await check('F32/F36: catalog, comparison and claim table bodies fit the phone',async()=>{
  await page.setViewportSize({width:390,height:844});const measured=[];
  for(const route of ['catalog','fact-vs-artifact','claim']){
   await page.goto(`${url}#/${route}`);await page.locator('h1').waitFor();const tables=page.locator('.responsive-table');
   for(let i=0;i<await tables.count();i++){const table=tables.nth(i);const size=await table.evaluate(node=>({label:node.getAttribute('aria-label'),width:node.clientWidth,scroll:node.scrollWidth}));assert(size.scroll<=size.width+1,`${route}: ${size.label} scrolls`);measured.push({route,...size});await table.screenshot({path:resolve(out,`${route}-table-${i}-390.png`)});}
  }
  return measured;
 });
 await check('protocol fixtures, page errors and transaction isolation',async()=>{assert.deepEqual(unsupported,[]);assert.deepEqual(errors,[]);const calls=await page.evaluate(()=>window.__siteWalletCalls);assert(!calls.some(call=>call.method==='eth_sendTransaction'));return {pageErrors:errors,unsupportedRpc:unsupported,transactionBroadcasts:0};});
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'results.json'),JSON.stringify({exportManifestSha256,results},null,2)+'\n');}
if(failed)process.exitCode=1;
