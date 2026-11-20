"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Link2, Mail, MessageSquare, MoreHorizontal, Printer, QrCode, Send, Share2, X as Close } from "lucide-react";
import QRCode from "qrcode";
import { I18nText, translate, useLocale } from "@/components/i18n";
import { BrandIcon } from "@/components/brand-icons";
// Moroccan numbers typed locally (06…, 07…) become international (2126…, 2127…).
function whatsappNumber(raw: string) {
  let digits = raw.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (/^0[5-7]\d{8}$/.test(digits)) digits = "212" + digits.slice(1);
  return /^\d{8,15}$/.test(digits) ? digits : "";
}
export function ShareLink({ url, residence }: { url: string; residence?: string }) {
  const locale = useLocale();
  const t = (text: string) => translate(text, locale);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [hint, setHint] = useState("");
  const [phone, setPhone] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
    setMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
  }, []);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const intro = residence
    ? `${t("Rejoignez la résidence")} ${residence} ${t("sur SyndiConnect :")}`
    : t("Rejoignez votre résidence sur SyndiConnect :");
  const message = `${intro} ${url}`;
  const u = encodeURIComponent(url);
  const m = encodeURIComponent(message);
  async function copy(note?: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setHint(note ?? t("Lien copié"));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setHint(t("Copie impossible : sélectionnez le lien et copiez-le."));
    }
  }
  async function showQr() {
    if (qr) return setQr(null);
    try {
      setQr(await QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M", color: { dark: "#123e34", light: "#ffffff" } }));
    } catch {
      setHint(t("QR code indisponible."));
    }
  }
  function printQr() {
    if (!qr) return;
    const win = window.open("", "_blank", "width=600,height=760");
    if (!win) return;
    const doc = win.document;
    doc.title = "QR code";
    const box = doc.createElement("div");
    box.style.cssText = "font-family:system-ui,sans-serif;text-align:center;padding:40px";
    const h = doc.createElement("h1");
    h.textContent = residence ?? "SyndiConnect";
    const p = doc.createElement("p");
    p.textContent = t("Scannez ce code pour rejoindre la résidence sur SyndiConnect.");
    const img = doc.createElement("img");
    img.src = qr;
    img.style.cssText = "width:340px;height:340px";
    const small = doc.createElement("p");
    small.textContent = url;
    small.style.cssText = "font-size:12px;color:#555;word-break:break-all";
    box.append(h, p, img, small);
    doc.body.append(box);
    img.onload = () => win.print();
  }
  function go(href: string) {
    window.open(href, "_blank", "noopener,noreferrer");
  }
  async function nativeShare() {
    try {
      await navigator.share({ title: "SyndiConnect", text: intro, url });
    } catch {
      /* Share sheet closed. */
    }
  }
  const apps: { key: string; label: string; color: string; icon: React.ReactNode; action: () => void }[] = [
    { key: "copy", label: t("Copier le lien"), color: "#475569", icon: copied ? <Check size={24} /> : <Link2 size={24} />, action: () => copy() },
    { key: "qr", label: t("QR code"), color: "#123e34", icon: <QrCode size={24} />, action: showQr },
    { key: "whatsapp", label: "WhatsApp", color: "#25d366", icon: <BrandIcon name="whatsapp" />, action: () => go(`https://wa.me/?text=${m}`) },
    {
      key: "messenger",
      label: "Messenger",
      color: "#0084ff",
      icon: <BrandIcon name="messenger" />,
      action: () =>
        mobile
          ? (window.location.href = `fb-messenger://share/?link=${u}`)
          : (copy(t("Lien copié : collez-le dans la conversation Messenger.")), go("https://www.messenger.com/")),
    },
    { key: "facebook", label: "Facebook", color: "#1877f2", icon: <BrandIcon name="facebook" />, action: () => go(`https://www.facebook.com/sharer/sharer.php?u=${u}`) },
    {
      key: "instagram",
      label: "Instagram",
      color: "#e1306c",
      icon: <BrandIcon name="instagram" />,
      action: () =>
        mobile && canShare
          ? nativeShare()
          : (copy(t("Lien copié : collez-le dans votre message Instagram.")), go("https://www.instagram.com/direct/inbox/")),
    },
    { key: "telegram", label: "Telegram", color: "#26a5e4", icon: <BrandIcon name="telegram" />, action: () => go(`https://t.me/share/url?url=${u}&text=${encodeURIComponent(intro)}`) },
    { key: "email", label: t("E-mail"), color: "#0f766e", icon: <Mail size={24} />, action: () => (window.location.href = `mailto:?subject=${encodeURIComponent("SyndiConnect")}&body=${m}`) },
    { key: "sms", label: "SMS", color: "#16a34a", icon: <MessageSquare size={24} />, action: () => (window.location.href = `sms:?&body=${m}`) },
    { key: "threads", label: "Threads", color: "#000000", icon: <BrandIcon name="threads" />, action: () => go(`https://www.threads.net/intent/post?text=${m}`) },
    { key: "x", label: "X", color: "#000000", icon: <BrandIcon name="x" />, action: () => go(`https://x.com/intent/post?text=${m}`) },
  ];
  if (canShare)
    apps.push({ key: "more", label: t("Plus…"), color: "#334155", icon: <MoreHorizontal size={24} />, action: nativeShare });
  const number = whatsappNumber(phone);
  return (
    <div className="share-box">
      <div className="share-url">
        <input readOnly value={url} aria-label={t("Lien d’invitation")} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="button outline" onClick={() => copy()}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <I18nText text={copied ? "Lien copié" : "Copier"} />
        </button>
      </div>
      <div className="share-buttons">
        <button type="button" className="button primary share-open" onClick={() => setOpen(true)}>
          <Share2 size={17} />
          <I18nText text="Partager le lien" />
        </button>
        <button
          type="button"
          className="button outline"
          onClick={async () => {
            setOpen(true);
            if (!qr) await showQr();
          }}
        >
          <QrCode size={17} />
          <I18nText text="QR code" />
        </button>
      </div>
      {open && (
        <div className="share-overlay" onClick={() => setOpen(false)}>
          <div className="share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={(e) => e.stopPropagation()}>
            <header className="share-head">
              <button ref={closeRef} type="button" className="share-close" onClick={() => setOpen(false)} aria-label={t("Fermer")}>
                <Close size={24} />
              </button>
              <h2 id="share-title">
                <I18nText text="Partager" />
              </h2>
              <span />
            </header>
            <div className="share-body">
              <div className="share-preview">
                <p>{intro}</p>
                <span>{url}</span>
              </div>
              {qr && (
                <div className="share-qr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt={t("QR code du lien d’invitation")} width={220} height={220} />
                  <p className="small">
                    <I18nText text="Les habitants scannent ce code avec l’appareil photo de leur téléphone pour ouvrir le lien." />
                  </p>
                  <div className="row-actions">
                    <a className="button primary" href={qr} download={`qr-${(residence ?? "residence").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`}>
                      <Download size={16} /> <I18nText text="Télécharger" />
                    </a>
                    <button type="button" className="button outline" onClick={printQr}>
                      <Printer size={16} /> <I18nText text="Imprimer" />
                    </button>
                  </div>
                </div>
              )}
              <form
                className="share-direct"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (number) go(`https://wa.me/${number}?text=${m}`);
                }}
              >
                <label htmlFor="share-phone">
                  <BrandIcon name="whatsapp" size={18} />
                  <I18nText text="Envoyer directement à un numéro WhatsApp" />
                </label>
                <div className="share-direct-row">
                  <input
                    id="share-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="06 12 34 56 78"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <button type="submit" className="button whatsapp" disabled={!number}>
                    <Send size={16} />
                    <I18nText text="Envoyer" />
                  </button>
                </div>
              </form>
              {hint && (
                <p className="share-hint" role="status">
                  {hint}
                </p>
              )}
            </div>
            <div className="share-apps-row" role="list">
              {apps.map((app) => (
                <button key={app.key} type="button" role="listitem" className="share-app-round" onClick={app.action}>
                  <span className="share-app-icon" style={{ ["--app" as string]: app.color }}>
                    {app.icon}
                  </span>
                  <span className="share-app-label">{app.label}</span>
                </button>
              ))}
            </div>
            <p className="share-note">
              <I18nText text="Choisissez une application : elle s’ouvre avec le message prêt, il ne reste qu’à choisir la personne et envoyer." />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
