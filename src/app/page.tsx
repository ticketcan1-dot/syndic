import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page(){const db=await supabase();const {data:{user}}=await db.auth.getUser();redirect(user?'/operations':'/connexion');}
