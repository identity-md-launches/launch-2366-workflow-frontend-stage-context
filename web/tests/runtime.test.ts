import test from 'node:test';
import assert from 'node:assert/strict';
import {type Abi} from 'viem';
import {readFileSync} from 'node:fs';
import {A,configureRuntime,deployment,validAssetPath,type Deployment} from '../src/config';
import {integrity,type Reader} from '../src/chain';
import runtimes from './fixtures/runtime.json';

const abis=Object.fromEntries(deployment.contracts.map(c=>[c.name,JSON.parse(readFileSync(new URL(`../public/${c.abiPath}`,import.meta.url),'utf8')) as Abi]));
test('runtime configuration rejects a different network and unexpected contract names',()=>{
 assert.throws(()=>configureRuntime({...deployment,chainId:11155111} as Deployment,abis),/network mismatch/);
 const contracts=deployment.contracts.map(c=>({...c}));contracts[0].name='Unexpected';
 assert.throws(()=>configureRuntime({...deployment,contracts},abis),/contract set/);
});
test('runtime ABI paths cannot escape the relative export or become remote requests',()=>{
 for(const path of ['../abi/Registry.json','/abi/Registry.json','https://example.com/Registry.json','abi\\Registry.json','abi/Registry.json?url=https://example.com','abi/Registry.json#fragment',''])assert.equal(validAssetPath(path),false,path);
 assert.equal(validAssetPath('abi/Registry.json'),true);
 const contracts=deployment.contracts.map(c=>({...c}));contracts[0].abiPath='../Registry.json';
 assert.throws(()=>configureRuntime({...deployment,contracts},abis),/ABI differs/);
});
function client(overrides:Record<string,unknown>={}):Reader{
 const getters:Record<string,string>={curator:A.WhitelistCurator,imd:A.IMD,intake:A.IntakeV2,attester:A.attester,renderer:A.Renderer,composer:A.Composer,burnExecutor:A.BurnExecutorV2};
 return {transport:{url:'test:runtime-integrity'},getChainId:async()=>A.chainId,getBlockNumber:async()=>26239071n,readContract:async({functionName}:{functionName:string})=>getters[functionName],getCode:async({address}:{address:string})=>{const name=(['Registry','Renderer','Composer'] as const).find(n=>A[n].toLowerCase()===address.toLowerCase());assert(name);return runtimes[name];},...overrides} as unknown as Reader;
}
test('write integrity checks chain identity before using a client',async()=>{
 let read=false;
 await assert.rejects(integrity(client({getChainId:async()=>11155111,readContract:async()=>{read=true;}}),true),/RPC chain differs/);
 assert.equal(read,false);
});
test('empty or altered runtime code keeps transactions disabled',async()=>{
 for(const code of ['0x','0x6000'])await assert.rejects(integrity(client({getCode:async()=>code}),true),/deployed code differs/);
});
test('an immutable dependency mismatch keeps transactions disabled',async()=>{
 await assert.rejects(integrity(client({readContract:async()=>A.Registry}),true),/differs from the configured deployment dependencies/);
});
test('matching deployed code and all immutable getters pass integrity',async()=>{
 const result=await integrity(client(),true);assert.equal(result.block,26239071n);assert.equal(result.getters.renderer,A.Renderer);
});
