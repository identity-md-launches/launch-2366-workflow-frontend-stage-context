import { readFileSync } from 'node:fs';
import { keccak256, toHex } from 'viem';
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
}
const deployment=JSON.parse(readFileSync('deployment-handoff.json','utf8'));
const dependencies=JSON.parse(readFileSync('dependencies.json','utf8'));
const runtime=JSON.parse(readFileSync('tests/fixtures/runtime.json','utf8'));
for(const contract of deployment.contracts){
 for(const path of [`../docs/abi/${contract.name}.json`,`src/abi/${contract.name}.json`,`public/abi/${contract.name}.json`]){
  const abi=JSON.parse(readFileSync(path,'utf8'));
  const actual=keccak256(toHex(JSON.stringify(canonical(abi)))).slice(2);
  if(actual!==contract.abiHash)throw Error(`${path}: ABI hash mismatch`);
 }
 if(!runtime[contract.name]||runtime[contract.name]==='0x'||keccak256(runtime[contract.name])!==dependencies.runtimeHashes[contract.name])throw Error(`${contract.name}: runtime fixture mismatch`);
 console.log(`${contract.name}: attested ABI copies and compiled runtime hash match`);
}
