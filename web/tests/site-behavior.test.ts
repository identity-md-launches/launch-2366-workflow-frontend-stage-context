import test from 'node:test';
import assert from 'node:assert/strict';
import {CANNOT_BE_TRUE,READ_FAILED,READING,DISCLAIMER_REASON,plainGuard,upgradeGuard,sharedGuard,type Context} from '../src/eligibility';
import {imd,ethMaximum} from '../src/format';
import {eventParameters,validateSpecFields} from '../src/spec';
const context=(changes:Partial<Context>={}):Context=>({connected:true,chainId:1,failed:false,acknowledged:true,reads:{verifiedIds:[],sharedVerified:false,joined:false,tokenId:0n},...changes});

test('non-contributors cannot prepare curator-only facts but can request Swarmed, ENS and personal community facts',()=>{
 const ctx=context();
 for(const id of [701,801,901,1001,1101,1102,1103,1104,1105,1201])assert.deepEqual(upgradeGuard(ctx,[id]),{ok:false,reason:CANNOT_BE_TRUE});
 assert.deepEqual(sharedGuard(ctx,1201),{ok:false,reason:CANNOT_BE_TRUE});
 for(const id of [601,1301,10001])assert.deepEqual(upgradeGuard(ctx,[id]),{ok:true});
 assert.deepEqual(sharedGuard(ctx,10001),{ok:true});
 assert.deepEqual(upgradeGuard(context({reads:{verifiedIds:[],sharedVerified:false,joined:true}}),[701]),{ok:true});
});
test('failed or loading reads disable all connected actions and recovery enables them without a new connection',()=>{
 for(const guard of [plainGuard,(ctx:Context)=>upgradeGuard(ctx,[601]),sharedGuard]){
  assert.deepEqual(guard(context({failed:true})),{ok:false,reason:READ_FAILED});
  assert.deepEqual(guard(context({loading:true})),{ok:false,reason:READING});
  assert.deepEqual(guard(context({reads:undefined})),{ok:false,reason:READING});
 }
 const recovered=context({reads:{verifiedIds:[],sharedVerified:false,joined:true}});
 assert.deepEqual(plainGuard(recovered),{ok:true});assert.deepEqual(upgradeGuard(recovered,[701]),{ok:true});assert.deepEqual(sharedGuard(recovered),{ok:true});
});
test('the one oracle acknowledgement gates requests while mint/apply remain independent',()=>{
 const ctx=context({acknowledged:false});
 assert.deepEqual(plainGuard(ctx),{ok:true});assert.deepEqual(upgradeGuard(ctx,[601]),{ok:false,reason:DISCLAIMER_REASON});assert.deepEqual(sharedGuard(ctx,10001),{ok:false,reason:DISCLAIMER_REASON});
});
test('IMD display preserves exact values and ETH commitments round up without Number conversion',()=>{
 assert.equal(imd(0n),'0.00');assert.equal(imd(100000000000000000n),'0.10');assert.equal(imd(500000000000000000n),'0.50');assert.equal(imd(1n),'0.000000000000000001');assert.equal(imd(6400000000000000000n),'6.4');
 assert.equal(imd(123456789012345678901234567890n),'123,456,789,012.34567890123456789');
 assert.equal(ethMaximum(0n),'0.000000');assert.equal(ethMaximum(1n),'0.000001');assert.equal(ethMaximum(255000000000000n),'0.000255');assert.equal(ethMaximum(255000000000001n),'0.000256');
});
const event='event Deposited(address indexed contributor, uint256 indexed hour, uint256 amount)';
test('community ABI fields use actual indexed address and filter fields',()=>{
 assert.deepEqual(eventParameters(event).map(field=>field.name),['contributor','hour','amount']);
 validateSpecFields({kind:1,item:event,arg:'contributor',fixedArg:'hour',sumArg:''});validateSpecFields({kind:2,item:event,arg:'contributor',fixedArg:'hour',sumArg:'amount'});validateSpecFields({kind:3,item:event,arg:'contributor',fixedArg:'',sumArg:'amount'});
 assert.throws(()=>validateSpecFields({kind:1,item:event,arg:'amount',fixedArg:'',sumArg:''}),/indexed address/);
 assert.throws(()=>validateSpecFields({kind:1,item:event,arg:'hour',fixedArg:'',sumArg:''}),/indexed address/);
 assert.throws(()=>validateSpecFields({kind:1,item:event,arg:'contributor',fixedArg:'amount',sumArg:''}),/indexed field/);
 assert.throws(()=>validateSpecFields({kind:2,item:event,arg:'contributor',fixedArg:'',sumArg:'missing'}),/not a named field/);
});
test('community ABI items reject prose, anonymous events and unsupported types before RPC',()=>{
 for(const item of [`${event} anonymous`,`${event} then count jobs`,'event X(uint contributor)','event X(tuple contributor)','event X(address[2] contributor)','event X(address indexed contributor,uint256 amount)'])assert.throws(()=>eventParameters(item));
 validateSpecFields({kind:4,item:'function balanceOf(address) view returns (uint256)',arg:'',fixedArg:'',sumArg:''});
 assert.throws(()=>validateSpecFields({kind:4,item:'function balanceOf(address) view returns (uint256) // balance',arg:'',fixedArg:'',sumArg:''}),/without extra text/);
});
