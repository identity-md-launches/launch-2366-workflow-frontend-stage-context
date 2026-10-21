import test from 'node:test';
import assert from 'node:assert/strict';
import {type Address,type Hex} from 'viem';
import {A,SYNTHETIC} from '../src/config';
import {quoteExactImd,poolId,slippageMaximum,swapCalldata} from '../src/swap';
import {assertWallet,send,type Provider,type Wallet} from '../src/wallet';
import type {Reader} from '../src/chain';

function quoteReader(manager:string=A.PoolManager,input=101n){
 const state={simulated:0};
 const client={readContract:async()=>manager,simulateContract:async()=>{state.simulated++;return {result:[input,180000n]};},getBlockNumber:async()=>26239042n} as unknown as Reader;
 return {client,state};
}
test('an exact-output quote checks both router managers before simulating the market',async()=>{
 const bad=quoteReader(A.Registry);await assert.rejects(quoteExactImd(bad.client,10n),/PoolManager mismatch/);assert.equal(bad.state.simulated,0);
 const good=quoteReader();const result=await quoteExactImd(good.client,100000000000000000n);
 assert.equal(result.amountOut,100000000000000000n);assert.equal(result.amountIn,101n);assert.equal(result.maxInput,103n);assert.equal(result.block,26239042n);assert.equal(result.poolId,poolId);
});
test('invalid or unavailable exact-output quotes never produce a payment route',async()=>{
 const reader=quoteReader();for(const amount of [0n,-1n,2n**128n])await assert.rejects(quoteExactImd(reader.client,amount),/Invalid exact IMD output/);assert.equal(reader.state.simulated,0);
 const zero=quoteReader(A.PoolManager,0n);await assert.rejects(quoteExactImd(zero.client,10n),/No exact-output quote/);
});
test('a future or wrong-market quote is refused and maximum input rounds upwards',()=>{
 const now=1700000000000;const quote={amountOut:10n,amountIn:100n,maxInput:101n,quotedAt:now,block:1n,poolId};
 assert.throws(()=>swapCalldata(quote,SYNTHETIC,now-1),/expired/);
 assert.throws(()=>swapCalldata({...quote,poolId:('0x'+'ab'.repeat(32)) as Hex},SYNTHETIC,now),/changed/);
 assert.equal(slippageMaximum(1n),2n);assert.equal(slippageMaximum(100n),101n);assert.equal(slippageMaximum(101n),103n);
});
test('wallet invalidation during account checks prevents opening a send prompt',async()=>{
 const controller=new AbortController();let sent=0;
 const provider:Provider={request:async({method})=>{if(method==='eth_chainId')return '0x1';if(method==='eth_accounts'){controller.abort();return [SYNTHETIC];}sent++;throw Error('Unexpected send');}};
 const wallet:Wallet={account:SYNTHETIC,chainId:1,epoch:1,provider,signal:controller.signal};
 await assert.rejects(send(wallet,{to:A.Registry as Address,data:'0x'}),/Wallet session changed/);assert.equal(sent,0);
});
test('sending uses the verified account and exact native value and gas',async()=>{
 const transactions:unknown[]=[];const hash=('0x'+'12'.repeat(32)) as Hex;
 const provider:Provider={request:async({method,params})=>{if(method==='eth_chainId')return '0x1';if(method==='eth_accounts')return [SYNTHETIC];if(method==='eth_sendTransaction'){transactions.push(params);return hash;}throw Error(method);}};
 const wallet:Wallet={account:SYNTHETIC,chainId:1,epoch:1,provider};await assertWallet(wallet);
 assert.equal(await send(wallet,{to:A.Registry as Address,data:'0x1234',value:101n,gas:200000n}),hash);
 assert.deepEqual(transactions,[[{from:SYNTHETIC,to:A.Registry,data:'0x1234',value:'0x65',gas:'0x30d40'}]]);
});
