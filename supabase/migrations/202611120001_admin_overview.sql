-- Structured read-only overview for platform administrators.
begin;
create function public.syndic_admin_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.syndic_is_platform_admin() then raise exception 'Forbidden'; end if;
 return jsonb_build_object(
 'syndics',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'created_at',o.created_at,
   'email',au.email,'owner',trim(coalesce(au.raw_user_meta_data->>'first_name','')||' '||coalesce(au.raw_user_meta_data->>'last_name','')),
   'phone',coalesce(au.raw_user_meta_data->>'phone',''),
   'plan',s.plan,'status',s.status,'ends_at',s.ends_at,'active',public.syndic_org_active(o.id),
   'residences',(select count(*) from public.syndic_residences r where r.organization_id=o.id),
   'units',(select count(*) from public.syndic_units u join public.syndic_residences r on r.id=u.residence_id where r.organization_id=o.id),
   'residents',(select count(distinct a.user_id) from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id join public.syndic_residences r on r.id=u.residence_id where r.organization_id=o.id and a.revoked_at is null))
   order by o.created_at desc)
  from public.syndic_organizations o left join public.syndic_subscription_records s on s.organization_id=o.id left join auth.users au on au.id=o.created_by),'[]'::jsonb),
 'residences',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'city',r.city,'address',r.address,'syndic',o.name,
   'units',(select count(*) from public.syndic_units u where u.residence_id=r.id),
   'residents',(select count(distinct a.user_id) from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id where u.residence_id=r.id and a.revoked_at is null))
   order by o.name,r.name)
  from public.syndic_residences r join public.syndic_organizations o on o.id=r.organization_id),'[]'::jsonb),
 'residents',coalesce((select jsonb_agg(jsonb_build_object('email',au.email,
   'name',trim(coalesce(au.raw_user_meta_data->>'first_name','')||' '||coalesce(au.raw_user_meta_data->>'last_name','')),
   'phone',coalesce(au.raw_user_meta_data->>'phone',''),'unit',u.label,'residence',r.name,'syndic',o.name,
   'state',case when a.blocked_at is not null then 'blocked' when a.revoked_at is not null then 'revoked' else 'active' end,'since',a.created_at)
   order by o.name,r.name,u.label)
  from public.syndic_resident_access a join public.syndic_units u on u.id=a.unit_id join public.syndic_residences r on r.id=u.residence_id
  join public.syndic_organizations o on o.id=r.organization_id join auth.users au on au.id=a.user_id),'[]'::jsonb));
end;$$;
revoke all on function public.syndic_admin_overview() from public,anon;
grant execute on function public.syndic_admin_overview() to authenticated;
commit;
