/* =============================================
   JFSI — Gestion des Sessions & Authentification
   js/session.js
   ============================================= */

class SessionManager {
  constructor() {
    this.sessionKey = "jfsi_session";
    this.userKey = "jfsi_user";
    this.otpKey = "jfsi_otp_demo";
    this.pendingRedirect = null;
    this.useBackend = window.location.protocol.startsWith("http");
    this.init();
  }

  init() {
    this.setupModalHandlers();
    this.updateNavbar();
    this.protectAuthLinks();
    if (this.useBackend) {
      this.checkBackendSession();
    }
  }

  async checkBackendSession() {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      const data = await res.json();
      if (data.authenticated) {
        this.setLocalSession({
          emailOrPhone: data.user?.contact || "",
          role: data.user?.role || "free",
        });
        this.updateNavbar();
      }
    } catch (e) {
      // ignore, backend non accessible (fichier local)
    }
  }

  requireAuth(redirect) {
    if (this.isAuthenticated()) return true;
    this.pendingRedirect = redirect || null;
    this.openLoginModal();
    notif("🔐 Veuillez vous connecter pour accéder à cette section.", true);
    return false;
  }

  protectAuthLinks() {
    document.querySelectorAll("a.requires-auth").forEach((link) => {
      link.addEventListener("click", (e) => {
        const redirect = link.dataset.authRedirect || link.getAttribute("href");
        if (!this.requireAuth(redirect)) {
          e.preventDefault();
        }
      });
    });
  }

  // ── AUTHENTIFICATION ──
  async login(emailOrPhone) {
    if (this.useBackend) {
      try {
        const res = await fetch("/api/auth/request-otp", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact: emailOrPhone }),
        });
        const data = await res.json();
        if (data.ok) {
          notif("✅ OTP envoyé! Vérifiez la console ou votre messagerie.");
        }
        this.setLocalSession({ emailOrPhone });
        return true;
      } catch (e) {
        console.error(e);
        notif("Erreur de connexion au serveur", true);
        return false;
      }
    }

    const otp = this.generateOTP();
    const user = {
      emailOrPhone,
      otp,
      createdAt: new Date().getTime(),
      verified: false,
    };

    sessionStorage.setItem(this.userKey, JSON.stringify(user));
    console.log(
      "%c🔐 OTP JFSI (DEMO)",
      "color: #C9A84C; font-size: 16px; font-weight: bold;",
    );
    console.log(
      "%cCode OTP: " + otp,
      "color: #C9A84C; font-size: 14px; font-weight: bold;",
    );
    console.log(
      "%cVérifiez ce code ci-dessus et saisissez-le dans le formulaire",
      "color: #888; font-size: 12px;",
    );

    return otp;
  }

  async verifyOTP(inputOtp) {
    if (this.useBackend) {
      try {
        const contact = this.getUser();
        if (!contact) return false;

        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact, otp: inputOtp.toString() }),
        });
        const data = await res.json();
        if (data.ok) {
          this.setLocalSession({
            emailOrPhone: data.user?.contact || contact,
            role: data.user?.role || "free",
          });
          return true;
        }
      } catch (e) {
        console.error(e);
      }
      return false;
    }

    const user = JSON.parse(sessionStorage.getItem(this.userKey) || "{}");
    if (!user.otp) return false;

    if (inputOtp === user.otp) {
      user.verified = true;
      user.sessionToken = this.generateToken();
      sessionStorage.setItem(this.userKey, JSON.stringify(user));
      sessionStorage.setItem(
        this.sessionKey,
        JSON.stringify({
          token: user.sessionToken,
          user: user.emailOrPhone,
          loginTime: new Date().getTime(),
        }),
      );
      return true;
    }
    return false;
  }

  setLocalSession({ emailOrPhone, role = "free" }) {
    const sessionToken = this.generateToken();
    const user = { emailOrPhone, role };
    sessionStorage.setItem(
      this.userKey,
      JSON.stringify({ ...user, verified: true }),
    );
    sessionStorage.setItem(
      this.sessionKey,
      JSON.stringify({
        token: sessionToken,
        user: emailOrPhone,
        role: role,
        loginTime: new Date().getTime(),
      }),
    );
  }

  async logout() {
    if (this.useBackend) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (e) {
        // ignore
      }
    }

    sessionStorage.removeItem(this.userKey);
    sessionStorage.removeItem(this.sessionKey);
    this.updateNavbar();
  }

  isAuthenticated() {
    const session = sessionStorage.getItem(this.sessionKey);
    if (!session) return false;
    const data = JSON.parse(session);
    return data.token ? true : false;
  }

  getUser() {
    const session = sessionStorage.getItem(this.sessionKey);
    if (!session) return null;
    return JSON.parse(session).user;
  }

  getUserRole() {
    // For now, assume role is stored in session or check with backend
    // This could be enhanced to fetch from backend
    const session = sessionStorage.getItem(this.sessionKey);
    if (!session) return "free";
    return JSON.parse(session).role || "free";
  }

  // ── HELPERS ──
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateToken() {
    return (
      "token_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  // ── MODAL CONNEXION ──
  setupModalHandlers() {
    document.addEventListener("DOMContentLoaded", () => {
      this.attachLoginListeners();
      this.attachVerifyListeners();
    });
  }

  attachLoginListeners() {
    const loginBtns = document.querySelectorAll('[data-action="open-login"]');
    loginBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openLoginModal();
      });
    });
  }

  attachVerifyListeners() {
    const verifyBtns = document.querySelectorAll('[data-action="verify-otp"]');
    verifyBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.verifyLogin();
      });
    });
  }

  openLoginModal() {
    const existing = document.querySelector(".modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>🔐 Connexion Sécurisée</h2>
          <button onclick="sessionManager.closeModal()" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div id="step-1" class="modal-step active">
            <p style="text-align:center;color:var(--gris);margin-bottom:20px;">Entrez votre email ou numéro de téléphone</p>
            <input type="text" id="login-input" placeholder="Email ou Téléphone" class="modal-input" />
            <button onclick="sessionManager.sendOTP()" class="modal-btn-primary">Envoyer OTP</button>
          </div>
          <div id="step-2" class="modal-step" style="display:none;">
            <p style="text-align:center;color:var(--gris);margin-bottom:20px;">
              Entrez le code OTP reçu<br/>
              <small style="color:var(--or);">Consultez la console (F12) pour voir le code</small>
            </p>
            <input type="text" id="otp-input" placeholder="Code OTP (6 chiffres)" class="modal-input" maxlength="6" />
            <button onclick="sessionManager.verifyLogin()" class="modal-btn-primary">Vérifier</button>
          </div>
          <div id="step-3" class="modal-step" style="display:none;">
            <div style="text-align:center;">
              <div style="font-size:48px;margin-bottom:16px;">✅</div>
              <p style="color:var(--blanc);font-size:16px;margin-bottom:8px;">Connexion réussie!</p>
              <p style="color:var(--gris);font-size:13px;margin-bottom:20px;" id="user-display"></p>
              <button onclick="sessionManager.closeModal()" class="modal-btn-primary">Fermer</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.querySelector("#login-input").focus();
  }

  async sendOTP() {
    const input = document.getElementById("login-input").value.trim();
    if (!input) {
      notif("Veuillez entrer un email ou un numéro", true);
      return;
    }

    const success = await this.login(input);
    if (!success) return;

    document.getElementById("step-1").style.display = "none";
    document.getElementById("step-2").style.display = "block";
    document.querySelector("#otp-input").focus();
    notif("✅ OTP envoyé! Consultez la console (F12)");
  }

  async verifyLogin() {
    const otp = document.getElementById("otp-input").value.trim();
    if (otp.length !== 6) {
      notif("Code OTP invalide", true);
      return;
    }

    if (await this.verifyOTP(otp)) {
      document.getElementById("step-2").style.display = "none";
      document.getElementById("step-3").style.display = "block";
      document.getElementById("user-display").textContent = this.getUser();
      notif("✅ Bienvenue!");
      this.updateNavbar();

      // Si une redirection était en attente (clic sur un lien protégé)
      if (this.pendingRedirect) {
        const redirect = this.pendingRedirect;
        this.pendingRedirect = null;
        setTimeout(() => {
          window.location.href = redirect;
        }, 1000);
        return;
      }

      setTimeout(() => this.closeModal(), 2000);
    } else {
      notif("Code OTP incorrect", true);
      document.getElementById("otp-input").value = "";
    }
  }

  closeModal() {
    const overlay = document.querySelector(".modal-overlay");
    if (overlay) overlay.remove();
  }

  // ── MISE À JOUR NAVBAR ──
  updateNavbar() {
    const navRight = document.querySelector(".nav-right");
    if (!navRight) return;

    if (this.isAuthenticated()) {
      const user = this.getUser();
      const userRole = this.getUserRole();
      navRight.innerHTML = `
        <div class="user-menu" style="display:flex;align-items:center;gap:16px;">
          <span style="font-size:12px;color:var(--or-clair);">👤 ${user}</span>
          <a href="pages/mes-abonnements.html" class="nav-link" style="font-size:12px;">Mes Abonnements</a>
          ${userRole === "admin" ? '<a href="pages/admin-dashboard.html" class="nav-link" style="font-size:12px;">Admin</a>' : ""}
          <button onclick="sessionManager.logout()" class="nav-cta" style="margin:0;">Déconnexion</button>
        </div>
      `;
    } else {
      navRight.innerHTML = `
        <button onclick="sessionManager.openLoginModal()" class="nav-cta">Connexion</button>
      `;
    }
  }
}

