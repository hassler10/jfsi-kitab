/**
 * Session Validator for Salle Réunion & Admin
 * Conecte la page admin/bureau au backend Express
 * Empêche l'accès sans session valide au serveur
 */

class AdminSessionValidator {
  constructor() {
    this.authenticated = false;
    this.user = null;
    this.role = null;
    this.backendUrl = location.origin; // http://localhost:3000
  }

  /**
   * Vérifier la session avec le backend
   * Ceci DOIT être appelé au chargement de la page
   */
  async validateSession() {
    try {
      const response = await fetch(`${this.backendUrl}/api/auth/session`, {
        credentials: "include", // Important: envoie les cookies
      });

      if (!response.ok) {
        this.redirectToLogin();
        return false;
      }

      const data = await response.json();

      if (data.authenticated) {
        this.authenticated = true;
        this.user = data.user;
        this.fetchRole();
        return true;
      } else {
        this.redirectToLogin();
        return false;
      }
    } catch (error) {
      console.error("❌ Erreur vérification session:", error);
      this.redirectToLogin();
      return false;
    }
  }

  /**
   * Récupérer le rôle de l'utilisateur
   */
  async fetchRole() {
    try {
      // Essayer d'abord le endpoint subscription (retourne le role)
      const response = await fetch(
        `${this.backendUrl}/api/subscription/status`,
        {
          credentials: "include",
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.role) {
          this.role = data.user.role; // "free", "premium", ou "admin"
          console.log("✅ Rôle récupéré:", this.role);
        }
      } else {
        // Si subscription/status échoue, le rôle reste indéfini
        console.warn(
          "⚠️ Impossible de récupérer le rôle via subscription/status",
        );
      }
    } catch (error) {
      console.warn("⚠️ Erreur lors de la récupération du rôle:", error);
    }
  }

  /**
   * Rediriger vers connexion si pas authentifié
   */
  redirectToLogin() {
    alert(
      "Session inactive ou expirée.\n\nVeuillez vous reconnecter via la page d'accueil.",
    );
    window.location.href = "../index.html";
  }

  /**
   * Vérifier si utilisateur est admin
   */
  isAdmin() {
    return this.role === "admin";
  }

  /**
   * Vérifier si utilisateur est du bureau
   */
  isBureau() {
    return this.role === "premium" || this.role === "admin";
  }

  /**
   * Déconnecter le backend
   */
  async logout() {
    try {
      await fetch(`${this.backendUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erreur déconnexion:", error);
    } finally {
      // Rediriger de toute façon
      window.location.href = "../index.html";
    }
  }

  /**
   * Obtenir info utilisateur
   */
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

// Valider la session au chargement de la page
document.addEventListener("DOMContentLoaded", async () => {
  const isValid = await adminSessionValidator.validateSession();
  if (!isValid) {
    // redirectToLogin est appelé dans validateSession
    return;
  }

  // ✅ Session valide - initialiser la page
  initializeAdminPage();
});

/**
 * Initialiser la page une fois la session validée
 */
function initializeAdminPage() {
  console.log(
    "✅ Session valide. Utilisateur:",
    adminSessionValidator.userData,
  );

  // Verrouiller l'accès aux rôles
  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) {
    if (adminSessionValidator.isAdmin()) {
      adminPanel.style.display = "block";
      console.log("👑 Accès Admin activé");
    } else if (adminSessionValidator.isBureau()) {
      console.log("🤝 Accès Bureau activé");
    } else {
      console.warn("❌ Accès refusé - rôle insuffisant");
      adminSessionValidator.redirectToLogin();
    }
  }
}
