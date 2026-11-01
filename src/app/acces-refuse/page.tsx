import Link from "next/link";
export default function Page() {
  return (
    <main className="auth-shell">
      <section className="card">
        <h1>Accès réservé</h1>
        <p>
          Ce compte ne dispose pas des droits d’administration de la plateforme.
        </p>
        <Link href="/app" className="button primary">
          Revenir à mon espace
        </Link>
      </section>
    </main>
  );
}