// ── INITIALISER À LA CHARGE ──
document.addEventListener("DOMContentLoaded", () => {
  window.sessionManager = new SessionManager();
});

// ── STYLES MODAL ──
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  .modal-overlay {
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .modal-content {
    background: linear-gradient(135deg, rgba(13,31,21,0.95), rgba(26,58,42,0.8));
    border: 1px solid rgba(201,168,76,0.3);
    border-radius: 12px; width: 90%; max-width: 420px;
    animation: slideUp 0.3s ease;
  }
  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .modal-header {
    padding: 24px; border-bottom: 1px solid rgba(201,168,76,0.15);
    display: flex; justify-content: space-between; align-items: center;
  }
  .modal-header h2 {
    font-size: 18px; color: var(--blanc); margin: 0;
    font-family: 'Cinzel Decorative', serif;
  }
  .modal-close {
    background: none; border: none; font-size: 28px; color: var(--or);
    cursor: pointer; transition: all 0.3s;
  }
  .modal-close:hover { color: var(--blanc); }
  .modal-body { padding: 32px; }
  .modal-step { transition: all 0.3s; }
  .modal-input {
    width: 100%; padding: 14px 16px; margin-bottom: 20px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(201,168,76,0.25);
    border-radius: 6px; color: var(--blanc); font-family: 'Lato', sans-serif;
    outline: none; transition: all 0.3s;
  }
  .modal-input:focus {
    border-color: var(--or); background: rgba(255,255,255,0.08);
  }
  .modal-btn-primary {
    width: 100%; padding: 14px; background: linear-gradient(135deg, var(--or), var(--or-fonce));
    border: none; border-radius: 6px; color: var(--noir-doux);
    font-weight: 700; font-size: 13px; letter-spacing: 1px;
    cursor: pointer; transition: all 0.3s;
  }
  .modal-btn-primary:hover { transform: translateY(-2px); }
`;
document.head.appendChild(styleSheet);
