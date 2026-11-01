"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-shell">
      <div className="card">
        <h1>Une interruption temporaire</h1>
        <p>Vérifiez la configuration Supabase et réessayez.</p>
        <button className="button primary" onClick={reset}>
          Réessayer
        </button>
      </div>
    </main>
  );
}
