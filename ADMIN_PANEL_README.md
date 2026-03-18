#!/bin/bash

# ADMIN_PANEL_README.md — Documentation complète du panel d'administration JFSI

# 🎯 Admin Panel — Documentation

## ✅ Fichiers Créés

### 1. `/admin/index.html` (650+ lignes)

- **Page principale** du panel d'administration
- **4 sections** avec navigation :
  - **Dashboard** — Vue d'ensemble (stats, utilisateurs, contenu)
  - **Contenu** — CRUD pour documents/vidéos/audio
  - **Utilisateurs** — Gestion des rôles (free/premium/admin)
  - **Settings** — Configuration serveur

### 2. `/admin/css/admin.css` (500+ lignes)

- Thème professionnel **or + vert** (brand JFSI)
- Layout responsive : **sidebar + main content**
- Composants : cards, tables, modals, notifications
- Esthétique : **luxury dark theme**

### 3. `js/admin-api.js` (115 lignes)

- Wrapper API centralisé
- Toutes les méthodes retournent Promises
- Inclut gestion d'erreurs et logging

## 🔐 Accès & Authentification

### URL d'accès :

```
http://localhost:3000/admin/
```

### Vérifications de sécurité :

1. **Session valide** — Vérifiée avec `/api/auth/session`
2. **Rôle admin** — Requis sur tous les endpoints `/api/admin/*`
3. **Cookies sécurisés** — Envoyés automatiquement avec `credentials: include`

### Test d'accès :

```javascript
// Dans la console browser du panel :
await adminAPI.checkAuth(); // Retourne true/false
```

## 📊 Dashboard

Affiche **statistiques en temps réel** :

- Total utilisateurs
- Utilisateurs Premium
- Total contenu
- Contenu Premium

```javascript
// Appel backend :
const stats = await adminAPI.getStats()
// Retourne :
{
  totalUsers: 42,
  premiumUsers: 12,
  totalContent: 156,
  premiumContent: 45,
  adminUsers: 2,
  freeContent: 111
}
```

## 📚 Gestion du Contenu

### Lister le contenu

```javascript
const content = await adminAPI.getContent()
// Retourne tableau d'objets :
[
  {
    id: 1,
    title: "Sourate Al-Fatiha",
    description: "La première sourate du Coran",
    type: "audio",
    category: "coran",
    file_path: "/audio/coran/fatiha.mp3",
    is_premium: false,
    created_at: "2024-01-15"
  },
  ...
]
```

### Ajouter du contenu

```javascript
await adminAPI.addContent({
  title: "Hadith Collection",
  description: "100 hadith sélectionnés",
  type: "document",
  category: "hadith",
  file_path: "/documents/hadith/collection.pdf",
  is_premium: true, // Réservé aux abonnés
});
```

### Modifier du contenu

```javascript
await adminAPI.updateContent(contentId, {
  title: "Nouveau titre",
  is_premium: false,
  // ... autres champs
});
```

### Supprimer du contenu

```javascript
await adminAPI.deleteContent(contentId);
```

## 👥 Gestion des Utilisateurs

### Lister les utilisateurs

```javascript
const users = await adminAPI.getUsers()
// Retourne :
[
  {
    id: 1,
    contact: "user@example.com",
    role: "admin",  // "free", "premium", "admin"
    created_at: "2024-01-10"
  },
  ...
]
```

### Modifier le rôle d'un utilisateur

```javascript
await adminAPI.updateUserRole(userId, "premium");
// Rôles valides : "free", "premium", "admin"
```

Utilisation dans le panel :

1. Ouvrir section **Utilisateurs**
2. Cliquer sur bouton **⚙️ Rôle**
3. Sélectionner nouveau rôle
4. Confirmer

## 🔧 Fonctionnalités Implémentées

| Fonctionnalité            | Status  | Notes                   |
| ------------------------- | ------- | ----------------------- |
| Afficher dashboard stats  | ✅ Fait | Temps réel              |
| Lister contenu            | ✅ Fait | Avec search +filter     |
| Ajouter contenu           | ✅ Fait | Via modal               |
| Supprimer contenu         | ✅ Fait | Avec confirmation       |
| Éditer contenu            | ⏳ TODO | Nécessite PUT endpoint  |
| Lister utilisateurs       | ✅ Fait | Avec search             |
| Modifier rôle utilisateur | ✅ Fait | Via modal + dropdown    |
| Logout                    | ✅ Fait | Détruit session serveur |
| Recherche/filtrage        | ✅ Fait | Client-side sur tables  |

## 🚀 Utilisation

### 1. Démarrer le serveur

