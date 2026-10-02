import {noStore,IMAGE_BUCKET} from '@/lib/store';
import {authorizedClient,AuthRequired} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{key:string}>}){try{
 const {supabase,user}=await authorizedClient();const {key}=await params;
 if(!/^[0-9a-f-]{36}$/.test(key))return new Response('Inválido',{status:400,headers:noStore});
 const {data,error}=await supabase.storage.from(IMAGE_BUCKET).download(`${user.id}/${key}`);
 if(error||!data)return new Response('Imagem não encontrada',{status:404,headers:noStore});
 return new Response(data,{headers:{...noStore,'Content-Type':data.type||'application/octet-stream','X-Content-Type-Options':'nosniff'}});
}catch(e){console.error('Image download failed',e);return new Response('Imagem indisponível',{status:e instanceof AuthRequired?401:503,headers:noStore});}}
