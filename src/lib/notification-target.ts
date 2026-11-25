// Page to open for a notification, from its title and stored link.
export function notificationTarget(title: string, link: string) {
  const t = title.toLowerCase();
  if (t.startsWith("nouvelle réponse") || t.startsWith("nouveau sondage")) return "/discussion";
  if (t.includes("cotisation") || t.includes("règlement") || t.startsWith("rappel")) return "/operations?view=expenses";
  if (t.includes("réunion")) return "/operations?view=meetings";
  if (t.includes("message")) return "/operations?view=messages";
  if (t.includes("incident")) return "/incidents";
  if (t.includes("paiement") || t.includes("abonnement") || t.includes("compte syndic est approuvé")) return "/abonnement";
  if (link === "/app/abonnement") return "/abonnement";
  if (["/resident", "/operations", "/app/communaute", "/admin"].includes(link)) return link;
  return "/operations?view=notifications";
}
