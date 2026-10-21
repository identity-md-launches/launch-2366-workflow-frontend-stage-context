import { useEffect, useRef, useState, type ReactNode } from 'react';
import { encodeAbiParameters, encodeFunctionData, isAddress, keccak256, parseAbiParameters, type Address, type Hex } from 'viem';
import { A, address, registryAbi, composerAbi, curatorAbi } from './config';
import { CATALOG } from './catalog';
import { integrity, livePrice, previewWallet, read, reg, withRpc } from './chain';
import { CANNOT_BE_TRUE, DISCLAIMER_REASON, DISCLAIMER_TEXT, curatorRequired, plainGuard, sharedGuard, upgradeGuard, type Context, type Guard, type Reads } from './eligibility';
import { clearJournal, confirmStep, friendlyError, loadJournal, newJournal, runStep, saveJournal, type Journal, type Phase, type Plan } from './flow';
import { UNISWAP_LINK, poolId, quoteExactImd, type SwapQuote } from './swap';
import { useWallet } from './wallet';
import { ClassMark, FlowChart, InfoBox, MiniCard, PaymentChoice, Section, Source, Table, getterSource } from './components';
/* COPY: draft, owner approval pending (round 2, F-18.18): the opening question. */
export const WHY_QUESTION='Why do I need to buy traits for a card I already minted?';
export const WHY_ANSWER='You do not. The card is not the point; the wallet’s facts are. A card is minted once and shows whatever facts its wallet has, now and later. Direct facts are already there for free. The other facts are sworn on request by IMD agents: paid at the oracle price. A request never transfers the card or its facts. An accepted answer adds a credential to the wallet that any contract can check.';
/* COPY: draft, owner approval pending (round 2, F-18.22): what each oracle fact adds to the card. */
type Action='mint'|'direct'|'paid'|'shared'|'apply'|'spec'|'recover'|'reset'|'prices';
type Notice={kind:'busy'|'error'|'success';text:string;prepared?:boolean};
import { decodeMetadata, ethMaximum, imd, number } from './format';
import { validateSpecFields } from './spec';

