/** The same closed ABI grammar and named-field checks used by Composer.validateSpec. */
export type SpecFields = {kind:number;item:string;arg:string;fixedArg:string;sumArg:string};
type Parameter={type:string;name:string;indexed:boolean};
const identifier='[A-Za-z_][A-Za-z0-9_]{0,31}';
const scalar='(?:address|bool|string|bytes(?:[1-9]|[12][0-9]|3[0-2])?|u?int(?:8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256))';
const parameter=new RegExp(`^(${scalar}(?:\\[\\])?) (indexed )?(${identifier})$`);
export function eventParameters(item:string):Parameter[] {
 if(item.length>256)throw Error('ABI item must be at most 256 characters.');
 const match=new RegExp(`^event (${identifier})\\((.*)\\)$`).exec(item);
 if(!match)throw Error('Use only an event signature: event Name(type indexed field, type field). Anonymous events and extra text are refused.');
 if(!match[2])return [];
 return match[2].split(', ').map(text=>{
  const p=parameter.exec(text);
  if(!p)throw Error('Each event field needs a supported Solidity type, optional indexed, and a name of at most 32 characters, separated by single spaces. Separate fields with comma and space.');
  return {type:p[1],indexed:!!p[2],name:p[3]};
 });
}
export function validateSpecFields(spec:SpecFields) {
 if(spec.kind===5)return;
 if(spec.kind===4){
  if(!new RegExp(`^function ${identifier}\\(address\\) view returns \\(uint256\\)$`).test(spec.item))throw Error('Use exactly function name(address) view returns (uint256), without extra text. The function name must be at most 32 characters.');
  return;
 }
 const fields=eventParameters(spec.item);
 if(!fields.some(p=>p.name===spec.arg&&p.indexed&&p.type==='address'))throw Error(`${spec.kind===3?'Group-by':'Claimant'} argument “${spec.arg||'(empty)'}” must name an indexed address field in this event. A data field cannot be used as a topic filter.`);
 if(spec.fixedArg&&!fields.some(p=>p.name===spec.fixedArg&&p.indexed))throw Error(`Second filter “${spec.fixedArg}” must name an indexed field in this event. A data field cannot be used as a topic filter.`);
 if([2,3].includes(spec.kind)&&!fields.some(p=>p.name===spec.sumArg))throw Error(`Sum field “${spec.sumArg||'(empty)'}” is not a named field in this event.`);
}
