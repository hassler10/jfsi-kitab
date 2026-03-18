/**
 * Intégration Salle Réunion + Backend Session
 * Synchronise la salle de réunion avec la vraie session du serveur
 */

// Variables globales - seront initialisées depuis le backend
let moi = null;
let role = null;
let authenticated = false;

/**
 * Initialiser la salle avec la session du backend
 * Appelé après validation de session via admin-session.js
 */
async function initSalleReunion() {
  // Récupérer l'info utilisateur du validator
  const userData = adminSessionValidator.userData;

  if (!userData || !userData.contact) {
    console.error("❌ Impossible de récupérer les infos utilisateur");
    adminSessionValidator.redirectToLogin();
    return;
  }

  // Mettre à jour les variables globales
  moi = {
    email: userData.contact,
    nom: userData.contact.split("@")[0], // Extrait du email
    role: userData.role,
    connecte: true,
  };

  role = userData.role;
  authenticated = true;

  console.log("✅ Salle initialité avec:", moi);

  // Afficher les infos utilisateur
  updateUserDisplay();

  // Afficher le dashboard approprié selon le rôle
  if (adminSessionValidator.isAdmin()) {
    console.log("👑 Accès Admin");
    // Afficher dashboard admin
    setTimeout(() => {
      aller("sc-admin-dashboard");
    }, 500);
  } else if (adminSessionValidator.isBureau()) {
    console.log("🤝 Accès Bureau");
    // Afficher salle réunion
    setTimeout(() => {
      aller("sc-salle");
    }, 500);
  } else {
    console.warn("❌ Rôle insuffisant");
    adminSessionValidator.redirectToLogin();
  }
}

/**
 * Mettre à jour l'affichage utilisateur
 */
function updateUserDisplay() {
  const userPill = document.querySelector(".user-pill");
  if (userPill && moi) {
    userPill.innerHTML = `
      <div class="u-avatar">${(moi.email[0] || "U").toUpperCase()}</div>
      <div style="font-size: 11px;">
        <div style="color: var(--blanc); font-weight: 700;">${moi.email}</div>
        <div style="color: var(--or); font-size: 9px;">${role === "admin" ? "👑 Administrateur" : "🤝 Bureau"}</div>
      </div>
    `;
  }
}

/**
 * Logout - appeler backend
 */
function quitterSalleReunion() {
  if (confirm("Êtes-vous sûr de vouloir quitter ?")) {
    adminSessionValidator.logout();
  }
}

// Override quitterAdmin pour utiliser le backend
const originalQuitterAdmin = window.quitterAdmin;
if (typeof window.quitterAdmin !== "undefined") {
  window.quitterAdmin = function () {
    quitterSalleReunion();
  };
}

// Écouter l'évènement quand admin-session.js a validé la session
document.addEventListener("DOMContentLoaded", () => {
  // Attendre que admin-session.js valide d'abord
  setTimeout(() => {
    // Vérifier que adminSessionValidator existe (créé par admin-session.js)
    if (
      typeof adminSessionValidator !== "undefined" &&
      adminSessionValidator.authenticated
    ) {
      initSalleReunion();
    }
  }, 100);
});
