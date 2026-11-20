-- Residence discussion channel (like a Teams channel): posts, threaded replies, photos and polls.
-- The syndic decides, per resident, who may write, share photos and create polls.
begin;
alter table public.syndic_residence_members
 add column can_post boolean not null default true,
 add column can_photo boolean not null default true,
 add column can_poll boolean not null default false;

create table public.syndic_channel_messages (
 id uuid primary key default gen_random_uuid(),
 residence_id uuid not null references public.syndic_residences(id),
 author_id uuid not null references auth.users(id),
 parent_id uuid references public.syndic_channel_messages(id),
 body text not null default '' check(char_length(body)<=4000),
 photo_path text check(photo_path is null or char_length(photo_path) between 5 and 300),
 created_at timestamptz not null default now(),
 deleted_at timestamptz
);
create index syndic_channel_messages_residence_idx on public.syndic_channel_messages(residence_id,created_at desc);
create index syndic_channel_messages_parent_idx on public.syndic_channel_messages(parent_id);
create table public.syndic_channel_polls (
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null unique references public.syndic_channel_messages(id),
 question text not null check(char_length(trim(question)) between 3 and 300),
 options text[] not null check(cardinality(options) between 2 and 6),
 multiple boolean not null default false,
 closed_at timestamptz
);
create table public.syndic_channel_votes (
 poll_id uuid not null references public.syndic_channel_polls(id),
 user_id uuid not null references auth.users(id),
 option_index integer not null check(option_index between 0 and 5),
 created_at timestamptz not null default now(),
 primary key(poll_id,user_id,option_index)
);
alter table public.syndic_channel_messages enable row level security;
alter table public.syndic_channel_polls enable row level security;
alter table public.syndic_channel_votes enable row level security;
revoke all on public.syndic_channel_messages,public.syndic_channel_polls,public.syndic_channel_votes from anon,authenticated;
grant select on public.syndic_channel_messages to authenticated;
create policy syndic_channel_message_read on public.syndic_channel_messages for select to authenticated using(public.syndic_can_access_residence(residence_id));

-- What the caller may do in a residence channel.
create function public.syndic_channel_permissions(target_residence uuid) returns jsonb language sql stable security definer set search_path='' as $$
 with m as (select * from public.syndic_residence_members where residence_id=target_residence and user_id=auth.uid() and status='approved' and blocked_at is null),
 x as (select public.syndic_can_access_residence(target_residence) can_read, public.syndic_manages_residence(target_residence) can_manage)
 select jsonb_build_object('can_read',x.can_read,'can_manage',x.can_manage,
  'can_post',x.can_read and (x.can_manage or coalesce((select can_post from m),false)),
  'can_photo',x.can_read and (x.can_manage or coalesce((select can_post and can_photo from m),false)),
  'can_poll',x.can_read and (x.can_manage or coalesce((select can_post and can_poll from m),false))) from x;
$$;

create function public.syndic_channel_post(target_residence uuid,parent uuid,message_body text,photo text) returns uuid
language plpgsql security definer set search_path='' as $$
declare perms jsonb:=public.syndic_channel_permissions(target_residence); mid uuid; root public.syndic_channel_messages; preview text;
begin
 if not (perms->>'can_post')::boolean then raise exception 'Not allowed to post'; end if;
 if photo is not null and not (perms->>'can_photo')::boolean then raise exception 'Not allowed to share photos'; end if;
 if photo is not null and left(photo,char_length(target_residence::text)+1)<>target_residence::text||'/' then raise exception 'Invalid photo'; end if;
 if char_length(trim(coalesce(message_body,'')))=0 and photo is null then raise exception 'Empty message'; end if;
 if (select count(*) from public.syndic_channel_messages where author_id=auth.uid() and created_at>now()-interval '1 minute')>=20 then raise exception 'Please wait'; end if;
 if parent is not null then
  select * into root from public.syndic_channel_messages where id=parent;
  if not found or root.residence_id<>target_residence or root.parent_id is not null or root.deleted_at is not null then raise exception 'Invalid thread'; end if;
 end if;
 insert into public.syndic_channel_messages(residence_id,author_id,parent_id,body,photo_path) values(target_residence,auth.uid(),parent,trim(coalesce(message_body,'')),photo) returning id into mid;
 if parent is not null and root.author_id<>auth.uid() then
  preview:=left(coalesce(nullif(root.body,''),'photo'),60);
  insert into public.syndic_inbox(user_id,residence_id,title,link,dedupe_key)
  values(root.author_id,target_residence,'Nouvelle réponse : '||preview,'/operations','reply:'||mid) on conflict do nothing;
 end if;
 return mid;
