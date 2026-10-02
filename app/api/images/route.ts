import {writeAllowed,noStore,IMAGE_LIMIT,IMAGE_BUCKET} from '@/lib/store';
import {authorizedClient,AuthRequired} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{
 writeAllowed(req);const {supabase,user}=await authorizedClient();
 if(Number(req.headers.get('content-length')||0)>IMAGE_LIMIT+100000)return Response.json({error:'A imagem deve ter até 3 MB.'},{status:413,headers:noStore});
 const file=(await req.formData()).get('file');
 if(!(file instanceof File)||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>IMAGE_LIMIT||!file.size)return Response.json({error:'Escolha JPG, PNG, WebP ou GIF de até 3 MB.'},{status:400,headers:noStore});
 const key=crypto.randomUUID();const {error}=await supabase.storage.from(IMAGE_BUCKET).upload(`${user.id}/${key}`,await file.arrayBuffer(),{contentType:file.type,upsert:false});
 if(error)throw error;return Response.json({url:'/api/images/'+key},{headers:noStore});
}catch(e){console.error('Image upload failed',e);return Response.json({error:e instanceof AuthRequired?e.message:'Não foi possível enviar a imagem. Tente novamente.'},{status:e instanceof AuthRequired?401:503,headers:noStore});}}
