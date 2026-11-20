"use client";
import { useEffect, useState } from "react";
import { Check, Copy, Mail, MessageCircle, MessageSquare, Send, Share2, Camera, ThumbsUp, ExternalLink } from "lucide-react";
import { I18nText, translate, useLocale } from "@/components/i18n";
export function ShareLink({ url, residence }: { url: string; residence?: string }) {
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [hint, setHint] = useState("");
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  const intro = residence
    ? `${translate("Rejoignez la résidence", locale)} ${residence} ${translate("sur SyndiConnect :", locale)}`
    : translate("Rejoignez votre résidence sur SyndiConnect :", locale);
  const message = `${intro} ${url}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedMessage = encodeURIComponent(message);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return true;
    } catch {
      return false;
    }
  }
  async function nativeShare() {
    try {
      await navigator.share({ title: "SyndiConnect", text: intro, url });
    } catch {
      /* The person closed the share sheet. */
    }
  }
  async function instagram() {
    // Instagram has no web link for sharing: copy the link, then open Instagram to paste it in a message.
    await copy();
    setHint(translate("Lien copié : collez-le dans votre message Instagram.", locale));
    window.open("https://www.instagram.com/direct/inbox/", "_blank", "noopener,noreferrer");
  }
  const apps = [
    { name: "WhatsApp", href: `https://wa.me/?text=${encodedMessage}`, icon: MessageCircle, color: "#25d366" },
    { name: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(intro)}`, icon: Send, color: "#229ed9" },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, icon: ThumbsUp, color: "#1877f2" },
    { name: "Messenger", href: `fb-messenger://share/?link=${encodedUrl}`, icon: MessageCircle, color: "#0084ff" },
    { name: "SMS", href: `sms:?&body=${encodedMessage}`, icon: MessageSquare, color: "#4b5563" },
    { name: "E-mail", href: `mailto:?subject=${encodeURIComponent("SyndiConnect")}&body=${encodedMessage}`, icon: Mail, color: "#0f766e" },
  ];
  return (
    <div className="share-box">
      <div className="share-url">
        <input readOnly value={url} aria-label={translate("Lien d’invitation", locale)} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="button primary" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <I18nText text={copied ? "Lien copié" : "Copier"} />
        </button>
      </div>
      {canShare && (
        <button type="button" className="button primary share-native" onClick={nativeShare}>
          <Share2 size={17} />
          <I18nText text="Partager via une application…" />
        </button>
      )}
      <p className="small share-label">
        <I18nText text="Partager sur :" />
      </p>
      <div className="share-apps">
        {apps.map(({ name, href, icon: Icon, color }) => (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="share-app" style={{ ["--app" as string]: color }}>
            <Icon size={18} />
            <span>{name === "E-mail" ? <I18nText text="E-mail" /> : name}</span>
          </a>
        ))}
        <button type="button" className="share-app" style={{ ["--app" as string]: "#d62976" }} onClick={instagram}>
          <Camera size={18} />
          <span>Instagram</span>
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="share-app" style={{ ["--app" as string]: "#147d63" }}>
          <ExternalLink size={18} />
          <span>
            <I18nText text="Ouvrir" />
          </span>
        </a>
      </div>
      {hint && (
        <p className="small" role="status">
          {hint}
        </p>
      )}
    </div>
  );
}
