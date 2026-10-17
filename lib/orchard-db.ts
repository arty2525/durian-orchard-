import {createClient} from '@supabase/supabase-js';
import {env} from 'cloudflare:workers';
export const config=()=>({url:String((env as any).SUPABASE_URL||''),key:String((env as any).SUPABASE_PUBLISHABLE_KEY||'')});
export function database(req:Request){const c=config();return createClient(c.url,c.key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:req.headers.has('authorization')?{Authorization:req.headers.get('authorization')!}:{}}});}
export function maintenance(){return (env as any).MIGRATION_MODE==='true'}
export {who,records,check,response,fail} from "./orchard-records";
