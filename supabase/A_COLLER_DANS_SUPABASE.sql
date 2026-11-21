-- DEJA APPLIQUE sur la base le 21/11/2026 : ne pas relancer.
-- Pièces jointes des dépenses.
-- Attachments (invoices, quotes, photos…) on expenses created by the syndic.
-- Files live in the private bucket "syndic-expense-files"; anyone who can see the expense can see them.
begin;
create table public.syndic_expense_attachments (
 id uuid primary key default gen_random_uuid(),
 expense_id uuid not null references public.syndic_expense_entries(id),
 file_path text not null unique check(char_length(file_path) between 5 and 300),
 file_name text not null check(char_length(trim(file_name)) between 1 and 200),
 mime_type text not null check(char_length(mime_type)<=120),
 size_bytes bigint not null check(size_bytes>0 and size_bytes<=10485760),
 uploaded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index syndic_expense_attachments_expense_idx on public.syndic_expense_attachments(expense_id,created_at);
alter table public.syndic_expense_attachments enable row level security;
revoke all on public.syndic_expense_attachments from anon,authenticated;
grant select on public.syndic_expense_attachments to authenticated;
-- Visible when the expense itself is visible (manager, or resident with a share of it).
create policy syndic_expense_attachment_read on public.syndic_expense_attachments for select to authenticated
 using(exists(select 1 from public.syndic_expense_entries e where e.id=expense_id));

create function public.syndic_can_manage_expense(target_expense uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.syndic_expense_entries e where e.id=target_expense and public.syndic_manages_residence(e.residence_id));
$$;
create function public.syndic_add_expense_attachment(target_expense uuid,path text,original_name text,mime text,bytes bigint) returns uuid
language plpgsql security definer set search_path='' as $$
declare aid uuid;
begin
 if not public.syndic_can_manage_expense(target_expense) then raise exception 'Forbidden'; end if;
 if path is null or left(path,char_length(target_expense::text)+1)<>target_expense::text||'/' then raise exception 'Invalid path'; end if;
 if (select count(*) from public.syndic_expense_attachments where expense_id=target_expense)>=20 then raise exception 'Too many attachments'; end if;
 insert into public.syndic_expense_attachments(expense_id,file_path,file_name,mime_type,size_bytes,uploaded_by)
 values(target_expense,path,left(trim(original_name),200),left(coalesce(mime,'application/octet-stream'),120),bytes,auth.uid()) returning id into aid;
 return aid;
end;$$;
create function public.syndic_remove_expense_attachment(target uuid) returns text
language plpgsql security definer set search_path='' as $$
declare a public.syndic_expense_attachments;
begin
 select * into a from public.syndic_expense_attachments where id=target;
 if not found or not public.syndic_can_manage_expense(a.expense_id) then raise exception 'Forbidden'; end if;
 delete from public.syndic_expense_attachments where id=target;
 return a.file_path;
end;$$;
revoke all on function public.syndic_can_manage_expense(uuid),public.syndic_add_expense_attachment(uuid,text,text,text,bigint),public.syndic_remove_expense_attachment(uuid) from public,anon;
grant execute on function public.syndic_can_manage_expense(uuid),public.syndic_add_expense_attachment(uuid,text,text,text,bigint),public.syndic_remove_expense_attachment(uuid) to authenticated;

do $$ begin
 if exists(select 1 from pg_namespace where nspname='storage') then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('syndic-expense-files','syndic-expense-files',false,10485760,array['application/pdf','image/png','image/jpeg','image/webp','image/gif','image/heic',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
   'application/msword','application/vnd.ms-excel'])
  on conflict(id) do nothing;
 end if;
end $$;
commit;
