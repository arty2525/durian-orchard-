// Unchecked HTML checkboxes are absent from FormData. Send false explicitly
// so editing a plan can clear its stored is_planned flag.
export function careFormData(form:FormData):Record<string,unknown>{
 const data:Record<string,unknown>=Object.fromEntries(form.entries());
 delete data.file;
 data.isPlanned=form.get('isPlanned')==='on';
 data.trees=String(form.get('treeIds')||'').split(/[\s,]+/).filter(Boolean).map(id=>id.toUpperCase());
 return data;
}
