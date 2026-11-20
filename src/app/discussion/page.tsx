import Link from "next/link";
import { BarChart3, ImagePlus, Lock, MessageSquareReply, RefreshCw, Trash2 } from "lucide-react";
import { I18nText } from "@/components/i18n";
import { LocalizedInput } from "@/components/i18n-input";
import { Notice } from "@/components/notice";
import { PendingButton, Submit } from "@/components/submit";
import { SuspendedNotice } from "@/components/suspended-notice";
import { signedIn } from "@/lib/access";
import { provisionClient } from "@/lib/provision";
import { intlLocale as getIntlLocale } from "@/lib/locale-server";
import { postMessage, createPoll, vote, closePoll, deleteMessage } from "./actions";
export const dynamic = "force-dynamic";
type Poll = { id: string; question: string; options: string[]; multiple: boolean; closed: boolean; counts: number[]; voters: number; mine: number[] };
type Item = {
  id: string;
  body: string;
  photo_path: string | null;
  created_at: string;
  author: string;
  is_syndic: boolean;
  mine: boolean;
  can_delete: boolean;
  deleted: boolean;
  poll: Poll | null;
  replies: Item[];
};
type Perms = { can_read: boolean; can_post: boolean; can_photo: boolean; can_poll: boolean; can_manage: boolean };
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
export default async function Page({ searchParams }: { searchParams: Promise<{ r?: string; message?: string }> }) {
  const query = await searchParams;
  const locale = await getIntlLocale();
  const { db } = await signedIn();
  const { data: context } = await db.rpc("syndic_operations_context");
  const residences = ((context?.residences ?? []) as { id: string; name: string; can_manage: boolean }[]).sort((a, b) => a.name.localeCompare(b.name));
  const current = residences.find((r) => r.id === query.r) ?? residences[0];
  if (!current)
    return (
      <main className="container section">
        <h1><I18nText text="Discussion de la résidence" /></h1>
        <SuspendedNotice />
        <p><I18nText text="Vous ne faites encore partie d’aucune résidence." /></p>
      </main>
    );
  const [{ data: permsData }, { data: feedData, error }] = await Promise.all([
    db.rpc("syndic_channel_permissions", { target_residence: current.id }),
    db.rpc("syndic_channel_feed", { target_residence: current.id }),
  ]);
  const perms = (permsData ?? {}) as Perms;
  const feed = (feedData ?? []) as Item[];
  const paths = feed.flatMap((i) => [i.photo_path, ...i.replies.map((r) => r.photo_path)]).filter((p): p is string => Boolean(p));
  const photos: Record<string, string> = {};
  if (paths.length) {
    try {
      const { data } = await provisionClient().storage.from("syndic-channel-photos").createSignedUrls(paths, 3600);
      data?.forEach((d) => d.path && d.signedUrl && (photos[d.path] = d.signedUrl));
    } catch {}
  }
  const when = (d: string) =>
    new Date(d).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" });
  const residenceField = <input type="hidden" name="residence" value={current.id} />;
  const Message = ({ item, reply }: { item: Item; reply?: boolean }) => (
    <div className={"chan-msg" + (reply ? " reply" : "")} id={"m-" + item.id}>
      <span className={"chan-avatar" + (item.is_syndic ? " syndic" : "")}>{initials(item.author)}</span>
      <div className="chan-content">
        <div className="chan-meta">
          <strong>{item.author}</strong>
          {item.is_syndic && <span className="chan-badge"><I18nText text="Syndic" /></span>}
          <span className="small">{when(item.created_at)}</span>
          {item.can_delete && !item.deleted && (
            <form action={deleteMessage} className="chan-delete">
              {residenceField}
              <input type="hidden" name="id" value={item.id} />
              <PendingButton className="icon-ghost">
                <Trash2 size={15} />
                <span className="sr-only"><I18nText text="Supprimer" /></span>
              </PendingButton>
            </form>
          )}
        </div>
        {item.deleted ? (
          <p className="chan-deleted"><I18nText text="Message supprimé" /></p>
        ) : (
          <>
            {item.body && !item.poll && <p className="chan-body">{item.body}</p>}
            {item.photo_path && photos[item.photo_path] && (
              <a href={photos[item.photo_path]} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photos[item.photo_path]} alt="" className="chan-photo" loading="lazy" />
              </a>
            )}
            {item.poll && <PollBlock poll={item.poll} messageId={item.id} canClose={item.mine || perms.can_manage} />}
          </>
        )}
      </div>
    </div>
  );
  const PollBlock = ({ poll, messageId, canClose }: { poll: Poll; messageId: string; canClose: boolean }) => {
    const total = poll.counts.reduce((a, b) => a + b, 0);
    const voted = poll.mine.length > 0;
    return (
      <div className="chan-poll">
        <p className="chan-poll-q"><BarChart3 size={16} /> {poll.question}</p>
        {voted || poll.closed ? (
          <div className="chan-poll-results">
            {poll.options.map((o, i) => {
              const pct = total ? Math.round((poll.counts[i] / total) * 100) : 0;
              return (
                <div key={i} className={"chan-poll-bar" + (poll.mine.includes(i) ? " mine" : "")}>
                  <span className="fill" style={{ width: `${pct}%` }} />
                  <span className="label">{o}</span>
                  <span className="pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        ) : null}
        {!poll.closed && (
          <form action={vote} className="chan-poll-form">
            {residenceField}
            <input type="hidden" name="poll" value={poll.id} />
            <input type="hidden" name="message" value={messageId} />
            {!voted &&
              poll.options.map((o, i) => (
                <label key={i} className="chan-poll-option">
                  <input type={poll.multiple ? "checkbox" : "radio"} name="choice" value={i} required={!poll.multiple} /> {o}
                </label>
              ))}
            {voted ? (
              <details>
                <summary className="text-link small"><I18nText text="Changer mon vote" /></summary>
                {poll.options.map((o, i) => (
                  <label key={i} className="chan-poll-option">
                    <input type={poll.multiple ? "checkbox" : "radio"} name="choice" value={i} defaultChecked={poll.mine.includes(i)} /> {o}
                  </label>
                ))}
                <Submit><I18nText text="Voter" /></Submit>
              </details>
            ) : (
              <Submit><I18nText text="Voter" /></Submit>
            )}
          </form>
        )}
        <p className="small chan-poll-foot">
          {poll.voters} <I18nText text="votant(s)" />
          {poll.multiple && <> · <I18nText text="plusieurs choix possibles" /></>}
          {poll.closed && <> · <I18nText text="Sondage clos" /></>}
        </p>
        {!poll.closed && canClose && (
          <form action={closePoll}>
            {residenceField}
            <input type="hidden" name="poll" value={poll.id} />
            <input type="hidden" name="message" value={messageId} />
            <PendingButton className="text-link small chan-link-btn"><I18nText text="Clôturer le sondage" /></PendingButton>
          </form>
        )}
      </div>
    );
  };
  return (
    <main className="container section chan-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow"><I18nText text="Ma résidence" /></span>
          <h1><I18nText text="Discussion" /></h1>
          <p><I18nText text="Le canal de toute la résidence : annonces, échanges, photos et sondages." /></p>
        </div>
        <div className="row-actions">
          <Link href={`/discussion?r=${current.id}`} className="button outline"><RefreshCw size={16} /> <I18nText text="Actualiser" /></Link>
          <Link href="/operations?view=messages" className="button outline"><I18nText text="Messages privés avec le syndic" /></Link>
        </div>
      </div>
      <SuspendedNotice />
      <Notice message={query.message} error={Boolean(error)} />
      {residences.length > 1 && (
        <nav className="space-switcher">
          {residences.map((r) => (
            <Link key={r.id} href={`/discussion?r=${r.id}`} className={r.id === current.id ? "selected" : ""}>{r.name}</Link>
          ))}
        </nav>
      )}
      {perms.can_post ? (
        <section className="card chan-composer">
          <form action={postMessage} className="form">
            {residenceField}
            <textarea name="body" rows={3} maxLength={4000} placeholder="Écrire à toute la résidence…" aria-label="Message" />
            <div className="chan-composer-actions">
              {perms.can_photo && (
                <label className="chan-file">
                  <ImagePlus size={18} /> <I18nText text="Photo" />
                  <input type="file" name="photo" accept="image/png,image/jpeg,image/webp,image/gif" />
                </label>
              )}
              <Submit><I18nText text="Publier" /></Submit>
            </div>
          </form>
          {perms.can_poll && (
            <details className="chan-poll-create">
              <summary className="text-link"><BarChart3 size={16} /> <I18nText text="Lancer un sondage" /></summary>
              <form action={createPoll} className="form">
                {residenceField}
                <label><I18nText text="Question" /><LocalizedInput name="question" minLength={3} maxLength={300} required /></label>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <label key={n}>
                    <span><I18nText text="Réponse" /> {n}{n > 2 && <> (<I18nText text="facultatif" />)</>}</span>
                    <LocalizedInput name="option" maxLength={120} required={n <= 2} />
                  </label>
                ))}
                <label className="checkbox-row"><input type="checkbox" name="multiple" /> <I18nText text="Autoriser plusieurs choix" /></label>
                <Submit><I18nText text="Publier le sondage" /></Submit>
              </form>
            </details>
          )}
        </section>
      ) : (
        <p className="notice chan-locked"><Lock size={15} /> <I18nText text="Le syndic n’a pas activé l’écriture pour votre compte : vous pouvez lire, répondre aux sondages et suivre les échanges." /></p>
      )}
      {!feed.length && <p className="empty"><I18nText text="Aucun message pour le moment. Lancez la conversation !" /></p>}
      <div className="chan-feed">
        {feed.map((item) => (
          <article key={item.id} className="card chan-thread">
            <Message item={item} />
            {item.replies.length > 0 && (
              <div className="chan-replies">
                {item.replies.map((r) => (
                  <Message key={r.id} item={r} reply />
                ))}
              </div>
            )}
            {perms.can_post && !item.deleted && (
              <details className="chan-reply-box">
                <summary className="text-link small"><MessageSquareReply size={15} /> <I18nText text="Répondre" />{item.replies.length > 0 && <> · {item.replies.length} <I18nText text="réponse(s)" /></>}</summary>
                <form action={postMessage} className="form">
                  {residenceField}
                  <input type="hidden" name="parent" value={item.id} />
                  <textarea name="body" rows={2} maxLength={4000} placeholder="Votre réponse…" aria-label="Réponse" />
                  <div className="chan-composer-actions">
                    {perms.can_photo && (
                      <label className="chan-file">
                        <ImagePlus size={16} /> <I18nText text="Photo" />
                        <input type="file" name="photo" accept="image/png,image/jpeg,image/webp,image/gif" />
                      </label>
                    )}
                    <Submit><I18nText text="Répondre" /></Submit>
                  </div>
                </form>
              </details>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
