import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const syndic = "11111111-1111-4111-8111-111111111111",
  sara = "22222222-2222-4222-8222-222222222222",
  admin = "33333333-3333-4333-8333-333333333333",
  omar = "44444444-4444-4444-8444-444444444444",
  outsider = "55555555-5555-4555-8555-555555555555";
let residence: string;
type Item = { id: string; body: string; author: string; is_syndic: boolean; replies: Item[]; poll: null | { id: string; counts: number[]; voters: number; mine: number[] } };
async function as(id: string) {
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`);
}
async function one<T>(sql: string, args: unknown[] = []) {
  return (await db.query<{ r: T }>(sql, args)).rows[0]?.r;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to authenticated,anon,service_role; grant execute on function auth.uid() to authenticated,anon,service_role; insert into auth.users(id,email,email_confirmed_at) values('${syndic}','karim@x.com',now()),('${sara}','sara@x.com',now()),('${admin}','a@x.com',now()),('${omar}','omar@x.com',now()),('${outsider}','out@x.com',now());`,
  );
  for (const f of ["202611010001_syndic_foundations", "202611010002_admin_residents", "202611010003_operations", "202611020001_private_registration", "202611080001_support_and_accounts", "202611080002_join_links", "202611110001_signup_billing", "202611110002_subscription_enforcement", "202611120001_admin_overview", "202611120002_residence_members", "202611200001_payment_claims", "202611200002_residence_channel"])
    await db.exec(readFileSync("supabase/migrations/" + f + ".sql", "utf8"));
  await db.query("insert into public.syndic_platform_admins values($1)", [admin]);
  await as(syndic);
  await db.query("select public.syndic_request_syndic_account('Atlas','essai','Karim','0611223344')");
  await as(admin);
  const org = await one<string>("select public.syndic_admin_decide_account($1,true) r", [syndic]);
  await as(syndic);
  residence = (await one<string>("insert into public.syndic_residences(organization_id,name,address,city) values($1,'Atlas','Rue 1','Rabat') returning id r", [org]))!;
  const link = await one<string>("select public.syndic_create_residence_link($1) r", [residence]);
  for (const [u, n] of [[sara, "Sara A"], [omar, "Omar B"]]) {
    await as(u);
    await db.query("select public.syndic_join_residence($1,$2,'','')", [link, n]);
    await as(syndic);
    await db.query("select public.syndic_decide_member($1,$2,true)", [residence, u]);
  }
}, 60000);
afterAll(async () => {
  await db.close();
});
it("members post and reply in threads; outsiders cannot read or write", async () => {
  await as(syndic);
  const root = await one<string>("select public.syndic_channel_post($1,null,'Coupure d''eau demain',null) r", [residence]);
  await as(sara);
  await db.query("select public.syndic_channel_post($1,$2,'Merci pour l''info',null)", [residence, root]);
  const reply = await one<string>("select id r from public.syndic_channel_messages where parent_id is not null");
  await expect(db.query("select public.syndic_channel_post($1,$2,'Réponse à une réponse',null)", [residence, reply])).rejects.toThrow();
  const feed = await one<Item[]>("select public.syndic_channel_feed($1) r", [residence]);
  expect(feed).toHaveLength(1);
  expect(feed[0].is_syndic).toBe(true);
  expect(feed[0].replies[0].author).toBe("Sara A");
  await as(outsider);
  await expect(db.query("select public.syndic_channel_feed($1)", [residence])).rejects.toThrow();
  await expect(db.query("select public.syndic_channel_post($1,null,'Spam',null)", [residence])).rejects.toThrow();
  expect((await db.query("select * from public.syndic_channel_messages")).rows).toHaveLength(0);
});
it("the syndic controls who may write, share photos and create polls", async () => {
  await as(sara);
  await expect(db.query("select public.syndic_channel_create_poll($1,'Peinture ?',$2,false)", [residence, ["Bleu", "Vert"]])).rejects.toThrow();
  await expect(db.query("select public.syndic_channel_post($1,null,'',$2)", [residence, "autre/photo.png"])).rejects.toThrow();
  await db.query("select public.syndic_channel_post($1,null,'Photo du hall',$2)", [residence, residence + "/hall.png"]);
  await as(omar);
  await expect(db.query("select public.syndic_set_member_permissions($1,$2,false,false,false)", [residence, sara])).rejects.toThrow();
  await as(syndic);
  await db.query("select public.syndic_set_member_permissions($1,$2,false,false,false)", [residence, omar]);
  await db.query("select public.syndic_set_member_permissions($1,$2,true,false,true)", [residence, sara]);
  await as(omar);
  expect((await one<{ can_read: boolean; can_post: boolean }>("select public.syndic_channel_permissions($1) r", [residence])).can_post).toBe(false);
  await expect(db.query("select public.syndic_channel_post($1,null,'Bonjour',null)", [residence])).rejects.toThrow();
  expect((await one<Item[]>("select public.syndic_channel_feed($1) r", [residence])).length).toBeGreaterThan(0);
  await as(sara);
  await expect(db.query("select public.syndic_channel_post($1,null,'x',$2)", [residence, residence + "/b.png"])).rejects.toThrow();
  const pollMsg = await one<string>("select public.syndic_channel_create_poll($1,'Couleur du hall ?',$2,false) r", [residence, ["Bleu", "Vert", " "]]);
  const poll = (await one<Item[]>("select public.syndic_channel_feed($1) r", [residence])).find((i) => i.id === pollMsg)!.poll!.id;
  await db.query("select public.syndic_channel_vote($1,$2)", [poll, [1]]);
  await expect(db.query("select public.syndic_channel_vote($1,$2)", [poll, [0, 1]])).rejects.toThrow();
  await as(omar);
  await db.query("select public.syndic_channel_vote($1,$2)", [poll, [1]]);
  await db.query("select public.syndic_channel_vote($1,$2)", [poll, [0]]);
  const item = (await one<Item[]>("select public.syndic_channel_feed($1) r", [residence])).find((i) => i.id === pollMsg)!;
  expect(item.poll!.counts).toEqual([1, 1]);
  expect(item.poll!.voters).toBe(2);
  expect(item.poll!.mine).toEqual([0]);
  await as(syndic);
  await db.query("select public.syndic_channel_close_poll($1)", [poll]);
  await as(omar);
  await expect(db.query("select public.syndic_channel_vote($1,$2)", [poll, [1]])).rejects.toThrow();
});
it("authors and the syndic can delete messages", async () => {
  await as(sara);
  const own = await one<string>("select public.syndic_channel_post($1,null,'Message à effacer',null) r", [residence]);
  await as(omar);
  await expect(db.query("select public.syndic_channel_delete($1)", [own])).rejects.toThrow();
  await as(sara);
  await db.query("select public.syndic_channel_delete($1)", [own]);
  expect((await one<Item[]>("select public.syndic_channel_feed($1) r", [residence])).some((i) => i.id === own)).toBe(false);
});
