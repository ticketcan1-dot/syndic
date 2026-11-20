import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const syndic = "11111111-1111-4111-8111-111111111111",
  sara = "22222222-2222-4222-8222-222222222222",
  admin = "33333333-3333-4333-8333-333333333333",
  omar = "44444444-4444-4444-8444-444444444444";
let residence: string, chargeSara: string, chargeOmar: string;
async function as(id: string) {
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`);
}
async function one<T>(sql: string, args: unknown[] = []) {
  return (await db.query<{ r: T }>(sql, args)).rows[0]?.r;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to authenticated,anon,service_role; grant execute on function auth.uid() to authenticated,anon,service_role; insert into auth.users(id,email,email_confirmed_at) values('${syndic}','s@x.com',now()),('${sara}','sara@x.com',now()),('${admin}','a@x.com',now()),('${omar}','omar@x.com',now());`,
  );
  for (const f of ["202611010001_syndic_foundations", "202611010002_admin_residents", "202611010003_operations", "202611020001_private_registration", "202611080001_support_and_accounts", "202611080002_join_links", "202611110001_signup_billing", "202611110002_subscription_enforcement", "202611120001_admin_overview", "202611120002_residence_members", "202611200001_payment_claims"])
    await db.exec(readFileSync("supabase/migrations/" + f + ".sql", "utf8"));
  await db.query("insert into public.syndic_platform_admins values($1)", [admin]);
  await as(syndic);
  await db.query("select public.syndic_request_syndic_account('Atlas','essai','Karim B','0611223344')");
  await as(admin);
  const org = await one<string>("select public.syndic_admin_decide_account($1,true) r", [syndic]);
  await as(syndic);
  residence = (await one<string>("insert into public.syndic_residences(organization_id,name,address,city) values($1,'Atlas','Rue 1','Rabat') returning id r", [org]))!;
  const link = await one<string>("select public.syndic_create_residence_link($1) r", [residence]);
  for (const [u, apt] of [[sara, "A1"], [omar, "A2"]]) {
    await as(u);
    await db.query("select public.syndic_join_residence($1,'Nom','',$2)", [link, apt]);
    await as(syndic);
    await db.query("select public.syndic_decide_member($1,$2,true)", [residence, u]);
  }
  const units = (await db.query<{ id: string; label: string }>("select id,label from public.syndic_units order by label")).rows;
  await db.query("select public.syndic_create_expense($1,'Nettoyage',20000,'2030-01-01',$2)", [residence, units.map((u) => u.id)]);
  const charges = (await db.query<{ id: string; unit_id: string }>("select id,unit_id from public.syndic_charge_entries")).rows;
  chargeSara = charges.find((c) => c.unit_id === units[0].id)!.id;
  chargeOmar = charges.find((c) => c.unit_id === units[1].id)!.id;
}, 60000);
afterAll(async () => {
  await db.close();
});
it("a resident declares a payment and the syndic confirms it", async () => {
  await as(sara);
  await expect(db.query("select public.syndic_claim_payment($1,5000,current_date,'virement','VIR1','')", [chargeOmar])).rejects.toThrow();
  await expect(db.query("select public.syndic_claim_payment($1,999999,current_date,'virement','VIR1','')", [chargeSara])).rejects.toThrow();
  const claim = await one<string>("select public.syndic_claim_payment($1,10000,current_date,'virement','VIR1','Payé en ligne') r", [chargeSara]);
  expect((await db.query("select * from public.syndic_payment_entries")).rows).toHaveLength(0);
  await expect(db.query("select public.syndic_decide_payment_claim($1,true,'')", [claim])).rejects.toThrow();
  await as(omar);
  expect((await db.query("select * from public.syndic_payment_claims")).rows).toHaveLength(0);
  await as(syndic);
  expect((await db.query("select * from public.syndic_payment_claims where status='pending'")).rows).toHaveLength(1);
  await db.query("select public.syndic_decide_payment_claim($1,true,'')", [claim]);
  await expect(db.query("select public.syndic_decide_payment_claim($1,true,'')", [claim])).rejects.toThrow();
  const pays = (await db.query<{ amount_cents: string }>("select amount_cents from public.syndic_payment_entries where charge_id=$1", [chargeSara])).rows;
  expect(Number(pays[0].amount_cents)).toBe(10000);
  await as(sara);
  expect((await db.query<{ status: string }>("select status from public.syndic_payment_claims")).rows[0].status).toBe("approved");
  await expect(db.query("select public.syndic_claim_payment($1,1,current_date,'virement','','')", [chargeSara])).rejects.toThrow();
});
it("the syndic can refuse a declared payment", async () => {
  await as(omar);
  const claim = await one<string>("select public.syndic_claim_payment($1,5000,current_date,'especes','','') r", [chargeOmar]);
  await as(syndic);
  await db.query("select public.syndic_decide_payment_claim($1,false,'Non reçu')", [claim]);
  expect((await db.query("select * from public.syndic_payment_entries where charge_id=$1", [chargeOmar])).rows).toHaveLength(0);
  await as(omar);
  expect((await db.query<{ status: string; decision_note: string }>("select status,decision_note from public.syndic_payment_claims")).rows[0]).toEqual({ status: "rejected", decision_note: "Non reçu" });
});
