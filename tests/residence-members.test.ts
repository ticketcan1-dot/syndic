import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const syndic = "11111111-1111-4111-8111-111111111111",
  sara = "22222222-2222-4222-8222-222222222222",
  admin = "33333333-3333-4333-8333-333333333333",
  other = "44444444-4444-4444-8444-444444444444",
  legacy = "55555555-5555-4555-8555-555555555555";
let org: string, resA: string, resB: string, linkA: string;
async function as(id: string) {
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`);
}
async function one<T>(sql: string, args: unknown[] = []) {
  return (await db.query<{ r: T }>(sql, args)).rows[0]?.r;
}
type Person = { user_id: string; status: string; name: string; phone: string; apartments: string[]; blocked: boolean; requested_apartment: string };
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to authenticated,anon,service_role; grant execute on function auth.uid() to authenticated,anon,service_role; insert into auth.users(id,email,email_confirmed_at) values('${syndic}','syndic@example.com',now()),('${sara}','sara@example.com',now()),('${admin}','admin@example.com',now()),('${other}','other@example.com',now()),('${legacy}','legacy@example.com',now());`,
  );
  const files = ["202611010001_syndic_foundations", "202611010002_admin_residents", "202611010003_operations", "202611020001_private_registration", "202611080001_support_and_accounts", "202611080002_join_links", "202611110001_signup_billing", "202611110002_subscription_enforcement", "202611120001_admin_overview"];
  for (const f of files) await db.exec(readFileSync("supabase/migrations/" + f + ".sql", "utf8"));
  await db.query("insert into public.syndic_platform_admins values($1)", [admin]);
  await as(syndic);
  await db.query("select public.syndic_request_syndic_account('Atlas Gestion','essai','Karim B','0611223344')");
  await as(admin);
  org = (await one<string>("select public.syndic_admin_decide_account($1,true) r", [syndic]))!;
  await as(syndic);
  resA = (await one<string>("insert into public.syndic_residences(organization_id,name,address,city) values($1,'Residence A','Rue 1','Rabat') returning id r", [org]))!;
  resB = (await one<string>("insert into public.syndic_residences(organization_id,name,address,city) values($1,'Residence B','Rue 2','Rabat') returning id r", [org]))!;
  // A resident created by the previous per-apartment flow, before this migration.
  const unit = await one<string>("insert into public.syndic_units(residence_id,label,kind,share) values($1,'Z9','apartment',1) returning id r", [resA]);
  const link = await one<string>("select public.syndic_create_join_link($1) r", [unit]);
  await as(legacy);
  const req = await one<string>("select public.syndic_request_join($1) r", [link]);
  await as(syndic);
  await db.query("select public.syndic_decide_join_request($1,true)", [req]);
  await db.exec("reset role");
  await db.exec(readFileSync("supabase/migrations/202611120002_residence_members.sql", "utf8"));
}, 60000);
afterAll(async () => {
  await db.close();
});
it("existing residents are migrated as approved members", async () => {
  await as(syndic);
  const people = await one<Person[]>("select public.syndic_residence_people($1) r", [resA]);
  const p = people.find((x) => x.user_id === legacy)!;
  expect(p.status).toBe("approved");
  expect(p.apartments).toEqual(["Z9"]);
});
it("one residence link: residents sign up, the syndic approves and edits apartments", async () => {
  await as(syndic);
  linkA = (await one<string>("select public.syndic_create_residence_link($1) r", [resA]))!;
  await as(other);
  await expect(db.query("select public.syndic_create_residence_link($1)", [resA])).rejects.toThrow();
  await db.exec("reset role; set role anon");
  expect((await one<{ residence: string; syndic: string }>("select public.syndic_residence_link_info($1) r", [linkA])).residence).toBe("Residence A");
  // New account path (service role) with an apartment; existing account path without apartment.
  await db.exec("reset role; set role service_role");
  await db.query("select public.syndic_request_residence_join($1,$2,'Sara Alami','0600000000','A-12')", [linkA, sara]);
  await as(other);
  await db.query("select public.syndic_join_residence($1,'Omar','','')", [linkA]);
  await expect(db.query("select public.syndic_join_residence($1,'Omar','','')", [linkA])).rejects.toThrow();
  expect(await one<boolean>("select public.syndic_can_access_residence($1) r", [resA])).toBe(false);
  await as(sara);
  await expect(db.query("select public.syndic_decide_member($1,$2,true)", [resA, sara])).rejects.toThrow();
  await as(syndic);
  let people = await one<Person[]>("select public.syndic_residence_people($1) r", [resA]);
  expect(people.filter((p) => p.status === "pending")).toHaveLength(2);
  await db.query("select public.syndic_decide_member($1,$2,true)", [resA, sara]);
  await db.query("select public.syndic_decide_member($1,$2,true)", [resA, other]);
  people = await one<Person[]>("select public.syndic_residence_people($1) r", [resA]);
  expect(people.find((p) => p.user_id === sara)!.apartments).toEqual(["A-12"]);
  expect(people.find((p) => p.user_id === other)!.apartments).toEqual([]);
  // Member without apartment still reaches the residence.
  await as(other);
  expect(await one<boolean>("select public.syndic_can_access_residence($1) r", [resA])).toBe(true);
  expect((await one<{ residences: unknown[] }>("select public.syndic_my_resident_space() r")).residences).toHaveLength(1);
  // Syndic edits Sara: new name, two apartments (one new, one kept).
  await as(syndic);
  await db.query("select public.syndic_update_member($1,$2,'Sara A.','0611111111',$3)", [resA, sara, ["A-12", "B-3"]]);
  people = await one<Person[]>("select public.syndic_residence_people($1) r", [resA]);
  const s = people.find((p) => p.user_id === sara)!;
  expect(s.name).toBe("Sara A.");
  expect(s.apartments).toEqual(["A-12", "B-3"]);
  await db.query("select public.syndic_update_member($1,$2,'Sara A.','0611111111',$3)", [resA, sara, ["B-3"]]);
  expect((await one<Person[]>("select public.syndic_residence_people($1) r", [resA])).find((p) => p.user_id === sara)!.apartments).toEqual(["B-3"]);
});
it("the same e-mail can join another residence too", async () => {
  await as(syndic);
  const linkB = await one<string>("select public.syndic_create_residence_link($1) r", [resB]);
  await as(sara);
  await db.query("select public.syndic_join_residence($1,'Sara','','C-1')", [linkB]);
  await as(syndic);
  await db.query("select public.syndic_decide_member($1,$2,true)", [resB, sara]);
  await as(sara);
  const space = await one<{ units: { label: string }[]; residences: unknown[] }>("select public.syndic_my_resident_space() r");
  expect(space.residences).toHaveLength(2);
  expect(space.units.map((u) => u.label).sort()).toEqual(["B-3", "C-1"]);
});
it("block, unblock and remove a member", async () => {
  await as(syndic);
  await db.query("select public.syndic_set_member_blocked($1,$2,true)", [resA, sara]);
  await as(sara);
  expect(await one<boolean>("select public.syndic_can_access_residence($1) r", [resA])).toBe(false);
  expect(await one<boolean>("select public.syndic_can_access_residence($1) r", [resB])).toBe(true);
  await as(syndic);
  await db.query("select public.syndic_set_member_blocked($1,$2,false)", [resA, sara]);
  await as(sara);
  expect(await one<boolean>("select public.syndic_can_access_residence($1) r", [resA])).toBe(true);
  await as(syndic);
  await db.query("select public.syndic_remove_member($1,$2)", [resA, sara]);
  await as(sara);
  expect(await one<boolean>("select public.syndic_can_access_residence($1) r", [resA])).toBe(false);
  const space = await one<{ units: { label: string }[] }>("select public.syndic_my_resident_space() r");
  expect(space.units.map((u) => u.label)).toEqual(["C-1"]);
  await as(admin);
  const o = await one<{ residents: { email: string }[] }>("select public.syndic_admin_overview() r");
  expect(o.residents.some((r) => r.email === "sara@example.com")).toBe(true);
});
