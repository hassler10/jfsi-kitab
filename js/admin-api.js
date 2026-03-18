/**
 * Admin API Wrapper — Communique avec le backend Express
 * Tous les changements modifient la BASE DE DONNÉES
 */

class AdminAPI {
  constructor() {
    this.baseUrl = location.origin;
    this.timeout = 10000; // 10s timeout
  }

  /**
   * Requête générique avec gestion d'erreur
   */
  async request(method, endpoint, data = null) {
    try {
      const options = {
        method,
        credentials: "include", // Envoie les cookies session
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseUrl}/api${endpoint}`, options);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ API Error [${method} ${endpoint}]:`, error.message);
      throw error;
    }
  }

  /**
   * ═════════════════════════════════════════
   * 👥 USERS MANAGEMENT
   * ═════════════════════════════════════════
   */

  /**
   * Lister tous les utilisateurs
   */
  async getUsers() {
    return this.request("GET", "/admin/users");
  }

  /**
   * Modifier le rôle d'un utilisateur
   */
  async updateUserRole(userId, newRole) {
    return this.request("PUT", `/admin/users/${userId}/role`, {
      role: newRole,
    });
  }

  /**
   * ═════════════════════════════════════════
   * 📚 CONTENT MANAGEMENT
   * ═════════════════════════════════════════
   */

  /**
   * Lister tout le contenu
   */
  async getContent() {
    return this.request("GET", "/admin/content");
  }

  /**
   * Ajouter un contenu
   */
  async addContent(contentData) {
    return this.request("POST", "/admin/content", {
      title: contentData.title,
      description: contentData.description,
      type: contentData.type,
      category: contentData.category,
      file_path: contentData.file_path || null,
      is_premium: contentData.is_premium || false,
    });
  }

  /**
   * Modifier un contenu
   */
  async updateContent(contentId, contentData) {
    return this.request("PUT", `/admin/content/${contentId}`, contentData);
  }

  /**
   * Supprimer un contenu
   */
  async deleteContent(contentId) {
    return this.request("DELETE", `/admin/content/${contentId}`);
  }

  /**
   * ═════════════════════════════════════════
   * 📊 STATISTICS
   * ═════════════════════════════════════════
   */

  /**
   * Obtenir les statistiques du site
   */
  async getStats() {
    try {
      const users = await this.getUsers();
      const content = await this.getContent();

      const stats = {
        totalUsers: users.length || 0,
        totalContent: content.length || 0,
        premiumUsers: users.filter((u) => u.role === "premium").length || 0,
        adminUsers: users.filter((u) => u.role === "admin").length || 0,
        freeContent: content.filter((c) => !c.is_premium).length || 0,
        premiumContent: content.filter((c) => c.is_premium).length || 0,
      };

      return stats;
    } catch (error) {
      console.error("Error fetching stats:", error);
      return {};
    }
  }

  /**
   * ═════════════════════════════════════════
   * 🔐 AUTH
   * ═════════════════════════════════════════
   */

  /**
   * Vérifier si authentifié (admin)
   */
  async checkAuth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/session`, {
        credentials: "include",
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.authenticated;
    } catch (error) {
      return false;
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this.request("POST", "/auth/logout");
      window.location.href = "../index.html";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "../index.html";
    }
  }
}

// Instance globale
const adminAPI = new AdminAPI();
