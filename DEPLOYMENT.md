# JFSI — Guide de Déploiement Production (Render)

## 🚀 Déploiement en 5 minutes

### Étape 1: Préparer le repository GitHub

```bash
# Initialiser git (si pas fait)
git init
git add .
git commit -m "Initial commit: JFSI platform ready for production"

# Créer un repository public sur GitHub
# https://github.com/new
```

### Étape 2: Créer une application Render

1. Aller sur [render.com](https://render.com)
2. S'enregistrer / Se connecter
3. Clicker **"New Web Service"**
4. Choisir **"Connect a repository"**
5. Sélectionner votre repository JFSI
6. Configurer:
   - **Name**: `jfsi-api`
   - **Region**: Votre région (ex: Frankfurt pour EU)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Étape 3: Configurer les Variables d'Environnement

Dans Render dashboard, aller à **Settings > Environment** et ajouter:

#### 🔐 Sécurité (REQUIS)

```
SESSION_SECRET = [générer une clé secrète aléatoire]
NODE_ENV = production
```

#### 💳 Stripe (REQUIS pour paiements)

```
STRIPE_SECRET_KEY = sk_live_...
STRIPE_PUBLISHABLE_KEY = pk_live_...
STRIPE_WEBHOOK_SECRET = whsec_...
PREMIUM_PRICE_ID = price_...
```

**Comment obtenir les clés:**

1. Aller sur [stripe.com](https://stripe.com) → Dashboard
2. Aller à **API Keys**
3. Copier **Secret Key** et **Publishable Key** (mode Live, pas Test!)
4. Créer un produit avec prix: **Products > +Create Product**
   - Nom: "Premium Access"
   - Prix: Sur abonnement (ex: 9.99€/mois)
   - Copier **Price ID**
5. Configurer webhook Stripe (voir section 4)

#### 📧 Email SMTP (OPTIONNEL)

```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = votre.email@gmail.com
SMTP_PASS = app_password_16_caracteres
MAIL_FROM = "JFSI <votre.email@gmail.com>"
```

**Pour Gmail:**

1. Activer 2FA
2. Créer [App Password](https://myaccount.google.com/apppasswords)
3. Copier le mot de passe 16 caractères

#### 🗄️ Database (AUTO)

```
DB_TYPE = sqlite
DB_PATH = ./data/jfsi.db
PORT = 3000 (auto-configuré par Render)
```

### Étape 4: Configurer Stripe Webhooks

1. Stripe Dashboard → **Settings > Webhooks**
2. Clicker **"Add endpoint"**
3. **Endpoint URL**: `https://votre-app.render.com/api/webhook/stripe`
4. **Events**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
5. Copier **Signing Secret** → Ajouter à Render env: `STRIPE_WEBHOOK_SECRET`

### Étape 5: Déployer!

**Option A: Auto-deploy (recommandé)**

```bash
git push origin main
# Render déploie automatiquement!
```

**Option B: Manuel via Render UI**

- Ouvrir Render dashboard
- Service: `jfsi-api`
- Clicker **"Manual Deploy"** > **"Deploy latest commit"**

---

## ✅ Tester en Production

### 1. Vérifier que tout fonctionne

```
https://votre-app.render.com
```

Vous devez voir le site JFSI complet.

### 2. Tester l'authentification

- Clicker "Connexion"
- Utiliser email/téléphone (ex: `test@example.com`)
- F12 → Console: copier le code OTP affiché
- Entrer le code

### 3. Tester Stripe

1. Accueil → Abonnements
2. Clicker "Souscrire" (plan Premium)
3. Utiliser test card: `4242 4242 4242 4242`
   - Expiration: 12/25 (n'importe quelle date future)
   - CVC: 123
   - Nom: n'importe quel nom
4. Valider et vérifier webhooks Stripe reçus

### 4. Vérifier les logs

```bash
# Dans Render dashboard
# Service: jfsi-api → Logs
```

---

## 🔄 Mises à jour futures

### Déployer une mise à jour

```bash
git add .
git commit -m "Fix: [description]"
git push origin main
# Render redéploie automatiquement
```

### Vérifier l'état du déploiement

- Render Dashboard → Build Logs
- Voir les étapes: Install → Build → Deploy

### Redémarrer l'application

- Dashboard → Service → **Manual Deploy** > **Redeploy**

---

## 🚨 Troubleshooting

### ❌ Build fails

**Log**: `npm ERR! ERR!`  
**Solution**: Vérifier dependencies dans `package.json`

```bash
npm install
npm start
```

### ❌ Webhooks not received

**Log**: `POST /api/webhook/stripe 401`  
**Solution**:

1. Vérifier `STRIPE_WEBHOOK_SECRET` exact
2. Tester depuis Stripe Dashboard → Webhooks → Event
3. Vérifier LOG dans Render pour erreurs

### ❌ Stripe checkout fails

**Error**: "Price not found"  
**Solution**:

1. Vérifier `PREMIUM_PRICE_ID` exists en Stripe
2. Utiliser Live key (pas Test)
3. Redéployer: `git push`

### ❌ Database not persisting

**Problem**: Données perdues au redéploiement  
**Cause**: SQLite sur disque éphémère (Render)  
**Solution**: Migrer vers PostgreSQL (voir section Scaling)

---

## 📈 Scaling Futur

### Données persistantes: PostgreSQL

Render supporte PostgreSQL gratuit (100MB):

1. Render Dashboard → **New Database**
2. Sélectionner **PostgreSQL**
3. Copier les credentials
4. `.env`:
   ```
   DB_TYPE = postgres
   DB_HOST = [copier host]
   DB_USER = [copier user]
   DB_PASS = [copier password]
   DB_NAME = [copier database]
   ```
5. Migrer les données:
   ```bash
   node scripts/migrate-to-postgres.sh
   ```

### Plus de CPU/RAM

1. Render Dashboard → Service → **Plan**
2. Passer de Starter ($7/mois) à Pro ($12/mois)

---

## 📝 Checklist Finale

- [ ] GitHub repository prêt
- [ ] Render app créée
- [ ] Variables d'environnement: SESSION_SECRET, NODE_ENV
- [ ] Stripe Live keys configurés
- [ ] Webhook Stripe endpoint ajouté
- [ ] Déploiement initial successful
- [ ] Site accessible: `https://votre-app.render.com`
- [ ] Authentification testée
- [ ] Stripe checkout testé
- [ ] Admin account créé: `admin@jfsi.local`

---

## 🎉 Succès!

Votre plateforme JFSI est maintenant en line et accessible au monde!

**Prochaines étapes:**

1. Ajouter contenu réel (PDFs, vidéos, audio)
2. Configurer domaine personnalisé (Render → Custom Domain)
3. Activer SMTP pour vraies notifications emails
4. Ajouter analytics (Google Analytics)
