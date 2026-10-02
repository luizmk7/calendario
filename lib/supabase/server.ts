import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {supabaseConfig} from './config';
export class AuthRequired extends Error {}
export async function authorizedClient() {
  const {url,key}=supabaseConfig();
  const cookieStore=await cookies();
  const supabase=createServerClient(url,key,{
    cookies:{getAll:()=>cookieStore.getAll(),setAll(values){for(const {name,value,options} of values)cookieStore.set(name,value,options)}}
  });
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)throw new AuthRequired('Entre na sua conta para acessar o calendário.');
  return {supabase,user};
}
