const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
function read(path){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,FormData});return exports;}
const {careFormData}=read('app/care-form.ts'),{clean}=read('lib/orchard-validation.ts');
const form=new FormData();form.set('date','2026-10-23');form.set('kind','fertilizer');form.set('scope','trees');form.set('treeIds','d0001, D0002');form.set('name','test');
const rows=[{id:'D0001',type:'tree'},{id:'D0002',type:'tree'}];
// Editing an existing plan: an unchecked checkbox is missing, not 'false'.
assert(!form.has('isPlanned'));let data=careFormData(form);assert(Object.hasOwn(data,'isPlanned'));assert.equal(data.isPlanned,false);
let saved=clean('care',data,rows);assert.equal(saved.isPlanned,false);assert.equal(saved.date,'2026-10-23');assert.equal(saved.targets.length,2);
// Selecting planned must still preserve an unfinished plan.
form.set('isPlanned','on');saved=clean('care',careFormData(form),rows);assert.equal(saved.isPlanned,true);
// Changing only its date must not silently turn a plan into actual work.
form.set('date','2026-10-22');saved=clean('care',careFormData(form),rows);assert.equal(saved.isPlanned,true);
form.delete('isPlanned');saved=clean('care',careFormData(form),rows);assert.equal(saved.isPlanned,false);assert.equal(saved.date,'2026-10-22');
console.log('PASS: unchecked plan sends explicit false through validation; actual date and targets retained; checked plan and date-only edits stay planned. No production writes.');
