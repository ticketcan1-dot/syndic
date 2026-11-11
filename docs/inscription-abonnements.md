# Inscription publique, comptes syndic et abonnements

Migration : `supabase/migrations/202611110001_signup_billing.sql` (à appliquer une seule fois, après les précédentes). Elle élargit deux contraintes CHECK (plans, liens de notification), ajoute une colonne `blocked_at` à `syndic_resident_access`, quatre tables (`syndic_account_requests`, `syndic_billing_settings`, `syndic_subscription_payments`, `syndic_join_requests`) et un bucket Storage privé `syndic-payment-proofs`. `SUPABASE_SECRET_KEY` est nécessaire (création des comptes, envoi et affichage des captures).

## Création de compte (`/inscription`)

Prénom, nom, téléphone, e-mail, mot de passe. Le compte normal est actif immédiatement. Si la case « Je suis syndic » est cochée, l’utilisateur indique le nom de son syndic et le plan souhaité ; il est redirigé vers `/en-attente` jusqu’à l’approbation par l’administrateur. Un compte existant peut aussi demander à devenir syndic depuis `/en-attente`.

## Administration (`/admin`)

Accès réservé aux comptes présents dans `syndic_platform_admins`. Un bandeau et un badge 🔔 indiquent les éléments à traiter :

- **Comptes syndic en attente** : Approuver (crée l’organisation, le rôle admin et un essai gratuit d’un mois) ou Refuser.
- **Virements à vérifier** : la capture est affichée (lien signé 1 h). « Valider et prolonger » prolonge l’abonnement du nombre de mois payés à partir de la date de fin actuelle (ou d’aujourd’hui si expiré) et applique le plan choisi ; « Refuser » accepte un motif facultatif. Le syndic est notifié.
- **Coordonnées bancaires (RIB)** : titulaire, banque, RIB, instructions affichés aux syndics.

## Espace syndic

- `/abonnement` : plan actuel, jours restants, date de fin, RIB, envoi d’un paiement (plan Standard 30 DH/mois ou Entreprise sur devis, durée, référence, capture PNG/JPG/WEBP/PDF ≤ 5 Mo), historique. Changer de plan = envoyer un paiement pour le nouveau plan.
- Bandeau « jours restants / expiré » sur toutes les pages `/app`.
- `/app/communaute` : demandes d’adhésion (Approuver / Refuser) et liste des utilisateurs de l’espace (Bloquer / Débloquer / Supprimer).

## Lien d’invitation (`/rejoindre/<lien>`)

Sans compte : création du compte puis demande envoyée. Avec un compte : « Se connecter pour rejoindre » puis « Rejoindre avec mon compte ». Dans les deux cas l’accès au logement n’est ouvert qu’après approbation du syndic.

## Limites

Les comptes créés par `/inscription` sont confirmés sans e-mail (même principe que les liens d’invitation existants) : l’adresse n’est pas vérifiée. Les notifications sont internes au site (aucun e-mail/SMS). 

## Restriction automatique à l’expiration

Migration `202611110002_subscription_enforcement.sql`. Quand l’abonnement d’un syndic (essai compris) est terminé, la base retire automatiquement :

- au syndic : la gestion de ses immeubles (création de résidences/appartements, liens, approbations, annonces, cotisations…). Il est redirigé vers `/abonnement` où il peut toujours payer ;
- aux habitants de ses immeubles : l’accès aux lots, annonces, cotisations, messages et réunions (message « Espace suspendu »).

La validation du virement par l’administrateur rétablit l’accès immédiatement. Les comptes syndic créés par l’administrateur reçoivent aussi l’essai gratuit d’un mois.
