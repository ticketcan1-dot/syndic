-- A COLLER dans Supabase > SQL Editor > New query, puis Run (une seule fois).
-- Invitations par résidence, appartement facultatif, plusieurs appartements par habitant.
-- Residence-level invitations: one reusable link per residence, residents sign up with their own
-- e-mail/password/name and an optional apartment, the syndic approves, then edits their details.
-- A resident may hold several apartments, in one or several residences.
begin;
create table public.syndic_residence_links (
 id uuid primary key default gen_random_uuid(),
 residence_id uuid not null references public.syndic_residences(id),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 days',
 revoked_at timestamptz
);
alter table public.syndic_residence_links enable row level security;
revoke all on public.syndic_residence_links from anon,authenticated;
grant select on public.syndic_residence_links to authenticated;
create policy syndic_residence_link_read on public.syndic_residence_links for select to authenticated using(public.syndic_manages_residence(residence_id));

create table public.syndic_residence_members (
 residence_id uuid not null references public.syndic_residences(id),
 user_id uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 full_name text not null default '' check(char_length(full_name)<=160),
 phone text not null default '' check(char_length(phone)<=24),
 requested_apartment text not null default '' check(char_length(requested_apartment)<=60),
 link_id uuid references public.syndic_residence_links(id),
 blocked_at timestamptz,
 created_at timestamptz not null default now(), decided_at timestamptz, decided_by uuid references auth.users(id),
 primary key(residence_id,user_id)
);
create index syndic_residence_members_user_idx on public.syndic_residence_members(user_id);
alter table public.syndic_residence_members enable row level security;
revoke all on public.syndic_residence_members from anon,authenticated;
grant select on public.syndic_residence_members to authenticated;
create policy syndic_residence_member_read on public.syndic_residence_members for select to authenticated
 using(user_id=auth.uid() or public.syndic_manages_residence(residence_id));

-- Existing residents (apartment access) become approved members of their residence.
insert into public.syndic_residence_members(residence_id,user_id,status,full_name,phone,decided_at)
select distinct on (u.residence_id,a.user_id) u.residence_id,a.user_id,'approved',
 left(trim(coalesce(au.raw_user_meta_data->>'first_name','')||' '||coalesce(au.raw_user_meta_data->>'last_name','')),160),
 left(coalesce(au.raw_user_meta_data->>'phone',''),24),now()
from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id join auth.users au on au.id=a.user_id
where a.revoked_at is null or a.blocked_at is not null
on conflict do nothing;
update public.syndic_residence_members m set blocked_at=now() where exists(
 select 1 from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id
 where u.residence_id=m.residence_id and a.user_id=m.user_id and a.blocked_at is not null)
 and not exists(select 1 from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id
 where u.residence_id=m.residence_id and a.user_id=m.user_id and a.revoked_at is null);

-- Access: approved, non-blocked members reach their residence (announcements, meetings) even without an apartment.
create or replace function public.syndic_can_access_residence(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.syndic_residences r where r.id=target and public.syndic_org_active(r.organization_id))
  and (public.syndic_manages_residence(target)
   or exists(select 1 from public.syndic_residence_members m where m.residence_id=target and m.user_id=auth.uid() and m.status='approved' and m.blocked_at is null)
   or exists(select 1 from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id where u.residence_id=target and a.user_id=auth.uid() and a.revoked_at is null));
$$;
create or replace function public.syndic_my_resident_space() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'units',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'label',u.label,'residence',r.name,'residence_id',r.id,'city',r.city)) from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id join public.syndic_residences r on r.id=u.residence_id where a.user_id=auth.uid() and a.revoked_at is null and public.syndic_org_active(r.organization_id)),'[]'::jsonb),
 'residences',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'city',r.city,'syndic',o.name)) from public.syndic_residence_members m join public.syndic_residences r on r.id=m.residence_id join public.syndic_organizations o on o.id=r.organization_id where m.user_id=auth.uid() and m.status='approved' and m.blocked_at is null and public.syndic_org_active(r.organization_id)),'[]'::jsonb),
 'posts',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'body',p.body,'created_at',p.created_at,'residence_id',p.residence_id) order by p.created_at desc) from public.syndic_residence_posts p where public.syndic_can_access_residence(p.residence_id) and not public.syndic_manages_residence(p.residence_id)),'[]'::jsonb));
