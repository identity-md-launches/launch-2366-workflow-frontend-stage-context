import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {encodeFunctionData,decodeFunctionData,type Abi} from 'viem';
import {A,registryAbi,deployment,abiHash,configureRuntime,type Deployment} from '../src/config';
import {CATALOG} from '../src/catalog';
import {newJournal,validateIntent} from '../src/flow';
import {OPEN_IN} from '../src/open-in';
const json=(path:string)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));

test('deployed contract set, canonical implementation ABIs and network match the attested handoff',()=>{
 const handoff=json('../deployment-handoff.json');const network=json('../network.json');
 assert.deepEqual(deployment.network,network.network);assert.deepEqual(deployment.walletAddChain,network.walletAddChain);
 for(const key of ['launchId','chainId','sourceCommit','attestationHash'])assert.equal((deployment as unknown as Record<string,unknown>)[key],handoff[key]);
 assert.deepEqual(deployment.contracts.map(({name,address,abiHash})=>({name,address,abiHash})),handoff.contracts.map(({name,address,abiHash}:{name:string;address:string;abiHash:string})=>({name,address,abiHash})));
 for(const c of deployment.contracts){const source=json(`../../docs/abi/${c.name}.json`);assert.equal(abiHash(source),c.abiHash);assert.deepEqual(source,json(`../src/abi/${c.name}.json`));assert.deepEqual(source,json(`../public/${c.abiPath}`));}
});
test('a mismatched ABI cannot initialize the runtime configuration',()=>{
 const abis=Object.fromEntries(deployment.contracts.map(c=>[c.name,json(`../public/${c.abiPath}`)]));
 assert.throws(()=>configureRuntime(deployment,{...abis,Registry:[]} as Record<string,Abi>),/ABI differs/);
 configureRuntime(deployment,abis);
});
test('paid request and registration selectors pin maxPrice and expectedId',()=>{
 const cap=500000000000000000n;const data=encodeFunctionData({abi:registryAbi,functionName:'upgrade',args:[[601],cap]});
 assert.deepEqual(decodeFunctionData({abi:registryAbi,data}).args,[[601],cap]);
 const spec=registryAbi.find(x=>x.type==='function'&&x.name==='registerSpec');assert(spec?.type==='function');assert.equal(spec.inputs[1].name,'expectedId');
});
test('downloaded integration examples use this deployment Registry',()=>{
 const registry=deployment.contracts.find(c=>c.name==='Registry')!.address;
 for(const file of ['SwornGate.sol','read-registry.sh']){
  const source=readFileSync(new URL(`../public/examples/${file}`,import.meta.url),'utf8');
  assert(source.toLowerCase().includes(registry.toLowerCase()));
  assert(!source.toLowerCase().includes('0xdd0017e40f1a5fe514d15d108ce01eb52f2a5edb'));
 }
});
test('Swarmed is a panel fact with a living request window',()=>{
 const trait=CATALOG.find(t=>t.id===601)!;assert.equal(trait.name,'Swarmed');assert.equal(trait.evidence,'panel');assert(trait.window.includes('64'));
});
test('About records both earlier deployments and the verified current deployment date',()=>{
 const pages=readFileSync(new URL('../src/pages.tsx',import.meta.url),'utf8'),evidence=json('../../docs/deployment-verification.json');
 assert(pages.includes('Registry 0x39bec764…95a6, swarm launch #2147, 2026-10-18'));
 assert(pages.includes('Registry 0xdd0017e4…5edb, swarm launch #2341, 2026-10-20'));
 assert(pages.includes(`This registry replaced both on ${evidence.deploymentDate}.`));
 assert.equal((pages.match(/39bec764/gi)??[]).length,1);
 assert.equal((pages.match(/dd0017e4/gi)??[]).length,1);
});
test('shipped card SVGs have no token-id text and match the live-render evidence',()=>{
 const evidence=json('../../docs/renderer-assets.json');
 for(const a of evidence.assets){const svg=readFileSync(new URL(`../../${a.file}`,import.meta.url),'utf8');assert(!/<text\b[^>]*>[^<]*#\d+/i.test(svg));assert.equal(createHash('sha256').update(svg).digest('hex'),a.sha256);}
 assert.equal(evidence.assets.length,27);
});
test('phone wallet links retain the complete page URL and hash',()=>{
 const url='https://sworn.example/ipfs/path/#/claim?trait=701';for(const link of OPEN_IN){const href=link.href(url);assert(href.startsWith('https://'));assert(decodeURIComponent(href).includes(url)||decodeURIComponent(href).includes(url.replace('https://','')));}
});
