import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  LayoutGrid,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { Brand } from "@/components/brand";
export default function Home() {
  return (
    <>
      <div className="container">
        <header className="public-nav">
          <Brand />
          <nav className="nav-links">
            <a className="desktop" href="#fonctionnalites">
              Fonctionnalités
            </a>
            <Link href="/connexion" className="button outline">
              Se connecter
            </Link>
            <Link href="/inscription" className="button primary">
              Créer mon espace
            </Link>
          </nav>
        </header>
        <main>
          <section className="hero">
            <div>
              <span className="eyebrow">
                <MapPin size={15} /> Pensé pour les copropriétés au Maroc
              </span>
              <h1>
                Votre copropriété,
                <br />
                <span>en toute transparence.</span>
              </h1>
              <p>
                Un espace commun pour organiser vos résidences, structurer vos
                lots et garder une vision claire de votre patrimoine.
              </p>
              <div className="actions">
                <Link href="/inscription" className="button primary">
                  Créer mon espace <ArrowRight size={18} />
                </Link>
                <a href="#fonctionnalites" className="button outline">
                  Découvrir la plateforme
                </a>
              </div>
              <p className="small" style={{ marginTop: 20 }}>
                Première version · Organisation, résidences et lots
              </p>
            </div>
            <div
              className="hero-scene"
              aria-label="Illustration de la structure d’une copropriété"
            >
              <span className="eyebrow" style={{ color: "#93bbff" }}>
                Tout commence par une bonne organisation
              </span>
              <h2>
                Un lieu. Une communauté.
                <br />
                Une gestion plus claire.
              </h2>
              <div className="scene-icon">
                <Building2 />
                <Building2 />
                <Building2 />
              </div>
              <div className="scene-line">
                <span>Votre organisation</span>
                <ShieldCheck size={20} />
              </div>
              <div className="scene-line">
                <span>Vos résidences</span>
                <Building2 size={20} />
              </div>
              <div className="scene-line">
                <span>Vos lots</span>
                <LayoutGrid size={20} />
              </div>
              <p className="small" style={{ marginTop: 20, marginBottom: 0 }}>
                Illustration de l’organisation de votre espace
              </p>
            </div>
          </section>
          <section className="section" id="fonctionnalites">
            <div className="section-title">
              <span className="eyebrow">Une base solide, au quotidien</span>
              <h2>
                Moins de dispersion.
                <br />
                Plus de visibilité.
              </h2>
            </div>
            <div className="grid3">
              {[
                [
                  Building2,
                  "Toutes vos résidences",
                  "Centralisez les noms, adresses et villes de vos copropriétés.",
                ],
                [
                  LayoutGrid,
                  "Des lots bien organisés",
                  "Répertoriez appartements, commerces et parkings avec leurs quotes-parts.",
                ],
                [
                  ShieldCheck,
                  "Un espace protégé",
                  "Les accès sont contrôlés au niveau de la base de données pour chaque organisation.",
                ],
              ].map(([Icon, title, description]) => {
                const I = Icon as typeof Building2;
                return (
                  <article className="card" key={String(title)}>
                    <I size={26} />
                    <h3 style={{ marginTop: 20 }}>{String(title)}</h3>
                    <p>{String(description)}</p>
                  </article>
                );
              })}
            </div>
          </section>
          <section className="section">
            <h2>Avant de commencer</h2>
            <details>
              <summary>Quelles fonctionnalités sont disponibles ?</summary>
              <p>
                Inscription, connexion, création d’organisations, de résidences
                et de lots. Invitations de résidents, annonces de résidence et
                suivi administratif des abonnements après activation des modules.
                Les finances et incidents seront développés aux prochains jalons.
              </p>
            </details>
            <details>
              <summary>Y a-t-il un abonnement payant ?</summary>
              <p>
                Aucun paiement ni abonnement n’est activé dans cette version.
                Les offres commerciales et l’essai seront ajoutés avec la
                facturation.
              </p>
            </details>
            <details>
              <summary>Puis-je gérer plusieurs résidences ?</summary>
              <p>
                Oui. Chaque résidence appartient à une organisation, avec ses
                propres lots.
              </p>
            </details>
          </section>
        </main>
        <footer className="footer">
          SyndiConnect · Votre copropriété, en toute transparence. · Version
          pilote — documents juridiques à finaliser avant ouverture commerciale.
        </footer>
      </div>
    </>
  );
}
