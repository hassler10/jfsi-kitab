#!/bin/bash

# ADMIN_PANEL_QUICKSTART.md

# ─────────────────────────────────────────────────────────────

# 🚀 Admin Panel — Démarrage Rapide

## ✅ Fichiers Créés

```
jfsi-final/
├── admin/
│   ├── index.html              ← Page principale (650+ lignes)
│   └── css/
│       └── admin.css           ← Styles (500+ lignes)
├── js/
│   └── admin-api.js            ← API Wrapper (115+ lignes)
└── ADMIN_PANEL_README.md       ← Documentation complète
```

## 🎯 Accès au Panel

### 1. Démarrer le serveur

```bash
cd c:\Users\HP\Desktop\jfsi-final
npm start
```

Vous verrez:

```
✅ JFSI server démarré sur http://localhost:3000
```

### 2. Se connecter comme ADMIN

**Option A: Via Frontend (Recommandé)**

- Aller sur http://localhost:3000
- Cliquer "Connexion"
- Entrer email + code OTP (check console terminal)
- Vous devez avoir le rôle `admin` dans la DB

**Option B: Test Direct (Mode Dev)**

```bash
# Dans un autre terminal Node.js:
const Database = require('better-sqlite3');
const db = new Database('./data/jfsi.db');

// Créer admin test
db.exec(`
  INSERT OR REPLACE INTO users (contact, role)
  VALUES ('admin@jfsi.local', 'admin')
`);
```

### 3. Accéder au Panel Admin

**Après connexion comme admin :**

1. En haut à droite, un lien **⚙️ Admin** apparaît
2. Cliquer dessus → `http://localhost:3000/admin/`
3. Vous accédez au panel d'administration

**Ou accès direct :**

```
http://localhost:3000/admin/
```

⚠️ **Sécurité** : Si pas connecté en admin → redirection vers accueil

## 📊 Sections du Panel

### 1️⃣ Dashboard (Défaut)

- Vue d'ensemble statistiques
- Utilisateurs total / Premium
- Contenu total / Premium
- Boutons actions rapides

### 2️⃣ Contenu

- **Tableau** : Liste tout le contenu
- **Recherche** : Filtrer par titre/catégorie
- **Ajouter** : Bouton pour nouveau contenu
  - Formulaire modal
  - Champs: Titre, Description, Type, Catégorie, File Path, Premium
- **Supprimer** : Bouton per item (avec confirmation)

### 3️⃣ Utilisateurs

- **Tableau** : Tous les utilisateurs
- **Colonnes** : Email, Rôle, Date inscription, Actions
- **Modifier Rôle** : Bouton par utilisateur
  - Sélectionner: Free / Premium / Admin
  - Changement immédiat en BD

### 4️⃣ Paramètres (Settings)

- Info serveur (version BD, chemin)
- Config Stripe
- Actions de maintenance

## 🧪 Tests d'API

### Depuis la console Browser (F12 → Console)

```javascript
// Vérifier authentification
await adminAPI.checkAuth(); // true/false

// Charger les stats
const stats = await adminAPI.getStats();
console.log(stats);
// { totalUsers: 42, premiumUsers: 12, ... }

// Lister les utilisateurs
const users = await adminAPI.getUsers();
users.forEach((u) => console.log(u.contact, u.role));

// Lister le contenu
const content = await adminAPI.getContent();
content.forEach((c) => console.log(c.title, c.category));

// Ajouter du contenu
await adminAPI.addContent({
  title: "Test Doc",
  description: "Document de test",
  type: "document",
  category: "coran",
  file_path: "/documents/test.pdf",
  is_premium: false,
});

// Changer rôle utilisateur
await adminAPI.updateUserRole(1, "premium");

// Supprimer contenu
await adminAPI.deleteContent(1);
```

## 🔧 Dépannage

### Problème: "Non autorisé. Redirection..."

**Cause** : Pas connecté comme admin

**Solution** :

1. Aller sur http://localhost:3000
2. Cliquer "Connexion"
3. Entrer un email + avoir le rôle admin
4. Retry `/admin/`

### Problème: Network error en chargeant le contenu

**Cause** : Backend endpoint pas disponible ou session expirée

**Solution** :

1. Vérifier que le serveur tourne
2. Ouvrir Console (F12)
3. Faire : `await adminAPI.checkAuth()` → doit return true
4. Si false, se reconnecter

### Problème: Pas de contenu dans le tableau

**Cause** : BD vide OU endpoint retourne pas les bonnes données

**Solution** :

1. Tester endpoint directement :
   ```
   curl -b "session=..." http://localhost:3000/api/admin/content
   ```
2. Ajouter du contenu via le formulaire
3. Recharger la page

### Problème: Lien "⚙️ Admin" n'apparaît pas

**Cause** : Pas connecté OU pas admin role

**Solution** :

1. Vérifier: `await adminAPI.checkAuth()` dans console
2. Vérifier role: Dans BD, `SELECT role FROM users WHERE contact='votre@email'`
3. Si role vaut "free" ou "premium" → changer en "admin"

## 📋 Endpoints Backend Utilisés

| Endpoint                    | Méthode | Purpose                   |
| --------------------------- | ------- | ------------------------- |
| `/api/auth/session`         | GET     | Vérifier authentification |
| `/api/admin/users`          | GET     | Lister utilisateurs       |
| `/api/admin/users/:id/role` | PUT     | Modifier rôle             |
| `/api/admin/content`        | GET     | Lister contenu            |
| `/api/admin/content`        | POST    | Créer contenu             |
| `/api/admin/content/:id`    | DELETE  | Supprimer contenu         |
| `/auth/logout`              | POST    | Logout                    |

## 🎨 Customisation

### Changer les couleurs

Éditer `admin/css/admin.css` :

```css
:root {
  --or: #c9a84c; /* Or principal */
  --vert: #1a3a2a; /* Vert foncé */
  --blanc: #f9f5ec; /* Blanc */
  --noir-doux: #0d1f15; /* Noir doux */
  /* ... */
}
```

### Ajouter une nouvelle section

1. Créer div în `admin/index.html` :

   ```html
   <div id="newsection" class="admin-section">
     <!-- contenu -->
   </div>
   ```

2. Ajouter lien în sidebar :

   ```html
   <li>
     <a href="#newsection" class="nav-link" onclick="showPage('newsection')">
       📌 Nouvelle Section
     </a>
   </li>
   ```

3. Créer fonction de chargement:

   ```javascript
   async function loadNewSection() {
     // code
   }
   ```

4. Appeler în `showPage()` :
   ```javascript
   if (pageName === "newsection") loadNewSection();
   ```

## 📱 Responsive Design

- **Desktop** (1024+) : Layout complet sidebar + content
- **Tablet** (768-1024) : Menu collapsible
- **Mobile** (⁺768) : Interface adaptée

## 🔐 Sécurité

✅ Tout changement nécessite :

1. Session valide (cookies)
2. Rôle admin (vérification backend)
3. CORS protégé
4. SQLite (pas d'injection SQL)

Les données changent **immédiatement** dans la BD et sont **visibles partout** en temps réel.

## 📖 Documentation Complète

Pour plus de détails, voir : [ADMIN_PANEL_README.md](./ADMIN_PANEL_README.md)

---

**Version:** 1.0  
**Date:** 2024  
**Status:** ✅ Production Ready
