-- DEJA APPLIQUE sur la base le 20/11/2026 : ne pas relancer.
-- Règlement d'une dépense déclaré par l'habitant, confirmé par le syndic.
-- Residents declare that they paid their share of an expense; the syndic confirms (it becomes a recorded
-- payment) or refuses. Additive: one new table and functions; existing payments are unchanged.
begin;
create table public.syndic_payment_claims (
 id uuid primary key default gen_random_uuid(),
 charge_id uuid not null references public.syndic_charge_entries(id),
 amount_cents bigint not null check(amount_cents>0 and amount_cents<=10000000000),
 paid_on date not null,
 method text not null default 'virement' check(method in ('virement','especes','cheque','autre')),
 reference text not null default '' check(char_length(reference)<=160),
 note text not null default '' check(char_length(note)<=500),
 submitted_by uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 decision_note text not null default '' check(char_length(decision_note)<=500),
 payment_id uuid references public.syndic_payment_entries(id),
 created_at timestamptz not null default now(), decided_at timestamptz, decided_by uuid references auth.users(id)
);
create index syndic_payment_claims_charge_idx on public.syndic_payment_claims(charge_id,status);
alter table public.syndic_payment_claims enable row level security;
revoke all on public.syndic_payment_claims from anon,authenticated;
grant select on public.syndic_payment_claims to authenticated;
create policy syndic_payment_claim_read on public.syndic_payment_claims for select to authenticated
 using(exists(select 1 from public.syndic_charge_entries c where c.id=charge_id and public.syndic_can_access_unit(c.unit_id)));

create function public.syndic_claim_payment(target_charge uuid,paid_cents bigint,payment_date date,payment_method text,payment_reference text,claim_note text) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.syndic_charge_entries; remaining bigint; cid uuid; title text;
begin
 select * into c from public.syndic_charge_entries where id=target_charge for update;
 if not found or not public.syndic_can_access_unit(c.unit_id) then raise exception 'Forbidden'; end if;
 select c.amount_cents-coalesce(sum(amount_cents),0) into remaining from public.syndic_payment_entries where charge_id=c.id;
 if paid_cents is null or paid_cents<=0 or paid_cents>remaining then raise exception 'Invalid amount'; end if;
 if payment_date is null or payment_date>current_date then raise exception 'Invalid date'; end if;
 if (select count(*) from public.syndic_payment_claims where charge_id=c.id and status='pending')>=3 then raise exception 'Too many pending claims'; end if;
 insert into public.syndic_payment_claims(charge_id,amount_cents,paid_on,method,reference,note,submitted_by)
 values(c.id,paid_cents,payment_date,coalesce(payment_method,'virement'),trim(coalesce(payment_reference,'')),trim(coalesce(claim_note,'')),auth.uid()) returning id into cid;
 select e.title into title from public.syndic_expense_entries e where e.id=c.expense_id;
 insert into public.syndic_inbox(user_id,unit_id,title,link,dedupe_key)
 select m.user_id,c.unit_id,'Règlement déclaré : '||title,'/operations','claim:'||cid
 from public.syndic_organization_members m join public.syndic_residences r on r.organization_id=m.organization_id join public.syndic_units u on u.residence_id=r.id
 where u.id=c.unit_id and m.role in ('admin','manager') and m.user_id<>auth.uid();
 return cid;
end;$$;

create function public.syndic_decide_payment_claim(target uuid,approve boolean,reason text) returns void
language plpgsql security definer set search_path='' as $$
declare cl public.syndic_payment_claims; c public.syndic_charge_entries; residence uuid; remaining bigint; pid uuid; ref text;
begin
 select * into cl from public.syndic_payment_claims where id=target for update;
 if not found then raise exception 'Unknown claim'; end if;
 select * into c from public.syndic_charge_entries where id=cl.charge_id for update;
 select residence_id into residence from public.syndic_units where id=c.unit_id;
 if not public.syndic_manages_residence(residence) then raise exception 'Forbidden'; end if;
 if cl.status<>'pending' then raise exception 'Already decided'; end if;
 if approve then
  select c.amount_cents-coalesce(sum(amount_cents),0) into remaining from public.syndic_payment_entries where charge_id=c.id;
  if cl.amount_cents>remaining then raise exception 'Amount exceeds the remaining balance'; end if;
  ref:=left(coalesce(nullif(cl.reference,''),'Déclaré par l''habitant'),140)||' #'||left(cl.id::text,8);
  insert into public.syndic_payment_entries(charge_id,amount_cents,reference,paid_on,recorded_by) values(c.id,cl.amount_cents,ref,cl.paid_on,auth.uid()) returning id into pid;
 end if;
 update public.syndic_payment_claims set status=case when approve then 'approved' else 'rejected' end,decision_note=left(trim(coalesce(reason,'')),500),
  payment_id=pid,decided_at=now(),decided_by=auth.uid() where id=target;
 insert into public.syndic_inbox(user_id,unit_id,title,link,dedupe_key)
 values(cl.submitted_by,c.unit_id,case when approve then 'Règlement confirmé par votre syndic' else 'Règlement refusé par votre syndic' end,'/operations','claim-decision:'||cl.id)
 on conflict do nothing;
end;$$;

revoke all on function public.syndic_claim_payment(uuid,bigint,date,text,text,text),public.syndic_decide_payment_claim(uuid,boolean,text) from public,anon;
grant execute on function public.syndic_claim_payment(uuid,bigint,date,text,text,text),public.syndic_decide_payment_claim(uuid,boolean,text) to authenticated;
commit;
