import { redirect } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  redirect(
    "/connexion?message=Les%20comptes%20sont%20créés%20par%20votre%20administrateur%20ou%20votre%20syndic.",
  );
}
