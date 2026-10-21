// Read-only evidence collection. This script never connects a wallet or signs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createPublicClient,http,keccak256,toHex} from 'viem';
import {mainnet} from 'viem/chains';

const json=path=>JSON.parse(readFileSync(path,'utf8'));
const handoff=json('deployment-handoff.json'),network=json('network.json'),deps=json('dependencies.json'),runtimes=json('tests/fixtures/runtime.json');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
assert(/^[a-f0-9]{40}$/.test(handoff.sourceCommit));
const abis=new Map(),contracts=[];
for(const c of handoff.contracts){
 assert(['Registry','Composer','Renderer'].includes(c.name));
 const path=`docs/abi/${c.name}.json`,source=execFileSync('git',['show',`${handoff.sourceCommit}:${path}`],{cwd:'..'}),local=readFileSync(`../${path}`);
 assert.deepEqual(local,source,`${path} must be the pinned source file`);
 const abi=JSON.parse(source.toString('utf8')),hash=keccak256(toHex(JSON.stringify(canonical(abi)))).slice(2);
 assert.equal(hash,c.abiHash,`${c.name} canonical ABI hash`);abis.set(c.name,abi);
 assert.equal(keccak256(runtimes[c.name]),deps.runtimeHashes[c.name],`${c.name} compiler fixture hash`);
 contracts.push({...c,abiPath:`abi/${c.name}.json`,abiSourcePath:path,abiSourceSha256:createHash('sha256').update(source).digest('hex'),runtimeHash:deps.runtimeHashes[c.name],runtimeBytes:(runtimes[c.name].length-2)/2});
}
let client,endpoint,block;
const unavailable=[];
for(const url of network.network.rpcUrls){
 try{const candidate=createPublicClient({chain:mainnet,transport:http(url,{timeout:15000,retryCount:0})});assert.equal(await candidate.getChainId(),handoff.chainId);block=await candidate.getBlockNumber({cacheTime:0});client=candidate;endpoint=url;break;}
 catch{unavailable.push(url);}
}
assert(client,'No configured RPC could verify the deployment network');
for(const c of contracts){const code=await client.getCode({address:c.address,blockNumber:block});assert(code&&code!=='0x',`${c.name} must have code`);assert.equal(code,runtimes[c.name],`${c.name} live code must match pinned compiler fixture`);c.compiledRuntimeMatches=true;c.nonemptyCode=true;}
const registry=contracts.find(c=>c.name==='Registry');
const expected={curator:deps.WhitelistCurator,imd:deps.IMD,intake:deps.IntakeV2,attester:deps.attester,renderer:contracts.find(c=>c.name==='Renderer').address,composer:contracts.find(c=>c.name==='Composer').address,burnExecutor:deps.BurnExecutorV2};
const getters={};
for(const [name,value] of Object.entries(expected)){const actual=await client.readContract({address:registry.address,abi:abis.get('Registry'),functionName:name,blockNumber:block});assert.equal(actual.toLowerCase(),value.toLowerCase(),`${name} getter`);getters[name]=actual;}
const deployedBlock=await client.getBlock({blockNumber:BigInt(registry.blockNumber)});
const evidence={checkedAt:new Date().toISOString(),sourceCommit:handoff.sourceCommit,attestationHash:handoff.attestationHash,chainId:handoff.chainId,source:endpoint,checkedBlock:String(block),compiler:'solc 0.8.24, optimizer 200, cancun, bytecode_hash none, cbor_metadata false',contracts,getters,deploymentDate:new Date(Number(deployedBlock.timestamp)*1000).toISOString().slice(0,10),deploymentBlockHash:deployedBlock.hash,previewStorage:{mapping:'claimantOf',slot:15,derivation:'forge inspect src/Registry.sol:Registry storage-layout --json --offline --use /tmp/sworn-solc-v0.8.24 --out test/scratch/solidity-out --cache-path test/scratch/solidity-cache; solc 0.8.24 at pinned source'},...(unavailable.length?{unavailableRpcEndpoints:unavailable}:{})};
writeFileSync('../docs/deployment-verification.json',JSON.stringify(evidence,null,2)+'\n');
console.log(`PASS: chain ${handoff.chainId}, pinned-source ABIs, three exact compiled runtimes and seven immutable dependency getters at block ${block}.`);
