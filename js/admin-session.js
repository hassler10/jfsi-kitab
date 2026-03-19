/**
 * Session Validator for Salle Réunion & Admin
 * Connecte la page admin/bureau au backend Express
 * NE bloque PAS la page d'accueil de salle-reunion
 */

class AdminSessionValidator {
  constructor() {
    this.authenticated = false;
    this.user = null;
    this.role = null;
    this.backendUrl = location.origin;
  }

  /**
   * Vérifier la session avec le backend (sans redirection)
   */
  async validateSession() {
    try {
      const response = await fetch(`${this.backendUrl}/api/auth/session`, {
        credentials: "include",
      });

      if (!response.ok) return false;

      const data = await response.json();

      if (data.authenticated) {
        this.authenticated = true;
        this.user = data.user;
        this.role = data.user?.role || "free";
        console.log("✅ Session valide. Rôle:", this.role);
        return true;
      }
      return false;
    } catch (error) {
      console.warn("⚠️ Erreur vérification session:", error);
      return false;
    }
  }

  /**
   * Vérifier session et bloquer si non connecté
   * À appeler uniquement quand on essaie d'entrer dans la salle
   */
  async requireAuth() {
    const valid = await this.validateSession();
    if (!valid) {
      alert("Session inactive ou expirée.\n\nVeuillez vous connecter via le formulaire ci-dessous.");
      return false;
    }
    return true;
  }

  /**
   * Rediriger vers accueil
   */
  redirectToLogin() {
    window.location.href = "../index.html";
  }

  isAdmin() {
    return this.role === "admin";
  }

  isBureau() {
    return this.role === "premium" || this.role === "admin" || this.role === "free";
  }

  async logout() {
    try {
      await fetch(`${this.backendUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erreur déconnexion:", error);
    } finally {
      window.location.href = "../index.html";
    }
  }

  get userData() {
    return {
      contact: this.user?.contact || "Utilisateur",
      role: this.role,
      email: this.user?.contact,
    };
  }
}

// Créer une instance globale
const adminSessionValidator = new AdminSessionValidator();

// NE PAS valider automatiquement au chargement
// La validation se fait uniquement quand l'utilisateur entre dans la salle
document.addEventListener("DOMContentLoaded", async () => {
  // Vérifier silencieusement si déjà connecté (sans bloquer)
  const isValid = await adminSessionValidator.validateSession();
  if (isValid) {
    console.log("✅ Session déjà active:", adminSessionValidator.userData);
    initializeAdminPage();
  } else {
    console.log("ℹ️ Pas de session active - page d'accueil affichée normalement");
  }
});

/**
 * Initialiser la page une fois la session validée
 */
function initializeAdminPage() {
  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) {
    if (adminSessionValidator.isAdmin()) {
      adminPanel.style.display = "block";
      console.log("👑 Accès Admin activé");
    } else if (adminSessionValidator.isBureau()) {
      console.log("🤝 Accès Bureau activé");
    }
  }
}