$$;
create or replace function public.syndic_my_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'admin',public.syndic_is_platform_admin(),
  'member',exists(select 1 from public.syndic_organization_members where user_id=auth.uid()),
  'resident',exists(select 1 from public.syndic_resident_access where user_id=auth.uid() and revoked_at is null)
   or exists(select 1 from public.syndic_residence_members where user_id=auth.uid() and status='approved' and blocked_at is null),
  'request',(select status from public.syndic_account_requests where user_id=auth.uid()));
$$;
create or replace function public.syndic_my_suspended_spaces() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(distinct r.name),'[]'::jsonb) from public.syndic_residences r
 where not public.syndic_org_active(r.organization_id) and (
  exists(select 1 from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id where u.residence_id=r.id and a.user_id=auth.uid() and a.revoked_at is null)
  or exists(select 1 from public.syndic_residence_members m where m.residence_id=r.id and m.user_id=auth.uid() and m.status='approved' and m.blocked_at is null)
  or exists(select 1 from public.syndic_organization_members m where m.organization_id=r.organization_id and m.user_id=auth.uid()));
$$;

-- Links.
create function public.syndic_create_residence_link(target_residence uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.syndic_manages_residence(target_residence) then raise exception 'Forbidden'; end if;
 if (select count(*) from public.syndic_residence_links where created_by=auth.uid() and created_at>now()-interval '1 hour')>=30 then raise exception 'Too many links'; end if;
 insert into public.syndic_residence_links(residence_id,created_by) values(target_residence,auth.uid()) returning id into result;
 return result;
end;$$;
create function public.syndic_revoke_residence_link(token uuid) returns void language plpgsql security definer set search_path='' as $$
declare residence uuid;
begin
 select residence_id into residence from public.syndic_residence_links where id=token;
 if not public.syndic_manages_residence(residence) then raise exception 'Forbidden'; end if;
 update public.syndic_residence_links set revoked_at=coalesce(revoked_at,now()) where id=token;
end;$$;
-- Public: only the residence and syndic names of a valid link.
create function public.syndic_residence_link_info(token uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('residence',r.name,'city',r.city,'syndic',o.name) from public.syndic_residence_links l
 join public.syndic_residences r on r.id=l.residence_id join public.syndic_organizations o on o.id=r.organization_id
 where l.id=token and l.revoked_at is null and l.expires_at>now() and public.syndic_org_active(r.organization_id);
$$;

-- Join requests (new or existing account).
create function public.syndic_add_member_request(token uuid,account_id uuid,member_name text,member_phone text,apartment text) returns uuid
language plpgsql security definer set search_path='' as $$
declare link public.syndic_residence_links; existing public.syndic_residence_members;
begin
 select * into link from public.syndic_residence_links where id=token;
 if not found or link.revoked_at is not null or link.expires_at<=now() then raise exception 'Invalid invitation'; end if;
 select * into existing from public.syndic_residence_members where residence_id=link.residence_id and user_id=account_id for update;
 if found and existing.status in ('pending','approved') then raise exception 'Already requested'; end if;
 insert into public.syndic_residence_members(residence_id,user_id,full_name,phone,requested_apartment,link_id)
 values(link.residence_id,account_id,left(trim(coalesce(member_name,'')),160),left(trim(coalesce(member_phone,'')),24),left(trim(coalesce(apartment,'')),60),token)
 on conflict(residence_id,user_id) do update set status='pending',full_name=excluded.full_name,phone=excluded.phone,
  requested_apartment=excluded.requested_apartment,link_id=excluded.link_id,created_at=now(),decided_at=null,decided_by=null,blocked_at=null;
 insert into public.syndic_inbox(user_id,title,link,dedupe_key)
 select m.user_id,'Nouvelle demande d''adhésion à valider','/app/communaute','member-request:'||link.residence_id||':'||account_id||':'||now()
 from public.syndic_organization_members m join public.syndic_residences r on r.organization_id=m.organization_id
 where r.id=link.residence_id and m.role in ('admin','manager') on conflict do nothing;
 return link.residence_id;
end;$$;
create function public.syndic_request_residence_join(token uuid,account_id uuid,member_name text,member_phone text,apartment text) returns uuid
language sql security definer set search_path='' as $$ select public.syndic_add_member_request(token,account_id,member_name,member_phone,apartment); $$;
create function public.syndic_join_residence(token uuid,member_name text,member_phone text,apartment text) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 return public.syndic_add_member_request(token,auth.uid(),member_name,member_phone,apartment);
end;$$;

-- Internal: give a member access to an apartment of the residence (created if needed).
create function public.syndic_assign_apartment(target_residence uuid,target_user uuid,apartment text) returns void
language plpgsql security definer set search_path='' as $$
declare unit uuid; mail text; invitation uuid; apt text:=trim(apartment);
begin
 if char_length(apt) not between 1 and 60 then raise exception 'Invalid apartment'; end if;
 select u.id into unit from public.syndic_units u where u.residence_id=target_residence and lower(u.label)=lower(apt) limit 1;
 if unit is null then
  insert into public.syndic_units(residence_id,label,kind,share) values(target_residence,apt,'apartment',1) returning id into unit;
 end if;
 if exists(select 1 from public.syndic_resident_access where unit_id=unit and user_id=target_user and revoked_at is null) then return; end if;
 select lower(email) into mail from auth.users where id=target_user;
 insert into public.syndic_resident_invitations(unit_id,email,invited_by,accepted_at) values(unit,coalesce(mail,'inconnu@invalid'),auth.uid(),now()) returning id into invitation;
 insert into public.syndic_resident_access(unit_id,user_id,invitation_id) values(unit,target_user,invitation)
 on conflict(unit_id,user_id) do update set invitation_id=excluded.invitation_id,revoked_at=null,blocked_at=null;
end;$$;

create function public.syndic_decide_member(target_residence uuid,target_user uuid,approve boolean) returns void
language plpgsql security definer set search_path='' as $$
declare m public.syndic_residence_members;
begin
 if not public.syndic_manages_residence(target_residence) then raise exception 'Forbidden'; end if;
 select * into m from public.syndic_residence_members where residence_id=target_residence and user_id=target_user for update;
 if not found or m.status<>'pending' then raise exception 'No pending request'; end if;
 update public.syndic_residence_members set status=case when approve then 'approved' else 'rejected' end,decided_at=now(),decided_by=auth.uid()
 where residence_id=target_residence and user_id=target_user;
 if approve and m.requested_apartment<>'' then perform public.syndic_assign_apartment(target_residence,target_user,m.requested_apartment); end if;
 insert into public.syndic_inbox(user_id,title,link,dedupe_key)
 values(target_user,case when approve then 'Votre demande d''adhésion est acceptée' else 'Votre demande d''adhésion a été refusée' end,'/resident','member-decision:'||target_residence||':'||target_user||':'||now())
 on conflict do nothing;
end;$$;

-- The syndic edits a member: name, phone and the list of apartments (may be empty).
create function public.syndic_update_member(target_residence uuid,target_user uuid,member_name text,member_phone text,apartments text[]) returns void
language plpgsql security definer set search_path='' as $$
declare m public.syndic_residence_members; apt text; wanted text[];
begin
 if not public.syndic_manages_residence(target_residence) then raise exception 'Forbidden'; end if;
 select * into m from public.syndic_residence_members where residence_id=target_residence and user_id=target_user for update;
 if not found or m.status<>'approved' then raise exception 'Member must be approved'; end if;
 if char_length(trim(coalesce(member_name,'')))>160 or char_length(trim(coalesce(member_phone,'')))>24 then raise exception 'Invalid details'; end if;
 update public.syndic_residence_members set full_name=trim(coalesce(member_name,'')),phone=trim(coalesce(member_phone,'')) where residence_id=target_residence and user_id=target_user;
 select coalesce(array_agg(distinct lower(trim(x))),'{}') into wanted from unnest(coalesce(apartments,'{}')) x where trim(x)<>'';
 if cardinality(wanted)>50 then raise exception 'Too many apartments'; end if;
 -- Remove apartments no longer listed.
 update public.syndic_resident_access a set revoked_at=now() from public.syndic_units u
 where u.id=a.unit_id and u.residence_id=target_residence and a.user_id=target_user and a.revoked_at is null and not (lower(u.label)=any(wanted));
 if m.blocked_at is null then
  foreach apt in array (select coalesce(array_agg(distinct trim(x)),'{}') from unnest(coalesce(apartments,'{}')) x where trim(x)<>'') loop
   perform public.syndic_assign_apartment(target_residence,target_user,apt);
  end loop;
 end if;
end;$$;

create function public.syndic_set_member_blocked(target_residence uuid,target_user uuid,blocked boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.syndic_manages_residence(target_residence) then raise exception 'Forbidden'; end if;
 if blocked then
  update public.syndic_residence_members set blocked_at=now() where residence_id=target_residence and user_id=target_user and status='approved' and blocked_at is null;
  if not found then raise exception 'Nothing to update'; end if;
  update public.syndic_resident_access a set blocked_at=now(),revoked_at=now() from public.syndic_units u
  where u.id=a.unit_id and u.residence_id=target_residence and a.user_id=target_user and a.revoked_at is null;
 else
  update public.syndic_residence_members set blocked_at=null where residence_id=target_residence and user_id=target_user and blocked_at is not null;
  if not found then raise exception 'Nothing to update'; end if;
  update public.syndic_resident_access a set blocked_at=null,revoked_at=null from public.syndic_units u
  where u.id=a.unit_id and u.residence_id=target_residence and a.user_id=target_user and a.blocked_at is not null;
 end if;
end;$$;

create function public.syndic_remove_member(target_residence uuid,target_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.syndic_manages_residence(target_residence) then raise exception 'Forbidden'; end if;
 delete from public.syndic_residence_members where residence_id=target_residence and user_id=target_user;
 if not found then raise exception 'Unknown member'; end if;
 update public.syndic_resident_invitations i set revoked_at=coalesce(i.revoked_at,now()) from public.syndic_resident_access a, public.syndic_units u
 where a.invitation_id=i.id and u.id=a.unit_id and u.residence_id=target_residence and a.user_id=target_user;
 delete from public.syndic_resident_access a using public.syndic_units u where u.id=a.unit_id and u.residence_id=target_residence and a.user_id=target_user;
end;$$;

-- People of one residence for its syndic.
create function public.syndic_residence_people(target_residence uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.syndic_manages_residence(target_residence) then raise exception 'Forbidden'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',au.email,'status',m.status,
  'name',coalesce(nullif(m.full_name,''),trim(coalesce(au.raw_user_meta_data->>'first_name','')||' '||coalesce(au.raw_user_meta_data->>'last_name',''))),
  'phone',coalesce(nullif(m.phone,''),au.raw_user_meta_data->>'phone',''),'requested_apartment',m.requested_apartment,'blocked',m.blocked_at is not null,'created_at',m.created_at,
  'apartments',coalesce((select jsonb_agg(u.label order by u.label) from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id
    where u.residence_id=m.residence_id and a.user_id=m.user_id and (a.revoked_at is null or a.blocked_at is not null)),'[]'::jsonb))
  order by m.status desc,m.created_at)
  from public.syndic_residence_members m join auth.users au on au.id=m.user_id where m.residence_id=target_residence and m.status<>'rejected'),'[]'::jsonb);
end;$$;

-- Resident side: my residence requests.
create or replace function public.syndic_my_join_requests() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x order by x->>'created_at' desc),'[]'::jsonb) from (
  select jsonb_build_object('id',q.id,'status',q.status,'unit',u.label,'residence',r.name,'created_at',q.created_at) x
  from public.syndic_join_requests q join public.syndic_units u on u.id=q.unit_id join public.syndic_residences r on r.id=u.residence_id where q.user_id=auth.uid()
  union all
  select jsonb_build_object('id',m.residence_id,'status',m.status,'unit',m.requested_apartment,'residence',r.name,'created_at',m.created_at)
  from public.syndic_residence_members m join public.syndic_residences r on r.id=m.residence_id where m.user_id=auth.uid()) s;
