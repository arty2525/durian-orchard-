import {config,response} from '../../../lib/orchard-db';
export const dynamic='force-dynamic';
export async function GET(){return response(config())}
