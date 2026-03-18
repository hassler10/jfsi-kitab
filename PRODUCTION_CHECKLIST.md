# JFSI — Production Deployment Complete Checklist

## 🎯 Avant de déployer

### Préparation locale (Sans besoin de Node.js locala)

```bash
# 1. Créer un repository GitHub
git init
git add .
git commit -m "Init: JFSI production ready platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jfsi-final.git
git push -u origin main
```

### Fichiers critiques vérifiés ✅

- [x] `server.js` - Backend Express avec Stripe
- [x] `package.json` - Dépendances + scripts
- [x] `.env.example` - Template configuration
- [x] `data/schema.sql` - DB schema SQLite
- [x] `seed.js` - DB seed avec CLI options
- [x] `render.yaml` - Config auto Render
- [x] `.gitignore` - Protection données sensibles
- [x] `DEPLOYMENT.md` - Guide complet Render
- [x] `README.md` - Documentation complète
- [x] `scripts/build.sh` - Build automation
- [x] `.github/workflows/deploy.yml` - CI/CD (optionnel)

---

## 1️⃣ DÉPLOYER SUR RENDER (5-10 minutes)

### Étape 1: Créer app Render

1. Aller sur [render.com](https://render.com)
2. Sign up / Log in
3. **New** → **Web Service**
4. **Connect a repository** → Sélectionner votre repo GitHub JFSI
5. Configuration auto-détectée ✅

### Étape 2: Variables d'environnement

Dans Render Dashboard → **Settings > Environment**:

#### 🔐 REQUIS - Sécurité

```
NODE_ENV = production
SESSION_SECRET = [Générer aléatoire: voir commande ci-dessous]
```

**Générer SESSION_SECRET:**

```bash
# Depuis votre terminal local:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copier la sortie et paster dans Render `SESSION_SECRET`.

#### 💳 REQUIS - Stripe

1. Aller sur [stripe.com/dashboard](https://dashboard.com)
2. Login → **Settings > API Keys**
3. Utiliser les clés **Live** (pas Test!)
4. Copier:
   - **Secret Key** → Render `STRIPE_SECRET_KEY`
   - **Publishable Key** → Render `STRIPE_PUBLISHABLE_KEY`

5. Créer un produit Stripe:
   - **Products** → **+ Add product**
   - Nom: "Premium Access JFSI"
   - Sélectionner pricing: **Recurring** (abonnement)
     - Montant: $9.99 (ou €9.99)
     - Intervalle: Monthly / Annual / Custom
   - Copier **Price ID** → Render `PREMIUM_PRICE_ID`

6. Webhooks Stripe:
   - Stripe Dashboard → **Settings > Webhooks**
   - **Add endpoint**
   - **URL endpoint**: `https://votre-app.render.com/api/webhook/stripe`
   - **Events to send**:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`
   - Copier **Signing secret** → Render `STRIPE_WEBHOOK_SECRET`

#### 📧 OPTIONNEL - Email SMTP

Pour vrais OTP par email:

```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = votre.email@gmail.com
SMTP_PASS = [Créer app password]
MAIL_FROM = "JFSI <votre.email@gmail.com>"
```

**Générer Gmail App Password:**

1. [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Sélectionner Mail + Windows
3. Copier le mot de passe 16 caractères

### Étape 3: Déployer!

```bash
git push origin main
# Render déploie automatiquement!
# Vérifier progress: Render Dashboard
```

✅ **App accessible:** `https://votre-app.render.com`

---

## 2️⃣ VÉRIFIER LE DÉPLOIEMENT

### Test 1: Site chargé?

```
https://votre-app.render.com
```

Vous devez voir la bannière JFSI complète.

### Test 2: Authentification

1. Cliquer "Connexion"
2. Entrer `test@example.com`
3. Copier le code de la console (F12)
4. Vérifier que vous êtes connecté

### Test 3: Stripe Checkout

1. Accueil → Abonnements
2. Cliquer "Souscrire" (Premium)
3. Test card Stripe:
   ```
   Numéro: 4242 4242 4242 4242
   Expiration: 12/25
   CVC: 123
   Nom: Test
   ```
4. Completer paiement
5. Vérifier webhook reçu: Stripe Dashboard → Webhooks → Recent Events

### Test 4: Admin Access

1. Connexion avec `admin@jfsi.local`
2. Aller à `https://votre-app.render.com/pages/admin-dashboard.html`
3. Voir dashboard admin

---

## 3️⃣ CONFIGURATION POST-DÉPLOIEMENT

### Domaine personnalisé (Optionnel)

1. Render Dashboard → Service → **Settings**
2. **Custom Domain** → Ajouter votre domaine
3. Copier nameservers
4. Configurer DNS chez votre registrar
5. SSL/HTTPS auto-généré ✅

### Alertes & Monitoring

1. Email notifications: Render → Account → Notifications
2. Status page: [status.render.com](https://status.render.com)
3. Logs: Dashboard → Service → **Logs** (en temps réel)

### Sauvegardes DB

Render ne persiste pas les fichiers (redéploiements effacent les données).

**Solution 1: PostgreSQL (Recommandé)**

- Render → **New Database** → PostgreSQL
- Gratuit 100MB (suffisant pour début)
- Données persistées

**Solution 2: Exports manuels**

```bash
sqlite3 data/jfsi.db ".dump" > backup.sql
# Sauvegarder backup.sql localement
```

---

## 4️⃣ NEXT STEPS - AMÉLIORER

### Database - Passer à PostgreSQL

1. Render → **New Database** → Select **PostgreSQL**
2. Copier les credentials
3. Ajouter à `.env` (Render):
   ```
   DB_TYPE = postgres
   DB_HOST = [copier host]
   DB_USER = [copier user]
   DB_PASS = [copier password]
   DB_NAME = [copier database]
   ```
4. Redéployer: `git push`

### Authentification SMTP

Si vous avez configuré SMTP:

1. Utilisateurs reçoivent OTP par email
2. Pas besoin d'accéder console (F12)
3. Expérience plus professionnelle

### Domaine personnalisé + SSL

1. Acheter domaine: [Namecheap](https://namecheap.com), [GoDaddy](https://godaddy.com)
2. Render: Custom Domain
3. SSL auto-généré via Let's Encrypt ✅

---

## 🚨 Troubleshooting

### ❌ Build fails

**Log:** `npm ERR!`

- Vérifier `package.json` syntax
- Checker dépendances manquantes

### ❌ Webhooks non reçus

**Log:** `POST /api/webhook/stripe 401`

- Vérifier `STRIPE_WEBHOOK_SECRET` exact (copier-coller)
- Tester webhook depuis Stripe Dashboard

### ❌ OTP ne fonctionne pas

**Problem:** Pas de code en console

- SMTP non configuré? → Code devrait s'afficher en console
- Vérifier que email/phone valide

### ❌ Database perdue après redéploiement

**Cause:** SQLite sur disque éphémère Render

- Solution: Utiliser PostgreSQL (gratuit sur Render)
- Données persistées ✅

---

## ✅ Checklist Final

**Avant de considérer "production ready":**

- [ ] ✅ Déploiement Render succès
- [ ] ✅ Site accessible https://votre-app.render.com
- [ ] ✅ Authentification testée
- [ ] ✅ Stripe test payment réussi
- [ ] ✅ Admin account fonctionnel
- [ ] ✅ Webhook Stripe reçus
- [ ] ✅ Variables d'env configurées
- [ ] ✅ SESSION_SECRET unique
- [ ] ✅ Logs OK dans Render
- [ ] ✅ Database créée + alimentée

---

## 🎉 Bravo!

Votre plateforme JFSI est maintenant:

✅ En ligne et accessible au monde  
✅ Avec authentification OTP sécurisée  
✅ Avec paiements Stripe en production  
✅ Avec système admin complet  
✅ Avec webhook gestion abonnements automatique

**Continuez à:**

1. Ajouter contenu (PDF, vidéos, audio)
2. Promouvoir sur réseaux sociaux
3. Améliorer UX/UI basé sur feedback utilisateurs
4. Scale la database si besoin
5. Ajouter analytics & monitoring

---

**Support:** [DEPLOYMENT.md](DEPLOYMENT.md) pour guide détaillé  
**Documentation:** [README.md](README.md) pour features complètes  
**Version:** 1.0 Production Ready  
**Dernière maj:** 17 Mars 2026
