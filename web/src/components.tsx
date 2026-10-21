import { Children, cloneElement, isValidElement, useEffect, useId, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { getAddress, isAddress } from 'viem';
import { A, EXPLORER, REPO, SYNTHETIC } from './config';
import { CATALOG, type Evidence } from './catalog';

const catalogAnchors:Record<string,string>={'1':'1-measured-anchors-ethereum-mainnet-read-2026-10-11','2':'2-ids-and-tiers','3':'3-trait-table-25-slots','4':'4-what-the-callback-accepts-per-class','5':'5-spec-registration-community-traits','6':'6-sharing-and-fees','7':'7-name-table'};
export const Source=({children='CATALOG §3',href}:{children?:ReactNode;href?:string})=>{
 const label=typeof children==='string'?children:'';const section=label.match(/CATALOG §([1-7])/);
 const target=href??(section?`${REPO}/blob/main/CATALOG.md#${catalogAnchors[section[1]]}`:label.startsWith('Registry.')?`${REPO}/blob/main/src/Registry.sol`:`${REPO}/blob/main/CATALOG.md#${catalogAnchors['3']}`);
 return <a className="source" href={target}>{children}</a>;
};
export function Section({title,children,id,className=''}:{title:string;children:ReactNode;id?:string;className?:string}){
 return <section className={`section ${className}`} id={id}><h2 className="section-label">{title}</h2>{children}</section>;
}
export function AddressForm({initial='',onSubmit,label='Wallet address'}:{initial?:string;onSubmit:(value:string)=>void;label?:string}){
 const id=useId();const [value,setValue]=useState(initial);const [error,setError]=useState('');const [small,setSmall]=useState(()=>typeof matchMedia!=='undefined'&&matchMedia('(max-width: 600px)').matches);
 useEffect(()=>{const media=matchMedia('(max-width: 600px)');const change=()=>setSmall(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 function submit(e:FormEvent){e.preventDefault();if(!isAddress(value,{strict:false})){setError('Enter a complete Ethereum address: 0x followed by 40 hexadecimal characters.');document.getElementById(id)?.focus();return;}setError('');onSubmit(getAddress(value.toLowerCase()));}
 return <form className="address-form" onSubmit={submit} noValidate>
  <label htmlFor={id}>{label}</label>
  <div className="address-controls"><input id={id} value={value} onChange={e=>setValue(e.target.value.trim())} placeholder={small?'0x… (42 characters)':SYNTHETIC} spellCheck={false} autoCapitalize="none" autoComplete="off" aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined}/><button type="submit">Explore wallet</button></div>
  <p id={`${id}-error`} className={error?'error-text':'secondary-text'} role="status">{error||'Any Ethereum address. No wallet connection needed.'}</p>
 </form>;
}
const textOf=(node:ReactNode):string=>Children.toArray(node).map(child=>typeof child==='string'||typeof child==='number'?String(child):isValidElement<{children?:ReactNode}>(child)?textOf(child.props.children):'').join('');
export function Table({children,label,minWidth=680,className='',scrollOnly=false}:{children:ReactNode;label:string;minWidth?:number;className?:string;scrollOnly?:boolean}){
 let headers:string[]=[];
 Children.forEach(children,part=>{if(isValidElement<{children?:ReactNode}>(part)&&part.type==='thead')Children.forEach(part.props.children,row=>{if(isValidElement<{children?:ReactNode}>(row))headers=Children.toArray(row.props.children).map(textOf);});});
 function annotate(node:ReactNode):ReactNode{return Children.map(node,child=>{
  if(!isValidElement<{children?:ReactNode;colSpan?:number}>(child))return child;
  if(child.type==='tr')return cloneElement(child,{},Children.map(child.props.children,(cell,index)=>isValidElement(cell)?cloneElement(cell as ReactElement<Record<string,unknown>>,{'data-label':headers[index]??''}):cell));
  if(child.props.children)return cloneElement(child,{},annotate(child.props.children));
  return child;
 });}
 return <>{scrollOnly&&<p className="secondary-text">Scroll the table sideways for all columns.</p>}<div className={`table-scroll ${scrollOnly?'scroll-only':'responsive-table'} ${className}`} role="region" aria-label={label} tabIndex={0}><table style={{minWidth}}>{annotate(children)}</table></div></>;
}
export function ClassMark({value}:{value:Evidence}){return <span className={`class-mark ${value}`}>{value}</span>;}
export function ContractAddress({name,value}:{name:string;value:string}){return <div className="contract-address"><span>{name}</span><a className="address" href={`${EXPLORER}/address/${value}`}>{value}</a></div>;}
// Owner copy, word for word (spec rows F-02, F-03, F-04).
export const WHY_SWORN='WhitelistCurator.sol set out to curate a permissionless onchain allowlist of proven wallets, for mints, early access, airdrops or reputation, that a contract reads directly at mint time, with no merkle root and no snapshot. Its 66-hour game recorded 19,522 wallets that kept paying real gas, hour after hour, in a quiet market, and it left the reading of that record to builders. Sworn is built on it: it turns the record into facts any contract can check with hasTrait, so a mint or a grant can use the signal without indexing the list itself. Some facts are read live from the Curator, the rest are proven by the swarm, and anyone can add more.';
export const BUILT_BY_SWARM="The contracts were built, audited and deployed by Identity.md's swarm in paid jobs, and so was this site. The job records are public.";
export const NO_COIN='Sworn has no coin of its own; its only token is the card.';
export function WhySworn(){return <p className="measure">{WHY_SWORN}</p>;}
/** One catalog id lit on an empty card, rendered at build time by the Renderer (web/scripts/render-assets.mjs); nothing is rendered at runtime. */
export function MiniCard({id,size=96}:{id:number;size?:number}){
 const trait=CATALOG.find(t=>t.id===id);
 return <img className="mini-card" src={`./assets/traits/${trait?id:'empty'}.svg`} width={size} height={size} alt={trait?`${trait.name} on an empty card`:'An empty card'}/>;
}
export function CardPair(){return <figure className="card-pair"><div><MiniCard id={0}/><MiniCard id={101}/></div><figcaption>The card is the artifact. The fact belongs to the wallet: the same card, empty and with Spawned 101 lit.</figcaption></figure>;}
/* COPY: draft, owner approval pending (round 2, F-18.29): the four trait classes and how a fact gets sworn. */
export const PROOF_OF_SWEAR='Proof of swear: a fact is sworn when enough independent IMD agents answer the same question about a wallet the same way and sign it. The Registry checks the signature, the question, the quorum and the block window before it records anything. Direct facts need no swearing: Curator reads freeze at mint.';
export const CLASS_CARDS:{cls:Evidence;title:string;how:string}[]=[
 {cls:'direct',title:'Direct facts',how:'Curator facts freeze at mint. Before minting, Curator facts are read live; no oracle request is needed.'},
 {cls:'chain-proven',title:'Chain-proven facts',how:'A recipe over a fixed block window: count or sum the Curator’s events for a wallet. At least 5 IMD agents rerun it and 3 must agree; the signed answer is stored.'},
 {cls:'shared',title:'Shared facts',how:'One ranked list for everyone, the top 32 by summed weight. Requested once at the oracle price; each member applies the same attested list for gas.'},
 {cls:'panel',title:'Panel facts',how:'Evidence the chain cannot replay cheaply, such as an account’s nonce at the launch block. 11 agents check it and 7 must agree.'},
];
export function ClassCards(){return <div className="class-cards" aria-label="The four trait classes">{CLASS_CARDS.map(c=><div className="class-card" key={c.cls}><ClassMark value={c.cls}/><h3>{c.title}</h3><p>{c.how}</p><Source>CATALOG §4</Source></div>)}</div>;}
/* COPY: draft, owner approval pending (round 2, F-18.30): HOW IT WORKS told twice. */
export const STORIES:{title:string;steps:[string,string,string][]}[]=[
 {title:'How it works for a wallet: mint a card, add facts, swear new ones',steps:[
  ['01','Mint once','0.10 IMD mints the card. It shows every fact the wallet has and updates itself; there is no second mint.'],
  ['02','Add facts','Direct traits freeze at mint. A paid upgrade asks the oracle at the live price, spent whatever the answer.'],
  ['03','Swear a new fact','Register a community trait for 6.4 IMD: a recipe anyone can claim against. Its first claim is a normal request at the live price.'],
 ]},
 {title:'How it works for a curator: finding real wallets',steps:[
  ['01','Pick the facts','Decide what a real user looks like: joined early, kept depositing hour after hour, held capital, or carries a community trait you registered.'],
  ['02','Read hasTrait','Your contract or indexer calls hasTrait(wallet, id) on the Registry. No list to download, no snapshot, no merkle root.'],
  ['03','Spend the signal','Gate a mint, filter an airdrop, weight a reputation. Only facts minted onchain count; nothing here is self-declared.'],
 ]},
];
export function Stories(){return <>{STORIES.map((s,story)=><Section title={s.title} key={s.title}><div className="three-columns">{s.steps.map(([n,title,copy],step)=>{
 const href=story===0?['#/claim','#/claim#step-02','#/claim#step-03'][step]:step===1?'#/integrate':'#/catalog';
 return <div className="how-step" key={n}><span className="step-number">{n}</span><h3><a href={href}>{title}</a></h3><p>{copy}</p><Source href={`${REPO}/blob/main/src/Registry.sol`}>Registry.sol</Source></div>;
 })}</div></Section>)}</>;}
/* The builders part of WhitelistCurator.sol's own comment (lines 32 to 53 of the verified source), quoted word for word
   from the bundled excerpt; the bridging sentence after it is draft copy (round 2, F-18.28). */
export const BUILDERS_LINES:[number,number]=[32,53];
export const BUILDERS_BRIDGE='That presence is what Sworn turns into facts.';
export function BuildersExcerpt(){
 const [lines,setLines]=useState<{line:number;text:string}[]>();
 useEffect(()=>{let active=true;fetch('./data/curator-source.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then((s:{lines:{line:number;text:string}[]})=>{if(active)setLines(s.lines.filter(l=>l.line>=BUILDERS_LINES[0]&&l.line<=BUILDERS_LINES[1]));}).catch(()=>{if(active)setLines([]);});return()=>{active=false;};},[]);
 if(!lines)return <p className="secondary-text">Loading the contract’s own words.</p>;
 if(!lines.length)return <p className="secondary-text">The bundled source excerpt is unavailable. <a href="#/whitelistcurator#source">Read it on the WhitelistCurator page.</a></p>;
 const paragraphs=lines.map(l=>l.text.replace(/^\/\/\/\s?/,'')).join('\n').split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(Boolean);
 return <figure className="builders-excerpt"><figcaption>WhitelistCurator.sol, “for builders consuming this list”, lines {BUILDERS_LINES[0]} to {BUILDERS_LINES[1]} <Source href="#/whitelistcurator#source">verified source</Source></figcaption><blockquote>{paragraphs.map((p,i)=><p key={i}>{p}</p>)}</blockquote><p className="measure">{BUILDERS_BRIDGE}</p></figure>;
}
/* COPY: draft, owner approval pending (round 2, F-18.19/20/21): who can act, what it costs, what is at risk, who benefits. */
export function InfoBox({who,cost,risk,benefit}:{who:string;cost:string;risk:string;benefit:string}){
 return <dl className="info-box">{[['Who',who],['Cost',cost],['Risk',risk],['Who benefits',benefit]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}
/* COPY: draft, owner approval pending (round 2, F-18.18): the minimal flow of a fact. */
export const FLOW:[string,string][][]=[
 [['Your wallet','did things onchain'],['Direct facts','read live, free'],['Your card','shows them']],
 [['Request a fact','paid upgrade'],['IMD agents verify','a panel reruns the recipe, a quorum signs'],['Registry stores it','the sworn answer, forever'],['Your card updates itself','no second mint']],
];
export function FlowChart(){return <div className="flow" role="img" aria-label="How a fact reaches a card: direct facts are read live; requested facts are verified by IMD agents, stored by the Registry and shown by the card">{FLOW.map((row,i)=><ol key={i} className="flow-row">{row.map(([title,sub])=><li key={title}><strong>{title}</strong><span>{sub}</span></li>)}</ol>)}</div>;}
export function PaymentChoice({payment,setPayment,name}:{payment:'IMD'|'ETH';setPayment:(p:'IMD'|'ETH')=>void;name:string}){
 return <div className="payment-choice" role="radiogroup" aria-label="Payment method"><span>Pay with</span><label><input type="radio" name={`payment-${name}`} checked={payment==='IMD'} onChange={()=>setPayment('IMD')}/> IMD</label><label><input type="radio" name={`payment-${name}`} checked={payment==='ETH'} onChange={()=>setPayment('ETH')}/> ETH</label><span className="secondary-text">IMD is the default. ETH buys the exact IMD amount first.</span></div>;
}
export function HowToVerify(){return <ol className="numbered-list">
 <li><div><h3>Read the registry</h3><p>Read <code>claimantOf(tokenId)</code>, then <code>hasTrait(claimant, traitId)</code> and <code>verified(claimant, traitId)</code>. Decode the card’s tokenURI as Base64 JSON, preserving all integers exactly. Its oracle array includes the block window and both request ids. Community recipes are read with specOf(id); metadata carries only id, name, kind, target and the verifying request id. A zero request id means not claimed.</p></div></li>
 <li><div><h3>Rerun the recipe on two public RPCs</h3><p>For T1 count matching logs; for T2 sum the named field; for T3 group, sum and rank (ties by ascending address). T4 compares a historical call. T5 checks the historical account nonce. Swarmed uses T6: count accepted swarm-job entries during the wallet’s seat-holding intervals, using the stored window. Derive event topics from the stored item, including indexed arguments. Use the exact block window and check its closing block hash.</p></div></li>
 <li><div><h3>Check the signed attestation</h3><p>Take the first 16 bytes of oracleRequestId as its UUID and open the attestation link in Explorer. Check the EIP-712 signer and domain (<code>IdentityMD Oracle</code>, domain version 2, chain 1, this Registry), questionHash, answer type, signed panel size, quorum, agreement, issue time and expiry. Hash the canonical question document, not the entire request body. The card’s minPanelSize and minQuorum are acceptance minima.</p></div></li>
 <li><div><h3>Compare the deployed code</h3><p>Rebuild the launch source with solc 0.8.24 and the unchanged Foundry settings. Compare each deployed runtime byte for byte with Registry, Composer and Renderer: metadata hashing and CBOR are disabled, and there are no immutables. Read all seven dependency getters and compare them with the launch record. This site verifies the ABI hashes, network, seven dependency getters and all three deployed runtime hashes before enabling transactions.</p></div></li>
 </ol>;}
export const getterSource=(fn:string)=>{
 const target=fn.includes('priceOf')?A.IntakeV2:fn.includes('Quoter')?A.Quoter:fn==='IDMD.balanceOf'?A.IDMD:['firstHourOf','txCountOf','contributedBy','pointsOf'].includes(fn)?A.WhitelistCurator:A.Registry;
 return <Source href={`${EXPLORER}/address/${target}#readContract`}>{fn} · live</Source>;
};