$$;

-- Admin overview: residents come from residence memberships (with their apartments).
create or replace function public.syndic_admin_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.syndic_is_platform_admin() then raise exception 'Forbidden'; end if;
 return jsonb_build_object(
 'syndics',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'created_at',o.created_at,
   'email',au.email,'owner',trim(coalesce(au.raw_user_meta_data->>'first_name','')||' '||coalesce(au.raw_user_meta_data->>'last_name','')),
   'phone',coalesce(au.raw_user_meta_data->>'phone',''),
   'plan',s.plan,'status',s.status,'ends_at',s.ends_at,'active',public.syndic_org_active(o.id),
   'residences',(select count(*) from public.syndic_residences r where r.organization_id=o.id),
   'units',(select count(*) from public.syndic_units u join public.syndic_residences r on r.id=u.residence_id where r.organization_id=o.id),
   'residents',(select count(distinct m.user_id) from public.syndic_residence_members m join public.syndic_residences r on r.id=m.residence_id where r.organization_id=o.id and m.status='approved' and m.blocked_at is null))
   order by o.created_at desc)
  from public.syndic_organizations o left join public.syndic_subscription_records s on s.organization_id=o.id left join auth.users au on au.id=o.created_by),'[]'::jsonb),
 'residences',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'city',r.city,'address',r.address,'syndic',o.name,
   'units',(select count(*) from public.syndic_units u where u.residence_id=r.id),
   'residents',(select count(*) from public.syndic_residence_members m where m.residence_id=r.id and m.status='approved' and m.blocked_at is null))
   order by o.name,r.name)
  from public.syndic_residences r join public.syndic_organizations o on o.id=r.organization_id),'[]'::jsonb),
 'residents',coalesce((select jsonb_agg(jsonb_build_object('email',au.email,
   'name',coalesce(nullif(m.full_name,''),trim(coalesce(au.raw_user_meta_data->>'first_name','')||' '||coalesce(au.raw_user_meta_data->>'last_name',''))),
   'phone',coalesce(nullif(m.phone,''),au.raw_user_meta_data->>'phone',''),
   'unit',coalesce((select string_agg(u.label,', ' order by u.label) from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id where u.residence_id=r.id and a.user_id=m.user_id and a.revoked_at is null),''),
   'residence',r.name,'syndic',o.name,
   'state',case when m.status='pending' then 'pending' when m.blocked_at is not null then 'blocked' else 'active' end,'since',m.created_at)
   order by o.name,r.name)
  from public.syndic_residence_members m join public.syndic_residences r on r.id=m.residence_id
  join public.syndic_organizations o on o.id=r.organization_id join auth.users au on au.id=m.user_id where m.status<>'rejected'),'[]'::jsonb));
