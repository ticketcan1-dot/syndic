-- Automatic restriction: when a syndic subscription (trial included) is over, the syndic loses management
-- rights and the residents of that space lose access, until a payment is validated.
begin;
create function public.syndic_org_active(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.syndic_subscription_records s where s.organization_id=target and s.status in ('active','trialing') and s.ends_at>now());
$$;
create or replace function public.syndic_manages_residence(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.syndic_residences r join public.syndic_organization_members m on m.organization_id=r.organization_id
  where r.id=target and m.user_id=auth.uid() and m.role in ('admin','manager') and public.syndic_org_active(r.organization_id));
$$;
create or replace function public.syndic_can_access_unit(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.syndic_units u join public.syndic_residences r on r.id=u.residence_id where u.id=target and public.syndic_org_active(r.organization_id)
  and (public.syndic_manages_residence(u.residence_id) or exists(select 1 from public.syndic_resident_access a where a.unit_id=u.id and a.user_id=auth.uid() and a.revoked_at is null)));
$$;
create or replace function public.syndic_can_access_residence(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.syndic_residences r where r.id=target and public.syndic_org_active(r.organization_id))
  and (public.syndic_manages_residence(target) or exists(select 1 from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id where u.residence_id=target and a.user_id=auth.uid() and a.revoked_at is null));
$$;
create or replace function public.syndic_my_resident_space() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('units',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'label',u.label,'residence',r.name,'residence_id',r.id,'city',r.city)) from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id join public.syndic_residences r on r.id=u.residence_id where a.user_id=auth.uid() and a.revoked_at is null and public.syndic_org_active(r.organization_id)),'[]'::jsonb),
 'posts',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'body',p.body,'created_at',p.created_at,'residence_id',p.residence_id) order by p.created_at desc) from public.syndic_residence_posts p join public.syndic_residences r on r.id=p.residence_id where public.syndic_org_active(r.organization_id) and exists(select 1 from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id where a.user_id=auth.uid() and a.revoked_at is null and u.residence_id=p.residence_id)),'[]'::jsonb));
$$;
drop policy syndic_posts_read on public.syndic_residence_posts;
create policy syndic_posts_read on public.syndic_residence_posts for select to authenticated using(public.syndic_can_access_residence(residence_id));
drop policy syndic_residence_create on public.syndic_residences;
create policy syndic_residence_create on public.syndic_residences for insert to authenticated with check(public.syndic_org_active(organization_id) and exists(select 1 from public.syndic_organization_members m where m.organization_id=syndic_residences.organization_id and m.user_id=(select auth.uid()) and m.role in ('admin','manager')));
drop policy syndic_unit_create on public.syndic_units;
create policy syndic_unit_create on public.syndic_units for insert to authenticated with check(public.syndic_manages_residence(residence_id));
-- Spaces the caller belongs to (as syndic or resident) whose subscription is over.
create function public.syndic_my_suspended_spaces() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(distinct r.name),'[]'::jsonb) from public.syndic_residences r
 where not public.syndic_org_active(r.organization_id) and (
  exists(select 1 from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id where u.residence_id=r.id and a.user_id=auth.uid() and a.revoked_at is null)
  or exists(select 1 from public.syndic_organization_members m where m.organization_id=r.organization_id and m.user_id=auth.uid()));
$$;
-- Syndic accounts created by the admin also start with the one-month free trial.
create or replace function public.syndic_provision_organization(account_id uuid,organization_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare oid uuid;
begin
 insert into public.syndic_organizations(name,created_by) values(trim(organization_name),account_id) returning id into oid;
 insert into public.syndic_organization_members(organization_id,user_id,role) values(oid,account_id,'admin');
 insert into public.syndic_subscription_records(organization_id,plan,status,ends_at,note,updated_by)
 values(oid,'essai','trialing',now()+interval '1 month','Essai gratuit d''un mois (compte créé par l''administrateur)',account_id);
 return oid;
end;$$;
revoke all on function public.syndic_org_active(uuid),public.syndic_my_suspended_spaces() from public,anon;
grant execute on function public.syndic_org_active(uuid),public.syndic_my_suspended_spaces() to authenticated;
commit;
