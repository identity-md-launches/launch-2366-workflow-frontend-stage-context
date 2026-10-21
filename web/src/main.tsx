import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { A, REPO, EXPLORER } from './config';
import { integrity, withRpc, DeploymentMismatch, type Integrity } from './chain';
import { Landing, Catalog, Explorer, FactArtifact, Integrate, WhitelistCurator, About } from './pages';
import { Claim } from './Claim';
import { ConnectControl, ConnectSheet } from './ConnectSheet';
import './styles.css';

const NAV=[['Catalog','catalog'],['Explorer','explorer'],['Claim','claim'],['Fact vs artifact','fact-vs-artifact'],['Integrate','integrate'],['WhitelistCurator','whitelistcurator'],['About','about']];
function route(){const [pathAndQuery,anchor='']=(location.hash.slice(1)||'/').split('#');const [path,query='']=pathAndQuery.split('?');return {page:path.replace(/^\//,''),query,anchor};}
function App(){
 const [locationState,setLocationState]=useState(route);const [rpc,setRpc]=useState<string>(A.publicRpcs[0]);const [check,setCheck]=useState<Integrity>();const [checkMessage,setCheckMessage]=useState('Verifying Ethereum mainnet dependencies…');const [mismatch,setMismatch]=useState(false);const [retry,setRetry]=useState(0);
 useEffect(()=>{const changed=()=>setLocationState(route());addEventListener('hashchange',changed);return()=>removeEventListener('hashchange',changed);},[]);
 useEffect(()=>{
  document.title=`${NAV.find(n=>n[1]===locationState.page)?.[0]??'Wallet facts'} | Sworn`;
  const frame=requestAnimationFrame(()=>{
   const trait=new URLSearchParams(locationState.query).get('trait');
   const target=locationState.anchor?document.getElementById(locationState.anchor):trait?document.getElementById(`trait-${trait}`):null;
   if(target){target.scrollIntoView({block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
   else if(!trait){window.scrollTo(0,0);document.getElementById('main')?.focus({preventScroll:true});}
  });
  return()=>cancelAnimationFrame(frame);
 },[locationState]);
 useEffect(()=>{
  let alive=true;let timer:ReturnType<typeof setTimeout>;setCheck(undefined);setMismatch(false);setCheckMessage('Verifying Ethereum mainnet dependencies…');
  const run=async()=>{
   try{const value=await withRpc(rpc,integrity);if(!alive)return;setCheck(value);setMismatch(false);setCheckMessage(`Ethereum mainnet / dependency check passed / block ${value.block.toLocaleString('en-US')}`);timer=setTimeout(run,60_000);}
   catch(error){if(!alive)return;setCheck(undefined);setMismatch(error instanceof DeploymentMismatch);setCheckMessage(error instanceof Error?error.message:'RPC unavailable. Retry dependency checks.');if(!(error instanceof DeploymentMismatch))timer=setTimeout(run,12_000);}
  };
  const online=()=>setRetry(value=>value+1);addEventListener('online',online);void run();
  return()=>{alive=false;clearTimeout(timer);removeEventListener('online',online);};
 },[rpc,retry]);
 const page=locationState.page;
 return <><a href="#main" className="skip-link" onClick={e=>{e.preventDefault();document.getElementById('main')?.focus();}}>Skip to content</a>
  <header><div className="header-inner"><a className="brand" href="#/" aria-label="Sworn home"><img src="./assets/logo.svg" width={32} height={32} alt=""/><span>SWORN</span></a><nav aria-label="Main navigation">{NAV.map(([label,path])=><a key={path} href={`#/${path}`} aria-current={page===path?'page':undefined}>{label}</a>)}</nav><ConnectControl/></div></header>
  <ConnectSheet/>
  {mismatch&&<div className="mismatch" role="alert">CONTRACT MISMATCH / {checkMessage}</div>}
  <main id="main" tabIndex={-1}>
   {page===''?<Landing/>:page==='catalog'?<Catalog/>:page==='explorer'?<Explorer rpc={rpc} query={locationState.query}/>:page==='claim'?<Claim rpc={rpc} verified={!!check&&!mismatch}/>:page==='fact-vs-artifact'?<FactArtifact/>:page==='integrate'?<Integrate check={check}/>:page==='whitelistcurator'?<WhitelistCurator/>:page==='about'?<About/>:<><h1>Page not found</h1><a href="#/">Open Sworn</a></>}
  </main>
  <footer><div className="footer-inner"><div className="footer-top"><span>SWORN / Ethereum mainnet</span><label className="rpc-select"><span>Public RPC</span><select value={rpc} onChange={e=>setRpc(e.target.value)}>{A.publicRpcs.map(u=><option key={u} value={u}>{new URL(u).hostname}</option>)}</select></label></div><p className="source" role="status">{checkMessage}</p>{!check&&<p><button className="secondary" onClick={()=>setRetry(value=>value+1)}>Retry dependency checks</button></p>}<div className="footer-links"><a className="address" href={`${EXPLORER}/address/${A.Registry}`}>{A.Registry}</a><a href={REPO}>Source / MIT</a><a href="https://imd.fun/docs">IMD agents</a></div></div></footer>
 </>;
}

class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<main><h1>Sworn could not render this page</h1><p>Reload to retry. No transaction is sent automatically.</p><button onClick={()=>location.reload()}>Reload site</button></main>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
