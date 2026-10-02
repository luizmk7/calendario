import type {SupabaseClient} from '@supabase/supabase-js';
export const noStore={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','Expires':'0'};
export const IMAGE_LIMIT=3*1024*1024;
export const IMAGE_BUCKET='calendar-images';
export async function readData(supabase:SupabaseClient,userId:string) {
  const {error:initError}=await supabase.rpc('initialize_calendar');
  if(initError)throw initError;
  const companies=await supabase.from('calendar_companies').select('id,name,color,created_at').eq('user_id',userId).order('created_at').order('id');
  if(companies.error)throw companies.error;
  const posts:unknown[]=[];
  for(let offset=0;;offset+=500){
    const page=await supabase.from('calendar_posts').select('id,companyId:company_id,title,date,time,format,notes,image,published').eq('user_id',userId).order('date').order('time').order('id').range(offset,offset+499);
    if(page.error)throw page.error;
    posts.push(...page.data);
    if(page.data.length<500)break;
  }
  return {companies:companies.data,posts};
}
export function writeAllowed(req:Request) {
  const origin=req.headers.get('origin');
  if(origin&&origin!==new URL(req.url).origin)throw new Error('Origem inválida');
  if(req.headers.get('sec-fetch-site')==='cross-site')throw new Error('Origem inválida');
}
