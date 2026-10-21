// Deterministic browser interaction checks. No funded account, signing or relay is used.
// Run from repository root after npm run build in web/.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.IMD_PLAYWRIGHT?pathToFileURL(process.env.IMD_PLAYWRIGHT).href:'playwright');
const root=resolve('dist'),out=resolve('test/scratch/wallet-validation');
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 const path=decodeURIComponent((req.url??'').split('?')[0]);
 const file=resolve(root,path.replace(/^\/preview\//,''));
 if(!path.startsWith('/preview/')||!file.startsWith(root+sep)){res.writeHead(404);res.end();return;}
 try{res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/preview/index.html`;
const browser=await chromium.launch({headless:true});
const results=[];let failed=false;
async function check(name,run){try{const details=await run();results.push({name,passed:true,details});console.log('PASS',name);}catch(e){failed=true;results.push({name,passed:false,error:e.message});console.log('FAIL',name,e.message);}}
async function offline(context){
 await context.route(/^https:\/\/(ethereum-rpc\.publicnode\.com|eth\.drpc\.org)/,async route=>{
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'*'};
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  const body=route.request().postDataJSON(),calls=Array.isArray(body)?body:[body];
  const replies=calls.map(call=>({jsonrpc:'2.0',id:call.id,error:{code:-32000,message:'Offline deterministic wallet validation'}}));
  await route.fulfill({contentType:'application/json',body:JSON.stringify(Array.isArray(body)?replies:replies[0]),headers});
 });
}
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});await offline(context);
 await context.addInitScript(()=>{
  const mocks={};window.__swornWalletMocks=mocks;
  for(const [id,name,uuid,initialChain] of [
   ['io.metamask','Test MetaMask','d7cf0800-5009-4f27-868d-d3589166565a','0x89'],
   ['io.rabby','Test Rabby','0d87eec2-3000-4d89-9747-2a6e08fc22e0','0x1'],
  ]){
   const listeners=new Map();
   const entry={calls:[],chain:sessionStorage.getItem(`mock.${id}.chain`)??initialChain,reject:false,rejectSwitch:false,unknownChain:true};
   const account='0x200e710acaa6a93bbc77146026328c40f1d60fb1';
   const emit=(event,value)=>(listeners.get(event)??[]).forEach(fn=>fn(value));
   const provider={
    on(event,fn){listeners.set(event,[...(listeners.get(event)??[]),fn]);},
    removeListener(event,fn){listeners.set(event,(listeners.get(event)??[]).filter(value=>value!==fn));},
    async request({method,params}){
     entry.calls.push({method,params});
     if(method==='eth_chainId')return entry.chain;
     if(method==='eth_accounts')return sessionStorage.getItem(`mock.${id}.connected`)?[account]:[];
     if(method==='eth_requestAccounts'){
      if(entry.reject)throw Object.assign(Error('User rejected request'),{code:4001});
      sessionStorage.setItem(`mock.${id}.connected`,'yes');return [account];
     }
     if(method==='wallet_requestPermissions')return [{parentCapability:'eth_accounts'}];
     if(method==='wallet_getPermissions')return [{parentCapability:'eth_accounts'}];
     if(method==='wallet_switchEthereumChain'){
      if(entry.rejectSwitch)throw Object.assign(Error('User rejected switch'),{code:4001});
      if(entry.unknownChain){entry.unknownChain=false;throw Object.assign(Error('Unknown chain'),{code:4902});}
      entry.chain=params[0].chainId;sessionStorage.setItem(`mock.${id}.chain`,entry.chain);emit('chainChanged',entry.chain);return null;
     }
     if(method==='wallet_addEthereumChain')return null;
     if(method==='wallet_revokePermissions'){sessionStorage.removeItem(`mock.${id}.connected`);return null;}
     throw Object.assign(Error(`Unimplemented test wallet method: ${method}`),{code:4200});
    },
   };
   entry.provider=provider;entry.emit=emit;mocks[id]=entry;
   const announce=()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid,name,rdns:id,icon:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"%3E%3Ccircle cx="14" cy="14" r="12" fill="%23449f80"/%3E%3C/svg%3E'},provider}}));
   window.addEventListener('eip6963:requestProvider',announce);announce();
  }
 });
 const page=await context.newPage(),errors=[],resourceFailures=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('response',response=>{if(response.url().startsWith(url.split('/preview/')[0])&&response.status()>=400)resourceFailures.push({url:response.url(),status:response.status()});});
 await page.goto(url);
 await check('EIP-6963 names and icons list both extensions and suppress the generic row',async()=>{
  await page.getByRole('button',{name:'Connect',exact:true}).click();await page.getByRole('button',{name:'Test MetaMask',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Test Rabby',exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:'Browser wallet',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Coinbase Wallet',exact:true}).count(),1);
  const icons=await page.locator('.wallet-row img').evaluateAll(images=>images.map(img=>({width:img.width,height:img.height,loaded:img.complete&&img.naturalWidth>0})));
  assert(icons.length>=3&&icons.every(img=>img.width===28&&img.height===28&&img.loaded));return icons;
 });
 await check('a declined named wallet returns to idle with an inline retry message',async()=>{
  await page.evaluate(()=>{window.__swornWalletMocks['io.metamask'].reject=true;});await page.getByRole('button',{name:'Test MetaMask',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Connection declined or unavailable'}).waitFor();
  assert(await page.getByRole('button',{name:'Test MetaMask',exact:true}).isEnabled());assert(await page.getByRole('dialog').isVisible());
  await page.evaluate(()=>{window.__swornWalletMocks['io.metamask'].reject=false;});
 });
 await check('named wallet connection on the wrong chain offers a switch',async()=>{
  await page.getByRole('button',{name:'Test MetaMask',exact:true}).click();await page.getByRole('button',{name:'Switch to Ethereum',exact:true}).waitFor();assert.equal(await page.getByRole('dialog').isVisible(),false);
 });
 await check('a declined chain switch is visible beside Connect on the landing page',async()=>{
  await page.evaluate(()=>{window.__swornWalletMocks['io.metamask'].rejectSwitch=true;});await page.getByRole('button',{name:'Switch to Ethereum',exact:true}).click();
  await page.locator('.connect-control .wallet-status').filter({hasText:'Switch to Ethereum in your wallet, then try again.'}).waitFor();assert(await page.getByRole('button',{name:'Switch to Ethereum',exact:true}).isVisible());
  await page.evaluate(()=>{window.__swornWalletMocks['io.metamask'].rejectSwitch=false;});
 });
 await check('an unknown chain is added using the exact handoff network before switching',async()=>{
  await page.getByRole('button',{name:'Switch to Ethereum',exact:true}).click();await page.getByRole('button',{name:/0x200e.*Disconnect/i}).waitFor();
  const calls=await page.evaluate(()=>window.__swornWalletMocks['io.metamask'].calls);
  const adds=calls.filter(call=>call.method==='wallet_addEthereumChain'),switches=calls.filter(call=>call.method==='wallet_switchEthereumChain');
  const manifest=JSON.parse(await readFile(resolve(root,'imd-deployment.json'),'utf8'));
  assert.equal(adds.length,1);assert.deepEqual(adds[0].params,[manifest.walletAddChain]);assert.equal(switches.length,3);assert(switches.every(call=>call.params[0].chainId==='0x1'));
  assert(!calls.some(call=>call.method==='eth_sendTransaction'));return {switches:switches.length,adds:adds.length};
 });
 await check('a stored connection reconnects after reload without asking for accounts',async()=>{
  await page.reload();await page.getByRole('button',{name:/0x200e.*Disconnect/i}).waitFor();
  const calls=await page.evaluate(()=>window.__swornWalletMocks['io.metamask'].calls);assert(!calls.some(call=>call.method==='eth_requestAccounts'));return calls.map(call=>call.method);
 });
 await check('account changes invalidate the old identity and disconnect restores Connect',async()=>{
  await page.evaluate(()=>window.__swornWalletMocks['io.metamask'].emit('accountsChanged',['0x2e96662e64ed947a9656fb586b2a3596ea8ba6c2']));
  await page.getByRole('button',{name:/0x2e96.*Disconnect/i}).waitFor();await page.getByRole('button',{name:/0x2e96.*Disconnect/i}).click();await page.getByRole('button',{name:'Connect',exact:true}).waitFor();
 });
 await check('named-wallet checks have no page errors or failed local resources',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(resourceFailures,[]);return {errors,resourceFailures};});
 await context.close();
 const phone=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',isMobile:true,hasTouch:true});await offline(phone);
 const mobile=await phone.newPage();await mobile.goto(url);await mobile.getByRole('button',{name:'Connect',exact:true}).click();
 await check('390px phone without a provider has four wallet-browser links and Coinbase Smart Wallet',async()=>{
  const names=['MetaMask','Coinbase Wallet','Rabby','Phantom'];for(const name of names)assert.equal(await mobile.getByRole('link',{name:`Open in ${name}`,exact:true}).count(),1);
  assert.equal(await mobile.getByRole('button',{name:'Coinbase Smart Wallet',exact:true}).count(),1);assert.equal(await mobile.getByRole('button',{name:'Browser wallet',exact:true}).count(),0);assert.equal(await mobile.getByText('WalletConnect',{exact:true}).count(),0);
  const rows=await mobile.locator('.wallet-row').evaluateAll(items=>items.map(item=>({name:item.textContent,height:item.getBoundingClientRect().height})));
  assert(rows.every(row=>row.height>=48));
  const dialog=await mobile.getByRole('dialog').boundingBox();assert(dialog&&dialog.x>=0&&dialog.x+dialog.width<=390&&Math.abs(dialog.y+dialog.height-844)<=1);
  const links=await mobile.locator('a.wallet-row').evaluateAll(items=>items.map(item=>item.href));
  assert(links[0].startsWith('https://link.metamask.io/dapp/'));assert.equal(new URL(links[1]).searchParams.get('cb_url'),url);assert.equal(new URL(links[2]).searchParams.get('dapp'),url);assert(links[3].includes(encodeURIComponent(url)));
  await mobile.screenshot({path:resolve(out,'phone-wallet-picker-390.png')});return {rows,links,bounds:dialog};
 });
 await check('phone picker closes with its single close control and restores focus',async()=>{
  assert.equal(await mobile.getByRole('button',{name:'Close wallet picker',exact:true}).count(),1);await mobile.getByRole('button',{name:'Close wallet picker',exact:true}).click();assert.equal(await mobile.getByRole('dialog').isVisible(),false);assert.equal(await mobile.evaluate(()=>document.activeElement.textContent),'Connect');
 });
 await phone.close();
}finally{
 await browser.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'results.json'),JSON.stringify({results},null,2)+'\n');
}
if(failed)process.exitCode=1;
