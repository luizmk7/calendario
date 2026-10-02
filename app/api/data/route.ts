import {readData,writeAllowed,noStore} from '@/lib/store';
import {authorizedClient,AuthRequired} from '@/lib/supabase/server';
import {actionSchema} from '@/lib/validation';
import {z} from 'zod';
export const dynamic='force-dynamic';
function failure(e:unknown){console.error('Calendar request failed',e);return Response.json({error:e instanceof AuthRequired?e.message:e instanceof z.ZodError?'Confira os campos da postagem.':'Não foi possível salvar ou carregar. Verifique a configuração do Supabase e tente novamente.'},{status:e instanceof AuthRequired?401:e instanceof z.ZodError?400:503,headers:noStore});}
export async function GET(){try{const {supabase,user}=await authorizedClient();return Response.json(await readData(supabase,user.id),{headers:noStore});}catch(e){return failure(e)}}
export async function POST(req:Request){try{
 writeAllowed(req);if(!req.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Formato inválido'},{status:415,headers:noStore});
 const {supabase,user}=await authorizedClient();const body=actionSchema.parse(await req.json());let error;
 if(body.action==='saveCompany')({error}=await supabase.from('calendar_companies').upsert({...body.company,user_id:user.id},{onConflict:'user_id,id'}));
 else if(body.action==='deleteCompany')({error}=await supabase.from('calendar_companies').delete().eq('user_id',user.id).eq('id',body.id));
 else if(body.action==='savePost'){
  const {companyId,...post}=body.post;
  ({error}=await supabase.from('calendar_posts').upsert({...post,company_id:companyId,user_id:user.id},{onConflict:'user_id,id'}));
 }
 else if(body.action==='deletePost')({error}=await supabase.from('calendar_posts').delete().eq('user_id',user.id).eq('id',body.id));
 else {
  const result=await supabase.from('calendar_posts').update({published:body.published}).eq('user_id',user.id).eq('id',body.id).select('id');
  error=result.error;if(!error&&!result.data?.length)return Response.json({error:'Postagem não encontrada.'},{status:404,headers:noStore});
 }
 if(error)throw error;return Response.json(await readData(supabase,user.id),{headers:noStore});
}catch(e){return failure(e)}}