end;$$;

create function public.syndic_channel_create_poll(target_residence uuid,poll_question text,poll_options text[],allow_multiple boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare perms jsonb:=public.syndic_channel_permissions(target_residence); mid uuid; opts text[];
begin
 if not (perms->>'can_poll')::boolean then raise exception 'Not allowed to create polls'; end if;
 select coalesce(array_agg(trim(o) order by n),'{}') into opts from unnest(poll_options) with ordinality t(o,n) where trim(o)<>'';
 if cardinality(opts) not between 2 and 6 or exists(select 1 from unnest(opts) o where char_length(o)>120) then raise exception 'Between 2 and 6 options'; end if;
 insert into public.syndic_channel_messages(residence_id,author_id,body) values(target_residence,auth.uid(),trim(poll_question)) returning id into mid;
 insert into public.syndic_channel_polls(message_id,question,options,multiple) values(mid,trim(poll_question),opts,coalesce(allow_multiple,false));
 insert into public.syndic_inbox(user_id,residence_id,title,link,dedupe_key)
 select m.user_id,target_residence,'Nouveau sondage : '||left(trim(poll_question),60),'/operations','poll:'||mid
 from public.syndic_residence_members m where m.residence_id=target_residence and m.status='approved' and m.blocked_at is null and m.user_id<>auth.uid() on conflict do nothing;
 return mid;
end;$$;

create function public.syndic_channel_vote(target_poll uuid,choices integer[]) returns void
language plpgsql security definer set search_path='' as $$
declare p public.syndic_channel_polls; residence uuid; n integer;
begin
 select * into p from public.syndic_channel_polls where id=target_poll;
 if not found or p.closed_at is not null then raise exception 'Poll closed'; end if;
 select residence_id into residence from public.syndic_channel_messages where id=p.message_id and deleted_at is null;
 if residence is null or not public.syndic_can_access_residence(residence) then raise exception 'Forbidden'; end if;
 select count(distinct c) into n from unnest(coalesce(choices,'{}')) c;
 if n<1 or (not p.multiple and n>1) or exists(select 1 from unnest(choices) c where c<0 or c>=cardinality(p.options)) then raise exception 'Invalid choice'; end if;
 delete from public.syndic_channel_votes where poll_id=p.id and user_id=auth.uid();
 insert into public.syndic_channel_votes(poll_id,user_id,option_index) select distinct p.id,auth.uid(),c from unnest(choices) c;
end;$$;

create function public.syndic_channel_close_poll(target_poll uuid) returns void
language plpgsql security definer set search_path='' as $$
declare msg public.syndic_channel_messages;
begin
 select m.* into msg from public.syndic_channel_messages m join public.syndic_channel_polls p on p.message_id=m.id where p.id=target_poll;
 if not found or not (msg.author_id=auth.uid() or public.syndic_manages_residence(msg.residence_id)) then raise exception 'Forbidden'; end if;
 update public.syndic_channel_polls set closed_at=coalesce(closed_at,now()) where id=target_poll;
end;$$;

create function public.syndic_channel_delete(target_message uuid) returns text
language plpgsql security definer set search_path='' as $$
declare msg public.syndic_channel_messages;
begin
 select * into msg from public.syndic_channel_messages where id=target_message;
 if not found or not (msg.author_id=auth.uid() or public.syndic_manages_residence(msg.residence_id)) then raise exception 'Forbidden'; end if;
 update public.syndic_channel_messages set deleted_at=coalesce(deleted_at,now()),body='',photo_path=null where id=target_message;
 return msg.photo_path;
end;$$;

create function public.syndic_set_member_permissions(target_residence uuid,target_user uuid,may_post boolean,may_photo boolean,may_poll boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.syndic_manages_residence(target_residence) then raise exception 'Forbidden'; end if;
 update public.syndic_residence_members set can_post=coalesce(may_post,false),can_photo=coalesce(may_photo,false),can_poll=coalesce(may_poll,false)
 where residence_id=target_residence and user_id=target_user;
 if not found then raise exception 'Unknown member'; end if;
end;$$;

-- Channel feed: last 50 threads with replies, authors and polls.
create function public.syndic_channel_feed(target_residence uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare manager boolean:=public.syndic_manages_residence(target_residence);
begin
 if not public.syndic_can_access_residence(target_residence) then raise exception 'Forbidden'; end if;
 return coalesce((select jsonb_agg(public.syndic_channel_item(m.id,manager) order by m.created_at desc)
  from (select id,created_at from public.syndic_channel_messages where residence_id=target_residence and parent_id is null and (deleted_at is null or exists(select 1 from public.syndic_channel_messages r where r.parent_id=syndic_channel_messages.id and r.deleted_at is null)) order by created_at desc limit 50) m),'[]'::jsonb);
end;$$;
create function public.syndic_channel_item(target uuid,viewer_manages boolean) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 return (select jsonb_build_object('id',m.id,'body',m.body,'photo_path',m.photo_path,'created_at',m.created_at,'deleted',m.deleted_at is not null,
  'mine',m.author_id=auth.uid(),'can_delete',m.author_id=auth.uid() or viewer_manages,
  'author',coalesce(nullif(rm.full_name,''),nullif(trim(coalesce(au.raw_user_meta_data->>'first_name','')||' '||coalesce(au.raw_user_meta_data->>'last_name','')),''),split_part(au.email,'@',1)),
  'is_syndic',exists(select 1 from public.syndic_organization_members om join public.syndic_residences r on r.organization_id=om.organization_id where r.id=m.residence_id and om.user_id=m.author_id and om.role in ('admin','manager')),
  'poll',(select jsonb_build_object('id',p.id,'question',p.question,'options',p.options,'multiple',p.multiple,'closed',p.closed_at is not null,
     'counts',(select jsonb_agg((select count(*) from public.syndic_channel_votes v where v.poll_id=p.id and v.option_index=i-1) order by i) from generate_subscripts(p.options,1) i),
     'voters',(select count(distinct user_id) from public.syndic_channel_votes v where v.poll_id=p.id),
     'mine',coalesce((select jsonb_agg(option_index) from public.syndic_channel_votes v where v.poll_id=p.id and v.user_id=auth.uid()),'[]'::jsonb))
   from public.syndic_channel_polls p where p.message_id=m.id),
  'replies',case when m.parent_id is null then coalesce((select jsonb_agg(public.syndic_channel_item(r.id,viewer_manages) order by r.created_at) from public.syndic_channel_messages r where r.parent_id=m.id and r.deleted_at is null),'[]'::jsonb) else '[]'::jsonb end)
 from public.syndic_channel_messages m join auth.users au on au.id=m.author_id
 left join public.syndic_residence_members rm on rm.residence_id=m.residence_id and rm.user_id=m.author_id
 where m.id=target);
end;$$;

revoke all on function public.syndic_channel_permissions(uuid),public.syndic_channel_post(uuid,uuid,text,text),public.syndic_channel_create_poll(uuid,text,text[],boolean),
 public.syndic_channel_vote(uuid,integer[]),public.syndic_channel_close_poll(uuid),public.syndic_channel_delete(uuid),
 public.syndic_set_member_permissions(uuid,uuid,boolean,boolean,boolean),public.syndic_channel_feed(uuid) from public,anon;
grant execute on function public.syndic_channel_permissions(uuid),public.syndic_channel_post(uuid,uuid,text,text),public.syndic_channel_create_poll(uuid,text,text[],boolean),
 public.syndic_channel_vote(uuid,integer[]),public.syndic_channel_close_poll(uuid),public.syndic_channel_delete(uuid),
 public.syndic_set_member_permissions(uuid,uuid,boolean,boolean,boolean),public.syndic_channel_feed(uuid) to authenticated;
revoke all on function public.syndic_channel_item(uuid,boolean) from public,anon,authenticated;

-- Residence people now include channel permissions.
create or replace function public.syndic_residence_people(target_residence uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.syndic_manages_residence(target_residence) then raise exception 'Forbidden'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',au.email,'status',m.status,
  'name',coalesce(nullif(m.full_name,''),trim(coalesce(au.raw_user_meta_data->>'first_name','')||' '||coalesce(au.raw_user_meta_data->>'last_name',''))),
  'phone',coalesce(nullif(m.phone,''),au.raw_user_meta_data->>'phone',''),'requested_apartment',m.requested_apartment,'blocked',m.blocked_at is not null,'created_at',m.created_at,
  'can_post',m.can_post,'can_photo',m.can_photo,'can_poll',m.can_poll,
  'apartments',coalesce((select jsonb_agg(u.label order by u.label) from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id
    where u.residence_id=m.residence_id and a.user_id=m.user_id and (a.revoked_at is null or a.blocked_at is not null)),'[]'::jsonb))
  order by m.status desc,m.created_at)
  from public.syndic_residence_members m join auth.users au on au.id=m.user_id where m.residence_id=target_residence and m.status<>'rejected'),'[]'::jsonb);
end;$$;

do $$ begin
 if exists(select 1 from pg_namespace where nspname='storage') then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('syndic-channel-photos','syndic-channel-photos',false,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
  on conflict(id) do nothing;
 end if;
end $$;
commit;