```bash
cd c:\Users\HP\Desktop\jfsi-final
npm start
# Serveur sur http://localhost:3000
```

### 2. Accéder au panel

```
http://localhost:3000/admin/
```

### 3. Authentification

- Le panel vérifie automatiquement la session
- Si pas connecté → **redirection vers index.html**
- Si connecté mais pas admin → **accès refusé**

### 4. Naviguer

- **Sidebar gauche** — Lien entre les sections
- **Modals** — Pour ajouter/modifier
- **Tables** — Pour visualiser + actions
- **Search** — Filtre client-side

## ⚡ API Endpoints Reference

### Users

```
GET  /api/admin/users
      → Liste tous les utilisateurs

PUT  /api/admin/users/:id/role
      Body: { role: "free" | "premium" | "admin" }
      → Change le rôle
```

### Content

```
GET  /api/admin/content
      → Liste tout le contenu

POST /api/admin/content
      Body: { title, description, type, category, file_path, is_premium }
      → Crée contenu

PUT  /api/admin/content/:id
      Body: { title, description, type, category, file_path, is_premium }
      → Modifie contenu

DELETE /api/admin/content/:id
      → Supprime contenu
```

### Auth

```
GET /api/auth/session
    → Vérifie si authentifié

POST /auth/logout
     → Logout et détruit session
```

## 📋 Champs du Formulaire Contenu

| Champ       | Type    | Requis | Notes                      |
| ----------- | ------- | ------ | -------------------------- |
| title       | string  | ✅     | Titre du contenu           |
| description | string  | ❌     | Description longue         |
| type        | enum    | ✅     | document \| video \| audio |
| category    | enum    | ✅     | coran \| hadith \| fiqh    |
| file_path   | string  | ❌     | Chemin vers fichier        |
| is_premium  | boolean | ❌     | Réservé aux abonnés        |

## 🎨 Thème & Design

### Couleurs

- **Or principal** — `#c9a84c`
- **Vert foncé** — `#1a3a2a`
- **Blanc** — `#f9f5ec`
- **Noir doux** — `#0d1f15`
- **Gris** — `#8a7a6a`

### Typographie

- **Headings** — "Cinzel Decorative" (luxury)
- **Body text** — "Lato" (lisible)

### Responsive

- Desktop/Tablet : Layout complet (sidebar + content)
- Mobile : Sidebar cachée (toggle optionnelle)

## 🔍 Debugging

### Console du browser

```javascript
// Vérifier connexion API
await adminAPI.checkAuth();

// Charger les stats
await adminAPI.getStats();

// Tous les utilisateurs
await adminAPI.getUsers();

// Tous le contenu
await adminAPI.getContent();
```

### Network tab

- Vérifier les requêtes `/api/admin/*`
- Vérifier que les cookies sont envoyés (credentials)
- Vérifier status HTTP 200 (success) ou 401 (unauthorized)

## 🛠️ Maintenance

### Ajouter une nouvelle section

1. Créer `<div id="newSection" class="admin-section">`
2. Ajouter lien dans sidebar nav
3. Créer fonction `loadNewSection()`
4. Ajouter handler dans `showPage()`

### Ajouter un nouveau modal

1. Créer `<div id="newModal" class="modal">`
2. Créer fonctions : `openNewModal()`, `closeNewModal()`, `saveNew()`
3. Appeler `openNewModal()` d'un bouton

### Ajouter un nouvel endpoint

1. Créer dans `server.js` (ex: `app.get('/api/admin/...')`)
2. Ajouter méthode dans `admin-api.js` (ex: `async getNewData()`)
3. Appeler dans le panel : `await adminAPI.getNewData()`

## ✨ Prochaines Améliorations

- [ ] Édition inline du contenu (PUT endpoint)
- [ ] Upload fichier direct (file input)
- [ ] Statistiques avancées (graphiques)
- [ ] Historique des modifications (audit log)
- [ ] Backup/restore données
- [ ] Export CSV/JSON
- [ ] Notifications push
- [ ] Role management avancé
- [ ] Content scheduling
- [ ] Analytics détaillées

## 📞 Support

Le panel est **pleinement intégré** au backend Express. Tous les changements sont **immédiats** et affectent la **base de données SQLite** en temps réel.

Si vous rencontrez des erreurs :

1. Vérifier la console (F12 → Console)
2. Vérifier le terminal serveur
3. Vérifier les requêtes Network (F12 → Network)
4. Vérifier l'authentification (checkAuth)

---

**Version:** 1.0  
**Date:** 2024  
**Thème:** JFSI Admin Panel — Option B (Full-Featured)
