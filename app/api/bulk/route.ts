import {database,maintenance,response} from '../../../lib/orchard-db';
import {bulkPOST} from '../../../lib/orchard-bulk';
export const dynamic='force-dynamic';
export async function POST(req:Request){if(maintenance())return response({error:'กำลังปรับปรุงระบบ กรุณารอสักครู่'},503);return bulkPOST(req,database(req))}