end;$$;

revoke all on function public.syndic_create_residence_link(uuid),public.syndic_revoke_residence_link(uuid),public.syndic_join_residence(uuid,text,text,text),
 public.syndic_decide_member(uuid,uuid,boolean),public.syndic_update_member(uuid,uuid,text,text,text[]),public.syndic_set_member_blocked(uuid,uuid,boolean),
 public.syndic_remove_member(uuid,uuid),public.syndic_residence_people(uuid) from public,anon;
grant execute on function public.syndic_create_residence_link(uuid),public.syndic_revoke_residence_link(uuid),public.syndic_join_residence(uuid,text,text,text),
 public.syndic_decide_member(uuid,uuid,boolean),public.syndic_update_member(uuid,uuid,text,text,text[]),public.syndic_set_member_blocked(uuid,uuid,boolean),
 public.syndic_remove_member(uuid,uuid),public.syndic_residence_people(uuid) to authenticated;
revoke all on function public.syndic_add_member_request(uuid,uuid,text,text,text),public.syndic_assign_apartment(uuid,uuid,text),
 public.syndic_request_residence_join(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.syndic_request_residence_join(uuid,uuid,text,text,text) to service_role;
revoke all on function public.syndic_residence_link_info(uuid) from public;
grant execute on function public.syndic_residence_link_info(uuid) to anon,authenticated,service_role;
commit;