const FEE=10n**17n, SPEC_FEE=64n*10n**17n;
const calldata=(fn:string,args:readonly unknown[]=[])=>encodeFunctionData({abi:registryAbi,functionName:fn,args});
type Spec={kind:number;target:Address;item:string;arg:string;fixedArg:string;fixedVal:bigint;sumArg:string;op:number;threshold:bigint;fromBlock:bigint;toBlock:bigint;name:string};
export function Claim({rpc,verified}:{rpc:string;verified:boolean}) {
 const w=useWallet();const walletRef=useRef(w.wallet);walletRef.current=w.wallet;
 const [price,setPrice]=useState<bigint>();const [readError,setReadError]=useState('');
 const [journal,setJournal]=useState<Journal|undefined>(loadJournal);const [payment,setPayment]=useState<'IMD'|'ETH'>('IMD');
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [messageError,setMessageError]=useState(false);const [notices,setNotices]=useState<Partial<Record<Action,Notice>>>({});const [walletCard,setWalletCard]=useState<{account:string;image:string;tokenId:bigint}>();const [cardError,setCardError]=useState('');const [quote,setQuote]=useState<SwapQuote>();const [quoteError,setQuoteError]=useState('');
 const [direct,setDirect]=useState('101');
 const initialTrait=Number(new URLSearchParams((location.hash.split('?')[1]??'').split('#')[0]).get('trait'));
 const [paid,setPaid]=useState<number[]>(CATALOG.some(t=>t.id===initialTrait&&t.id>=601&&t.id!==1201)?[initialTrait]:[701]);const [communityIds,setCommunityIds]=useState('');
 const [sharedId,setSharedId]=useState('1201');const [sharedList,setSharedList]=useState('');const [recoveryHash,setRecoveryHash]=useState('');
 const [spec,setSpec]=useState({kind:'1',target:A.WhitelistCurator,item:'event Deposited(address indexed contributor, uint256 indexed hour, uint256 amount, uint256 creditedDelta, uint256 weightAdded, uint256 newWeight, uint256 txCount, uint256 hourTotal, uint256 earlyBps)',arg:'contributor',fixedArg:'',fixedVal:'0',sumArg:'',op:'0',threshold:'1',fromBlock:'25769870',toBlock:'25789604',name:''});
 useEffect(()=>{if(CATALOG.some(t=>t.id===initialTrait&&t.id>=601)){if(initialTrait===1201)setSharedId('1201');else setPaid([initialTrait]);requestAnimationFrame(()=>document.getElementById(initialTrait===1201?'shared-fact':`claim-trait-${initialTrait}`)?.scrollIntoView({block:'center'}));}},[initialTrait]);
 const [ack,setAck]=useState(false);const [eligTick,setEligTick]=useState(0);const [elig,setElig]=useState<{account?:string;reads?:Reads;failed:boolean;loading:boolean}>({failed:false,loading:false});
 const loadedJournal=useRef(journal);
 useEffect(()=>{loadedJournal.current=journal;},[journal]);
 const paidIds=[...new Set([...paid,...communityIds.split(/[\s,]+/).filter(s=>/^\d+$/.test(s)).map(Number)])];const paidKey=paidIds.join(',');
 // Eligibility reads for the guards: once a wallet is connected on mainnet, read what the Registry would check and disable the refused buttons.
 useEffect(()=>{
  const wallet=w.wallet;
  if(!wallet||wallet.chainId!==1){setElig({failed:false,loading:false});return;}
  let active=true;const account=wallet.account;const ids=paidKey?paidKey.split(',').map(Number):[];const shared=/^\d+$/.test(sharedId)?Number(sharedId):undefined;
  async function load(){
   setElig(prev=>prev.account===account?{...prev,loading:true}:{account,failed:false,loading:true});
   try{
    const reads=await withRpc(rpc,async c=>{
     const [paidVerified,sharedVerified,hour,tokenId]=await Promise.all([
      Promise.all(ids.map(id=>reg<boolean>(c,'hasTrait',[account,id]))),
      shared===undefined?Promise.resolve(false):reg<boolean>(c,'hasTrait',[account,shared]),
      read<readonly [bigint,boolean]>(c,address('WhitelistCurator'),curatorAbi,'firstHourOf',[account]),
      reg<bigint>(c,'tokenOf',[account]),
     ]);
     return {verifiedIds:ids.filter((_,i)=>paidVerified[i]),sharedVerified,joined:hour[1],tokenId} as Reads;
    });
    if(active)setElig({account,reads,failed:false,loading:false});
   }catch{if(active)setElig({failed:true,loading:false});}
  }
  void load();
  const timer=setInterval(()=>void load(),15000);
  return()=>{active=false;clearInterval(timer);};
 },[w.wallet,rpc,paidKey,sharedId,eligTick]);

 useEffect(()=>{
  const wallet=w.wallet;setWalletCard(undefined);setCardError('');
  if(!wallet||wallet.chainId!==1||elig.account!==wallet.account||elig.reads?.tokenId===undefined)return;
  let active=true;const tokenId=elig.reads.tokenId;
  void withRpc(rpc,async c=>{const block=await c.getBlockNumber({cacheTime:0});const uri=tokenId?await reg<string>(c,'tokenURI',[tokenId],block):await previewWallet(c,wallet.account,block);return decodeMetadata(uri).metadata.image;}).then(image=>{if(active)setWalletCard({account:wallet.account,image,tokenId});}).catch(()=>{if(active)setCardError('Wallet card preview unavailable. Retry live reads.');});
  return()=>{active=false;};
 },[w.wallet,rpc,elig.account,elig.reads?.tokenId,eligTick]);
 function notice(action:Action,value:Notice){setNotices(prev=>({...prev,[action]:value}));}
 async function reader(){return withRpc(rpc,async c=>{await integrity(c);return c;});}
 async function refresh(){
  setReadError('');
  try {
   const result=await withRpc(rpc,async c=>{await integrity(c);return livePrice(c);});
   setPrice(result);return true;
  } catch(e){setPrice(undefined);setReadError(friendlyError(e));return false;}
 }
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),15000);return()=>clearInterval(timer);},[rpc]);
 useEffect(()=>{
  if(!journal||journal.payment!=='ETH'||BigInt(journal.amount)===0n||journal.steps.swap?.state==='confirmed'){setQuote(undefined);setQuoteError('');return;}
  let active=true;
  async function update(){try{const q=await withRpc(rpc,c=>quoteExactImd(c,BigInt(journal!.amount)));if(active){setQuote(q);setQuoteError('');}}catch{if(active){setQuote(undefined);setQuoteError('Exact-output quote unavailable. Buy IMD on Uniswap, then use the IMD path.');}}}
  void update();const timer=setInterval(()=>void update(),15000);return()=>{active=false;clearInterval(timer);};
 },[rpc,journal?.key,journal?.payment,journal?.steps.swap?.state]);
 useEffect(()=>{setBusy(false);},[w.wallet]);
 function begin(plan:Plan,action?:Action){
  if(busy)return;
  const old=loadedJournal.current;
  if(old && Object.values(old.steps).some(s=>s && ['pending','awaiting wallet','unknown','replaced'].includes(s.state))){setMessage('A transaction may still be pending. Recover or confirm its receipt before preparing another flow.');setMessageError(true);if(action)notice(action,{kind:'error',text:'Recover or confirm the pending transaction before preparing another flow.'});return;}
  const j=newJournal(plan,plan.amount===0n?'IMD':payment);saveJournal(j);loadedJournal.current=j;setJournal(j);setQuote(undefined);setMessageError(false);if(action)notice(action,{kind:'success',text:'Prepared, see Transaction steps.',prepared:true});setMessage('Review the exact amount and numbered steps. Each step opens a separate wallet confirmation.');
  setTimeout(()=>document.getElementById('transaction-flow')?.scrollIntoView({block:'start'}),0);
 }
 async function prepare(action:Action,task:()=>Promise<Plan>){setBusy(true);notice(action,{kind:'busy',text:'Checking the selected operation on Ethereum mainnet.'});try{const plan=await task();setBusy(false);begin(plan,action);}catch(e){notice(action,{kind:'error',text:friendlyError(e)});setBusy(false);}}
 async function paidPlan(){
  const c=await reader();const current=await livePrice(c);
  const custom=communityIds.trim()?communityIds.split(/[\s,]+/).filter(Boolean).map(id=>{if(!/^\d+$/.test(id))throw Error('Community ids must be whole numbers.');return Number(id);}):[];
  const ids=[...new Set([...paid,...custom])];
  if(!ids.length)throw Error('Select at least one oracle trait.');
  const customNames=new Map<number,string>();
  for(const id of custom){if(id<10001||id>65534)throw Error('Community ids range from 10,001 to 65,534.');const s=await reg<Spec>(c,'specOf',[id]);if(![1,2,4,5].includes(s.kind))throw Error('Shared specs (kind 3) use requestSharedFact and applySharedFact. Paid upgrade accepts kinds 1, 2, 4 and 5.');customNames.set(id,s.name);}
  setPrice(current);return {origin:'step-02',facts:ids.map(id=>({id,name:customNames.get(id)??CATALOG.find(t=>t.id===id)?.name??'Community trait',price:current.toString()})),key:`upgrade:${ids.join(',')}:${current}`,label:`Request ${number(ids.length)} oracle fact${ids.length===1?'':'s'}`,data:calldata('upgrade',[ids,current]),amount:current*BigInt(ids.length),maxPrice:current};
 }
 function parseSharedId(){if(!/^\d+$/.test(sharedId))throw Error('Enter a shared fact id.');const id=Number(sharedId);if(id!==1201&&(id<10001||id>65534))throw Error('Choose 1201 or a registered kind-3 community spec.');return id;}
 async function sharedRequest(){const c=await reader();const id=parseSharedId();let name=CATALOG.find(t=>t.id===id)?.name??'';if(id!==1201){const spec=await reg<Spec>(c,'specOf',[id]);if(spec.kind!==3)throw Error('This is a personal community fact. Use a paid upgrade for kinds 1, 2, 4 and 5.');name=spec.name;}const fact=await reg<readonly[Hex,Hex,number]>(c,'sharedFact',[id]);if(!/^0x0+$/.test(fact[0]))throw Error('This shared fact is already stored. Apply the attested list for gas instead.');const current=await livePrice(c);return {origin:'step-02',facts:[{id,name,price:current.toString()}],key:`shared:${id}:${current}`,label:'Request the shared ranked fact once',data:calldata('requestSharedFact',[id,current]),amount:current,maxPrice:current,shared:true};}
 async function applyShared(){
  const c=await reader();const id=parseSharedId();let list:unknown;
  try{list=JSON.parse(sharedList);}catch{throw Error('Paste the attested answer as a JSON array of Ethereum addresses.');}
  if(!Array.isArray(list)||!list.length||list.length>64||!list.every(a=>typeof a==='string'&&isAddress(a,{strict:false})))throw Error('Use the complete attested address list, with at most 64 addresses.');
  const addresses=(list as string[]).map(a=>a.toLowerCase() as Address);
  const fact=await reg<readonly[Hex,Hex,number]>(c,'sharedFact',[id]);
  if(fact[2]!==addresses.length||keccak256(encodeAbiParameters(parseAbiParameters('address[]'),[addresses]))!==fact[1])throw Error('This list does not match the stored shared answer. Use the exact attested list in its original order.');
  return {origin:'step-02',key:`apply:${id}:${fact[1]}`,label:'Apply the stored shared fact',data:calldata('applySharedFact',[id,addresses]),amount:0n};
 }
 async function specPlan(){
  const kind=Number(spec.kind);validateSpecFields({...spec,kind,fixedArg:kind<=2?spec.fixedArg:''});
  if(!/^[A-Za-z0-9 .-]{1,32}$/.test(spec.name))throw Error('Trait name must be 1 to 32 letters, numbers, spaces, periods or hyphens.');
  const c=await reader();
  const integers:(keyof Pick<typeof spec,'fixedVal'|'threshold'|'fromBlock'|'toBlock'>)[]=[...(kind<=2?['fixedVal' as const]:[]),'threshold','fromBlock','toBlock'];
  for(const key of integers)if(!/^\d+$/.test(spec[key]))throw Error(`${key} must be an exact nonnegative integer.`);
  if(kind!==5&&!isAddress(spec.target,{strict:false}))throw Error('Enter the chain target contract address.');
  const s:Spec={kind,target:(kind===5?'0x0000000000000000000000000000000000000000':spec.target.toLowerCase()) as Address,item:kind===5?'':spec.item,arg:kind>=4?'':spec.arg,fixedArg:kind>=3?'':spec.fixedArg,fixedVal:kind>=3?0n:BigInt(spec.fixedVal),sumArg:[2,3].includes(kind)?spec.sumArg:'',op:kind===4?Number(spec.op):0,threshold:BigInt(spec.threshold),fromBlock:BigInt(spec.fromBlock),toBlock:BigInt(spec.toBlock),name:spec.name};
  const block=await c.getBlockNumber({cacheTime:0});
  await read(c,address('Composer'),composerAbi,'validateSpec',[s,block]);
  const expectedId=await reg<number>(c,'nextSpecId');
  const current=await livePrice(c);setPrice(current);
  return {origin:'step-03',firstClaimPrice:current.toString(),key:`spec:${keccak256(calldata('registerSpec',[s,BigInt(expectedId)]))}`,label:`Register community trait: ${s.name} (id ${number(expectedId)})`,data:calldata('registerSpec',[s,BigInt(expectedId)]),amount:SPEC_FEE,spec:true};
 }
 function update(j:Journal,note?:string){loadedJournal.current=j;setJournal({...j,steps:{...j.steps}});if(note){setMessageError(false);setMessage(note);}}
 async function execute(phase:Phase,recover=false){
  const wallet=w.wallet;const j=loadedJournal.current;if(!wallet||!j)return;
  setBusy(true);setMessageError(false);setMessage('Checking the current account, mainnet contracts and transaction state.');
  try {const c=await reader();const notify=(next:Journal,note?:string)=>{if(walletRef.current===wallet)update(next,note);};
   if(recover)await confirmStep(c,wallet,j,phase,notify);else await runStep(c,wallet,j,phase,notify,quote);
  }catch(e){if(walletRef.current===wallet){const error=friendlyError(e);setMessageError(true);setMessage(error);const step=j.steps[phase]??{state:'failed' as const};step.error=error;j.steps[phase]=step;saveJournal(j);update(j);}}
  finally{if(walletRef.current===wallet)setBusy(false);}
 }
 function reset(){
  if(journal&&Object.values(journal.steps).some(s=>s&&['pending','awaiting wallet','unknown','replaced'].includes(s.state))){notice('reset',{kind:'error',text:'Confirm or recover the pending transaction before clearing this flow.'});return;}
  clearJournal();loadedJournal.current=undefined;setJournal(undefined);setMessageError(false);setMessage('Flow cleared. Confirmed transactions remain onchain.');notice('reset',{kind:'success',text:'Flow cleared. Confirmed transactions remain onchain.'});
 }
 function recover(){
  if(!journal||!/^0x[0-9a-fA-F]{64}$/.test(recoveryHash)){notice('recover',{kind:'error',text:'Enter a complete transaction hash from your wallet activity.'});return;}
  const phase=(['swap','approve','registry'] as Phase[]).find(p=>journal.steps[p]?.state==='unknown'||journal.steps[p]?.state==='awaiting wallet');
  if(!phase){notice('recover',{kind:'error',text:'There is no unresolved broadcast in this flow.'});return;}
  journal.steps[phase]!.hash=recoveryHash as Hex;journal.steps[phase]!.state='pending';saveJournal(journal);update(journal,'Hash recovered. Check its receipt to continue.');notice('recover',{kind:'success',text:'Hash recovered. Check its receipt to continue.'});
 }
 const cost=(amount?:bigint)=>amount===undefined?'RPC unavailable':`${imd(amount)} IMD`;
 const selectedPaidCount=paidIds.length;
 const active=!!w.wallet&&w.wallet.chainId===1&&verified;
 const ctx:Context={connected:!!w.wallet,chainId:w.wallet?.chainId,reads:elig.account===w.wallet?.account?elig.reads:undefined,failed:elig.failed||!!readError,loading:elig.loading,acknowledged:ack};
 const gPlain=plainGuard(ctx),gMint:Guard=elig.account===w.wallet?.account&&elig.reads?.tokenId?{ok:false,reason:'already minted'}:gPlain,gUpgrade=upgradeGuard(ctx,paidIds),gShared=sharedGuard(ctx,Number(sharedId));
 const explorerHref=`#/explorer?address=${w.wallet?.account??''}`;
 const LinkedMessage=({text}:{text:string})=>{const trait=text.match(/\b[Tt]rait (\d+)/)?.[1];return <>{text}{/Explorer/i.test(text)&&w.wallet&&<> <a href={`${explorerHref}${trait?`&trait=${trait}`:''}`}>Open Explorer for this wallet</a></>}</>;};
 const Status=({action}:{action:Action})=>{const n=notices[action];return <p className={`action-status ${n?.kind==='error'?'error-text':''}`} role="status">{n?.prepared?<a href="#/claim#transaction-flow">{n.text}</a>:n?<LinkedMessage text={n.text}/>:''}</p>;};
 const Reason=({guard}:{guard:Guard})=>guard.ok?null:<p className="guard-reason" role="status">{guard.reason===DISCLAIMER_REASON?<a href="#/claim#oracle-disclaimer" onClick={e=>{e.preventDefault();const input=document.getElementById('oracle-disclaimer');input?.scrollIntoView({block:'center'});input?.focus({preventScroll:true});}}>{guard.reason}</a>:guard.reason}</p>;
 return <div className="narrow claim-page">
  <div className="page-intro"><h1>Claim</h1><p>A card costs <strong>0.10 IMD</strong> <Source>Registry.MINT_FEE</Source>. No trait claim is needed before minting. Direct traits freeze at mint. Fees are forwarded to the BurnExecutor for bridging and burning on Base.</p></div>
  <p role="status">{w.message||(w.wallet?'Connected wallet shown in the header. Every transaction needs your confirmation.':'Connect a wallet to mint its card or request a fact. You can prepare the mint before connecting.')}</p>
  <div className="mint-block" id="mint-card"><figure>
   {w.wallet?<>{walletCard&&walletCard.account===w.wallet.account?<><img src={walletCard.image} width={300} height={300} alt="Renderer card for the connected wallet"/><figcaption>{walletCard.tokenId?`Sworn #${number(walletCard.tokenId)} · minted`:'preview, no card minted'}</figcaption></>:<p className={cardError?'error-text':''} role="status">{cardError||'Reading this wallet’s Renderer card…'}</p>}</>:<><img src="./assets/sample-card.svg" width={300} height={300} alt="Synthetic Renderer card example"/><figcaption>Connect to see your wallet’s card. <Source href="./assets/sample-card.svg">Synthetic example</Source></figcaption></>}
  </figure><div><h2>Mint your Sworn card</h2><p>Mint once; add oracle traits before or after minting. A card can be sold; its direct traits freeze at mint and its facts stay about the wallet that minted it, which alone can add traits.</p><p className="cost">{cost(FEE)} {getterSource('MINT_FEE')} + Ethereum gas</p><p>Pay with: {payment}. <a href="#/claim#add-traits">Change payment method</a></p><button onClick={()=>begin({key:'mint',label:'Mint your Sworn card',data:calldata('mintCard'),amount:FEE,origin:'mint-card'},'mint')} disabled={busy||!gMint.ok}>Prepare card mint</button><Reason guard={gMint}/><Status action="mint"/></div></div>
  <Section title={WHY_QUESTION} className="claim-why"><p className="measure">{WHY_ANSWER}</p><FlowChart/></Section>
  {journal&&<section className="section transaction-flow" id="transaction-flow"><h2 className="section-label">Transaction steps / {journal.label}{journal.facts?.length===1?`: ${journal.facts[0].id} / ${journal.facts[0].name}`:''}</h2>
   {journal.origin&&<a href={`#/claim#${journal.origin}`}>from {journal.origin.startsWith('step-')?`step ${journal.origin.slice(5)}`:'card mint'}</a>}
   <p>Exact amount: <strong>{imd(BigInt(journal.amount))} IMD</strong> <Source href={`https://etherscan.io/address/${A.Registry}#readContract`}>Registry fee / live priceOf</Source> · Payment: {journal.payment}</p>
   {!!journal.facts?.length&&<ul className="review-facts">{journal.facts.map(fact=><li key={fact.id}>{fact.id} / {fact.name} · {imd(BigInt(fact.price))} IMD</li>)}</ul>}
   {journal.firstClaimPrice&&<p>Separate first claim at preparation: {imd(BigInt(journal.firstClaimPrice))} IMD. The oracle price can change before you make that request; registration alone forwards {imd(SPEC_FEE)} IMD.</p>}
   {!active&&(!w.wallet?<button onClick={()=>w.showConnect()}>Connect wallet</button>:w.wallet.chainId!==1?<button onClick={()=>void w.switchChain()}>Switch to Ethereum</button>:<p role="status">RPC verification is unavailable. Retry live reads before signing.</p>)}
   {journal.payment==='ETH'&&BigInt(journal.amount)>0n&&<><p>One Universal Router transaction buys the exact IMD amount. The v4 Quoter allows 1% maximum input slippage; the quote refreshes every 15 seconds. Output and unused ETH return to your connected account.</p>{quote?<p>You commit at most <strong>{ethMaximum(quote.maxInput)} ETH</strong> {getterSource('Quoter.quoteExactOutputSingle')}. Transaction deadline: 120 seconds from signing.</p>:<p className={quoteError?'error-text':''} role="status">{quoteError||'Reading exact-output quote…'}</p>}{quoteError&&<a href={UNISWAP_LINK}>Buy IMD on Uniswap</a>}<details><summary>Inspect the pinned swap route</summary><div className="route-details">{(['UniversalRouter','Quoter','PoolManager','Permit2','IMD','CappedBurnHook'] as const).map(key=><p key={key}>{key}: <span className="address">{A[key]}</span></p>)}<p>market id: <span className="address">{poolId}</span></p><p>PoolKey: native ETH / IMD, fee 10,000, tick spacing 60 <Source href="https://pool4.imd.fun">POOL4</Source></p><p>Exact maximum input: {quote?.maxInput.toString()??'quote unavailable'} wei</p><p>Recipient and refund recipient: <span className="address">{w.wallet?.account??'connect wallet'}</span></p></div></details></>}
   <ol className="transaction-steps">{(['swap','approve','registry'] as Phase[]).filter(p=>p==='registry'||(BigInt(journal.amount)>0n&&(p==='approve'||journal.payment==='ETH'))).map((phase,i)=>{
    const step=journal.steps[phase];const preceding=phase==='registry'?BigInt(journal.amount)===0n||journal.steps.approve?.state==='confirmed':phase==='approve'?journal.payment!=='ETH'||journal.steps.swap?.state==='confirmed':true;
    const pending=!!step?.hash&&step.state!=='confirmed';const title=phase==='swap'?'Buy exact IMD':phase==='approve'?'Approve exact IMD':'Call the Registry';
    return <li key={phase}><span className="step-number" aria-hidden="true">{String(i+1).padStart(2,'0')}</span><div><h3>{title}</h3><p className={`state-${step?.state.replaceAll(' ','-')??'ready'}`}>{step?.state??'ready'} {step?.hash&&<a className="address" href={`https://etherscan.io/tx/${step.hash}`}>{step.hash}</a>}</p><button className={phase==='registry'?'':'secondary'} disabled={!active||busy||!preceding||step?.state==='confirmed'||(phase==='swap'&&!quote&&!pending)} onClick={()=>void execute(phase,pending)}>{step?.state==='confirmed'?'Confirmed':busy?'Checking…':pending?'Check receipt':title}</button><p className={`action-status ${step?.error?'error-text':''}`} role="status">{step?.error?<LinkedMessage text={step.error}/>:step?.state==='confirmed'?'Receipt confirmed.':busy?'Checking the wallet and transaction state.':!preceding?'Confirm the preceding receipt first.':''}</p></div></li>;
   })}</ol>
   {journal.registeredId&&<p>Registered trait id: <strong>{number(journal.registeredId)}</strong> <Source href={`https://etherscan.io/tx/${journal.steps.registry?.hash}`}>This receipt’s SpecRegistered log</Source></p>}
   {journal.outcomes?.map((outcome,i)=><p key={i}><LinkedMessage text={outcome}/><Source href={`https://etherscan.io/tx/${journal.steps.registry?.hash}`}>Confirmed receipt</Source></p>)}
   <p className={`flow-message ${messageError?'error-text':''}`} role="status"><LinkedMessage text={message}/></p>
   {Object.values(journal.steps).some(s=>s?.state==='unknown'||s?.state==='awaiting wallet')&&<div className="recover-form"><label htmlFor="recover-hash">Recover a broadcast transaction hash</label><input id="recover-hash" value={recoveryHash} onChange={e=>setRecoveryHash(e.target.value.trim())}/><button className="secondary" onClick={recover}>Recover hash</button><Status action="recover"/><p>A reload never resends an unresolved swap. Copy its hash from the wallet’s activity.</p></div>}
   <button className="secondary" disabled={busy} onClick={reset}>Clear finished flow</button><Status action="reset"/><p>Only transaction intent and hashes stay in this tab’s session storage for reload recovery. Reconnect after a reload, then check receipts. No transaction runs automatically.</p>
  </section>}
  <Section title="Add traits" id="add-traits"><p>Choose the path for the fact. A card mint is separate from every trait request.</p><PaymentChoice payment={payment} setPayment={setPayment} name="all"/><p>This payment choice applies to every prepare button, including the card mint. A prepared flow keeps the payment method you reviewed.</p><p className="live-prices">Oracle request: {cost(price)} {getterSource('priceOf')}</p>{readError&&<p className="error-text" role="status">{readError}</p>}<button className="secondary" onClick={()=>{notice('prices',{kind:'busy',text:'Refreshing live prices and wallet eligibility.'});void refresh().then(ok=>notice('prices',{kind:ok?'success':'error',text:ok?'Live price refreshed. Wallet eligibility is being checked.':'Live prices are unavailable. Choose another public RPC or retry.'}));setEligTick(n=>n+1);}} disabled={busy}>Refresh live prices</button><Status action="prices"/></Section>
  <ClaimStep number="01" title="Already true · direct reads">
   <p>Direct traits freeze when a card is minted; wallets without a card use live Curator reads. <Source>CATALOG §3</Source> No oracle request or claim transaction is needed.</p>
   <InfoBox who="Anyone, for any wallet; no transaction." cost="0 IMD, 0 gas: a read." risk="Direct traits are historical snapshots once minted; they do not show a later balance." benefit="The wallet, and every contract that calls hasTrait on it."/><label htmlFor="direct-id">Direct fact</label><div className="select-with-card"><select id="direct-id" value={direct} onChange={e=>setDirect(e.target.value)}>{CATALOG.filter(t=>t.evidence==='direct').map(t=><option key={t.id} value={t.id}>{t.id} / {t.name}</option>)}</select><MiniCard id={Number(direct)}/></div><p className="cost">0.00 IMD {getterSource('hasTrait')} · gas-free read</p><button className="secondary" onClick={()=>{if(w.wallet)location.hash=`/explorer?address=${w.wallet.account}&trait=${direct}`;else{notice('direct',{kind:'success',text:'Connect a wallet to inspect its direct facts.'});w.showConnect();}}}>Check wallet facts</button><Status action="direct"/>
  </ClaimStep>
  <ClaimStep number="02" title="Paid upgrade">
   <p>Swarmed means “operated a seat through 3 accepted swarm jobs”. Jobs are counted up to 64 blocks before the block of your request; request again after more jobs.</p><p>Choose a chain-proven or panel fact, or add registered community specs of kind 1, 2, 4 or 5. The cost is <code>k × priceOf</code>, <strong>spent whatever the answer</strong>. Your wallet gains the fact after an accepted answer; any contract can then check it.</p>
   <InfoBox who="Any wallet, for itself." cost="k × the live oracle price plus gas, spent whatever the answer." risk="A false answer stores nothing and refunds nothing; a missed panel refunds nothing." benefit="Your wallet and the contracts that use its accepted facts."/>
   <div className="trait-picker"><Table className="picker-table" label="Oracle facts" minWidth={600}><thead><tr><th>Select</th><th>Fact</th><th className="preview-cell">Preview</th></tr></thead><tbody>{CATALOG.filter(t=>t.id>=601&&t.id!==1201).map(t=><tr key={t.id} id={`claim-trait-${t.id}`} className={paid.includes(t.id)?'selected-trait':undefined}><td><input type="checkbox" aria-label={`${t.id} / ${t.name}`} checked={paid.includes(t.id)} onChange={e=>setPaid(prev=>e.target.checked?[...prev,t.id]:prev.filter(id=>id!==t.id))}/></td><td><span>{t.id} / {t.name}</span><p className="table-detail">{t.rule} · {t.window} <Source>CATALOG §3</Source></p><ClassMark value={t.evidence}/>{elig.reads?.joined===false&&curatorRequired(t.id)&&<p className="guard-reason">{CANNOT_BE_TRUE}</p>}</td><td className="preview-cell"><MiniCard id={t.id} size={56}/></td></tr>)}</tbody></Table></div>
   <p>If you want to curate, only facts minted onchain count: a request without an accepted answer adds nothing to anyone.</p>
   <label htmlFor="community-ids">Additional community spec ids (comma separated)</label><input id="community-ids" value={communityIds} onChange={e=>setCommunityIds(e.target.value)} placeholder="Registered spec ids, if any"/>
   <label className="check-label disclaimer"><input type="checkbox" id="oracle-disclaimer" checked={ack} onChange={e=>setAck(e.target.checked)}/> {DISCLAIMER_TEXT}</label>
   <p className="cost">{cost(price===undefined?undefined:price*BigInt(selectedPaidCount))} {getterSource('k × priceOf')} + gas · Pay with: {payment}</p><button onClick={()=>void prepare('paid',paidPlan)} disabled={busy||!gUpgrade.ok}>Prepare paid upgrade</button><Reason guard={gUpgrade}/><Status action="paid"/>
   <div className={`shared-fact ${initialTrait===1201?'selected-trait':''}`} id="shared-fact"><h4>Top Weights / the shared fact</h4><p>The top-32 shared fact uses panel 11 / quorum 7. Every attempt costs the full live price. Anyone may request it once; each of the 32 members then applies the same attested list for gas. <Source>CATALOG §3</Source> <Source>CATALOG §6</Source> Open the attestation link in Explorer and paste the exact answer list below.</p><label htmlFor="shared-id">Shared fact id</label><input id="shared-id" inputMode="numeric" value={sharedId} onChange={e=>setSharedId(e.target.value)}/><p className="cost">Request: {cost(price)} {getterSource('priceOf')} · Apply: 0.00 IMD {getterSource('applySharedFact')} · Pay with: {payment}</p><button className="secondary" disabled={busy||!gShared.ok} onClick={()=>void prepare('shared',sharedRequest)}>Prepare shared request</button><Reason guard={gShared}/><Status action="shared"/><label htmlFor="shared-list">Complete attested address list (JSON)</label><textarea id="shared-list" rows={4} value={sharedList} onChange={e=>setSharedList(e.target.value)} placeholder="Paste the complete attested answer here"/><button className="secondary" disabled={busy||!gPlain.ok} onClick={()=>void prepare('apply',applyShared)}>Prepare to apply the fact</button><Reason guard={gPlain}/><Status action="apply"/></div>
  </ClaimStep>
  <ClaimStep number="03" title="Add a community trait">
   <p>Registration costs <strong>{cost(SPEC_FEE)}</strong> <Source>Registry.SPEC_FEE</Source>, forwarded to the BurnExecutor for bridging and burning on Base. Your first claim is a separate oracle request, currently {cost(price)} {getterSource('priceOf')}. {price!==undefined&&<>Registration plus one claim currently totals <strong>{cost(SPEC_FEE+price)}</strong>, plus gas. </>}The oracle price can change; preparing registration reads it again at the moment of your click.</p>
   <InfoBox who="Anyone can register a recipe." cost="6.4 IMD plus gas to register; each claim pays the live oracle price separately." risk="A registered recipe is immutable. A false or missed claim refunds nothing." benefit="Every wallet that can prove the fact, and every contract that reads it."/>
   <p>The immutable spec’s id comes from your receipt’s <code>SpecRegistered(traitId, registrant)</code> log. Choose real fields from the declared ABI signature; extra prose and anonymous events are refused.</p>
   <div className="spec-fields"><label>Template<select value={spec.kind} onChange={e=>setSpec({...spec,kind:e.target.value})}><option value="1">T1 / count matching logs</option><option value="2">T2 / sum matching logs</option><option value="3">T3 / shared ranked list</option><option value="4">T4 / compare a historical call</option><option value="5">T5 / historical account nonce</option></select></label>
    {Number(spec.kind)!==5&&<><Field title="Target contract" value={spec.target} set={target=>setSpec({...spec,target})}/><Field title="Event or function ABI item" value={spec.item} set={item=>setSpec({...spec,item})}/></>}
    {[1,2,3].includes(Number(spec.kind))&&<Field title={spec.kind==='3'?'Group-by indexed argument':'Claimant indexed argument'} value={spec.arg} set={arg=>setSpec({...spec,arg})}/>}
    {[1,2].includes(Number(spec.kind))&&<><Field title="Optional second indexed argument" value={spec.fixedArg} set={fixedArg=>setSpec({...spec,fixedArg})}/><Field title="Second filter value (exact uint256)" value={spec.fixedVal} set={fixedVal=>setSpec({...spec,fixedVal})}/></>}
    {[2,3].includes(Number(spec.kind))&&<Field title="Field to sum" value={spec.sumArg} set={sumArg=>setSpec({...spec,sumArg})}/>}
    {spec.kind==='4'&&<label>Comparison<select value={spec.op} onChange={e=>setSpec({...spec,op:e.target.value})}><option value="0">Choose comparison</option><option value="1">&gt;=</option><option value="2">&gt;</option><option value="3">&lt;=</option><option value="4">&lt;</option><option value="5">==</option></select></label>}
    <Field title={spec.kind==='3'?'Head count (1 to 32)':'Threshold (exact uint256)'} value={spec.threshold} set={threshold=>setSpec({...spec,threshold})}/><Field title="First block (decimal)" value={spec.fromBlock} set={fromBlock=>setSpec({...spec,fromBlock})}/><Field title="Last block (decimal)" value={spec.toBlock} set={toBlock=>setSpec({...spec,toBlock})}/><Field title="Trait name (1 to 32 ASCII characters)" value={spec.name} set={name=>setSpec({...spec,name})}/>
   </div><p>Kinds 1–4 require a window of at least 7,200 blocks, ending at least 64 blocks behind the current block. Kind 5 uses one block at least 7,200 blocks old and the contract-mandated empty target. Numbers stay exact integers. Composer.validateSpec checks the complete spec before any approval.</p><p className="cost">{cost(SPEC_FEE)} {getterSource('SPEC_FEE')} + gas, then a separate first claim · Pay with: {payment}</p><button disabled={busy||!gPlain.ok} onClick={()=>void prepare('spec',specPlan)}>Prepare spec registration</button><Reason guard={gPlain}/><Status action="spec"/>
  </ClaimStep>
 </div>;
}
function ClaimStep({number:n,title,children}:{number:string;title:string;children:ReactNode}){return <section className="claim-step" id={`step-${n}`}><h3 aria-label={`Step ${n} · ${title}`}><span className="step-number" aria-hidden="true">{n}</span> {title}</h3><div className="step-body">{children}</div></section>;}
function Field({title,value,set}:{title:string;value:string;set:(s:string)=>void}){return <label>{title}<input value={value} onChange={e=>set(e.target.value)} spellCheck={false}/></label>;}
