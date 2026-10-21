import dependencies from '../dependencies.json';
import { isAddress, keccak256, toHex, parseAbi, stringToHex, type Address, type Abi } from 'viem';

export type Deployment = {
 version:1; launchId:string; chainId:number; sourceCommit:string; attestationHash:string;
 contracts:{name:string;address:Address;abiHash:string;abiPath:string}[];
 assets:{path:string;sha256:string}[];
 poolKey?:{currency0:Address;currency1:Address;fee:number;tickSpacing:number;hooks:Address};
 network:{chainId:number;name:string;rpcUrls:string[];explorer:string;nativeCurrency:{name:string;symbol:string;decimals:number}};
 walletAddChain?:{chainId:string;chainName:string;rpcUrls:string[];nativeCurrency:{name:string;symbol:string;decimals:number};blockExplorerUrls:string[]};
};
export let deployment:Deployment;
export let A:typeof dependencies & {Registry:Address;Composer:Address;Renderer:Address;chainId:number;publicRpcs:string[]};
export let registryAbi:Abi, rendererAbi:Abi, composerAbi:Abi;
export let REPO:string, LAUNCH:string, EXPLORER:string;
export const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical((value as Record<string,unknown>)[key])])):value;
export const abiHash=(abi:Abi)=>keccak256(toHex(JSON.stringify(canonical(abi)))).slice(2);
export const validAssetPath=(path:unknown):path is string=>typeof path==='string'&&path.length>0&&!path.startsWith('/')&&!path.includes('..')&&!path.includes(':')&&!path.includes('\\')&&!path.includes('?')&&!path.includes('#');
export function configureRuntime(config:Deployment, abis:Record<string,Abi>){
 if(config.version!==1||config.chainId!==config.network.chainId||config.chainId!==1)throw Error('Deployment network mismatch.');
 if(config.contracts.length!==3||new Set(config.contracts.map(c=>c.name)).size!==3||config.contracts.some(c=>!['Registry','Renderer','Composer'].includes(c.name)))throw Error('Unexpected deployment contract set.');
 if(!config.network.rpcUrls.length||config.network.rpcUrls.some(url=>!url.startsWith('https://')))throw Error('Deployment public RPC configuration is invalid.');
 const contract=(name:string)=>{const c=config.contracts.find(c=>c.name===name);if(!c||!isAddress(c.address)||/^0x0{40}$/i.test(c.address)||!validAssetPath(c.abiPath)||!/^[a-f0-9]{64}$/.test(c.abiHash)||!Array.isArray(abis[name])||abiHash(abis[name])!==c.abiHash)throw Error(`${name} ABI differs from the attested deployment.`);return c.address;};
 A={...dependencies,Registry:contract('Registry'),Composer:contract('Composer'),Renderer:contract('Renderer'),chainId:config.chainId,publicRpcs:config.network.rpcUrls};
 registryAbi=abis.Registry;rendererAbi=abis.Renderer;composerAbi=abis.Composer;deployment=config;
 REPO='https://github.com/identity-md-launches/launch-2362-renderer-composer-registry';LAUNCH='./data/launch-record.json';EXPLORER=config.network.explorer;
}
export async function loadRuntime(){
 const root=new URL('./',document.baseURI);
 async function json(path:string){if(!validAssetPath(path))throw Error('Invalid deployment asset path.');const r=await fetch(new URL(path,root),{cache:'no-cache'});if(!r.ok)throw Error(`Unable to load ${path}. Reload to retry.`);return r.json();}
 const config=await json('imd-deployment.json') as Deployment;
 const abis=Object.fromEntries(await Promise.all(config.contracts.map(async c=>[c.name,await json(c.abiPath)])));
 configureRuntime(config,abis);
}
export const address = (key: keyof typeof A) => A[key] as Address;
export const curatorAbi = parseAbi([
  'function firstHourOf(address) view returns (uint256 hour,bool hasJoined)',
  'function txCountOf(address) view returns (uint256)',
  'function contributedBy(address) view returns (uint256)',
  'function pointsOf(address) view returns (uint256)',
]);
export const erc20Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'event Transfer(address indexed from,address indexed to,uint256 value)',
]);

export const SYNTHETIC = '0x000000000000000000000000000000000000c1a1' as Address;
export const CONTRIBUTORS = [
  {name:'First contributor',address:'0x200e710acaa6a93bbc77146026328c40f1d60fb1'},
  {name:'Contributor 1,000',address:'0x3730ce983bcde8a76c00e5fafea7b2f89feb10b0'},
  {name:'Last contributor',address:'0x2e96662e64ed947a9656fb586b2a3596ea8ba6c2'},
] as const;
export const ACTION = stringToHex('oracle.request@oracle-1',{size:32});
