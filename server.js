/*
  JFSI — Backend minimal (Express)
  - Sert les fichiers statiques (site complet)
  - Fournit une API d'authentification OTP
  - Gère les sessions (cookie sécurisé)

  Usage:
    npm install
    npm start
*/

const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const uid = require("uid-safe");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const Database = require("better-sqlite3");
const stripe = require("stripe");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Configuration SMTP (optionnelle)
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport(smtpConfig)
    : null;

// Configuration Stripe
const stripeClient = process.env.STRIPE_SECRET_KEY
  ? stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Configuration base de données
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "jfsi.db");
const db = new Database(DB_PATH);

// Initialiser la base de données
const initDb = () => {
  const schemaPath = path.join(__dirname, "data", "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    db.exec(schema);
  }
};
initDb();

// Warn if using default session secret in production
const SESSION_SECRET = process.env.SESSION_SECRET || "jfsi-secret-demo";
if (
  process.env.NODE_ENV === "production" &&
  SESSION_SECRET === "jfsi-secret-demo"
) {
  console.warn("⚠️  WARNING: Using default SESSION_SECRET in production!");
  console.warn("   Set SESSION_SECRET environment variable for security.");
}

app.use(
  session({
    genid: () => uid.sync(18),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 1 jour
      sameSite: "strict",
    },
  }),
);

// Fonctions base de données
const dbFunctions = {
  // Utilisateurs
  findUser: db.prepare("SELECT * FROM users WHERE contact = ?"),
  createUser: db.prepare("INSERT INTO users (contact, role) VALUES (?, ?)"),
  updateUserRole: db.prepare(
    "UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ),
  getAllUsers: db.prepare(
    "SELECT id, contact, role, created_at FROM users ORDER BY created_at DESC",
  ),

  // Abonnements
  findSubscription: db.prepare("SELECT * FROM subscriptions WHERE user_id = ?"),
  createSubscription: db.prepare(`
    INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, plan, current_period_start, current_period_end)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  updateSubscription: db.prepare(`
    UPDATE subscriptions SET status = ?, current_period_start = ?, current_period_end = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `),

  // Contenu
  getAllContent: db.prepare("SELECT * FROM content ORDER BY created_at DESC"),
  getContentById: db.prepare("SELECT * FROM content WHERE id = ?"),
  getContentByCategory: db.prepare(
    "SELECT * FROM content WHERE category = ? ORDER BY created_at DESC",
  ),
  getPremiumContent: db.prepare(
    "SELECT * FROM content WHERE is_premium = 1 ORDER BY created_at DESC",
  ),
  createContent: db.prepare(`
    INSERT INTO content (title, description, type, category, file_path, is_premium)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  updateContent: db.prepare(`
    UPDATE content SET title = ?, description = ?, type = ?, category = ?, file_path = ?, is_premium = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteContent: db.prepare("DELETE FROM content WHERE id = ?"),

  // Accès au contenu
  grantContentAccess: db.prepare(
    "INSERT OR IGNORE INTO user_content_access (user_id, content_id) VALUES (?, ?)",
  ),
  checkContentAccess: db.prepare(`
    SELECT 1 FROM user_content_access uca
    JOIN users u ON uca.user_id = u.id
    WHERE u.contact = ? AND uca.content_id = ? AND (u.role = 'premium' OR u.role = 'admin')
  `),
};

// Fonctions OTP (temporaire, en mémoire pour simplicité)
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post("/api/auth/request-otp", async (req, res) => {
  const { contact } = req.body;
  if (!contact || typeof contact !== "string") {
    return res.status(400).json({ error: "Contact requis" });
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min
  setOtpEntry(contact, otp, expiresAt);

  const isEmail = contact.includes("@");
  if (isEmail && transporter) {
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: contact,
        subject: "Votre code OTP JFSI",
        text: `Votre code OTP est : ${otp} (valable 10 minutes)`,
      });
    } catch (err) {
      console.warn("Impossible d'envoyer l'email OTP (fallback console)", err);
    }
  }

  console.log("====================== JFSI OTP ======================");
  console.log(`Contact: ${contact}`);
  console.log(`OTP : ${otp}`);
  console.log("====================================================");

  return res.json({
    ok: true,
    message: "OTP généré (voir console ou e-mail si configuré)",
    emailSent: !!(isEmail && transporter),
  });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { contact, otp } = req.body;
  if (!contact || !otp) {
    return res.status(400).json({ error: "Contact + OTP requis" });
  }

  const entry = getOtpEntry(contact);
  if (!entry) {
    return res.status(401).json({ error: "OTP non trouvé" });
  }

  if (Date.now() > entry.expiresAt) {
    deleteOtpEntry(contact);
    return res.status(401).json({ error: "OTP expiré" });
  }

  if (entry.otp !== otp) {
    return res.status(401).json({ error: "OTP incorrect" });
  }

  deleteOtpEntry(contact);
  const user = upsertUser(contact);
  req.session.user = { contact: user.contact, loginTime: Date.now() };
  return res.json({ ok: true, user: req.session.user });
});

app.get("/api/auth/session", (req, res) => {
  if (req.session.user) {
    const user = findUser(req.session.user.contact);
    return res.json({ authenticated: true, user: user || req.session.user });
  }
  return res.json({ authenticated: false });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ── API ABONNEMENTS (Stripe) ──
app.get("/api/subscription/status", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Non authentifié" });

  const user = findUser(req.session.user.contact);
  if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

  const subscription = dbFunctions.findSubscription.get(user.id);
  res.json({
    user: { contact: user.contact, role: user.role },
    subscription,
  });
});

app.post("/api/subscription/create-session", async (req, res) => {
  if (!stripeClient) {
    return res
      .status(400)
      .json({ error: "Stripe non configuré (clé manquante)" });
  }

  if (!process.env.PREMIUM_PRICE_ID) {
    return res.status(400).json({ error: "PREMIUM_PRICE_ID non configuré" });
  }

  if (!req.session.user) {
    return res.status(401).json({ error: "Utilisateur non authentifié" });
  }

  try {
    const user = findUser(req.session.user.contact);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.protocol}://${req.get("host")}/pages/mes-abonnements.html?success=true`,
      cancel_url: `${req.protocol}://${req.get("host")}/pages/mes-abonnements.html?canceled=true`,
      client_reference_id: user.id.toString(),
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Erreur Stripe:", error);
    res.status(500).json({ error: "Erreur lors de la création de la session" });
  }
});

app.post("/api/subscription/cancel", async (req, res) => {
  if (!stripeClient)
    return res.status(400).json({ error: "Stripe non configuré" });
  if (!req.session.user)
    return res.status(401).json({ error: "Non authentifié" });

  const user = findUser(req.session.user.contact);
  if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

  const sub = dbFunctions.findSubscription.get(user.id);
  if (!sub || !sub.stripe_subscription_id) {
    return res.status(400).json({ error: "Aucun abonnement actif trouvé" });
  }

  try {
    await stripeClient.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    dbFunctions.updateSubscription.run(
      "canceled",
      new Date(sub.current_period_start),
      new Date(sub.current_period_end),
      user.id,
    );
    dbFunctions.updateUserRole.run("free", user.id);

    res.json({ ok: true });
  } catch (error) {
    console.error("Erreur annulation abonnement:", error);
    res.status(500).json({ error: "Impossible d'annuler l'abonnement" });
  }
});

app.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripeClient)
      return res.status(400).json({ error: "Stripe non configuré" });

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripeClient.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      const handleSubscriptionUpdate = async (subscription) => {
        const sub = db
          .prepare(
            "SELECT * FROM subscriptions WHERE stripe_subscription_id = ?",
          )
          .get(subscription.id);
        if (!sub) return;

        dbFunctions.updateSubscription.run(
          subscription.status,
          new Date(subscription.current_period_start * 1000),
          new Date(subscription.current_period_end * 1000),
          sub.user_id,
        );

        // Mettre à jour le rôle en fonction du statut
        const newRole =
          subscription.status === "active" || subscription.status === "trialing"
            ? "premium"
            : "free";
        dbFunctions.updateUserRole.run(newRole, sub.user_id);
      };

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = parseInt(session.client_reference_id);

        const subscription = await stripeClient.subscriptions.retrieve(
          session.subscription,
        );

        dbFunctions.createSubscription.run(
          userId,
          session.customer,
          session.subscription,
          subscription.status,
          "premium",
          new Date(subscription.current_period_start * 1000),
          new Date(subscription.current_period_end * 1000),
        );

        dbFunctions.updateUserRole.run("premium", userId);
      }

      if (event.type === "customer.subscription.updated") {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
      }

      if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object;
        const subscription = await stripeClient.subscriptions.retrieve(
          invoice.subscription,
        );
        await handleSubscriptionUpdate(subscription);
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Erreur webhook:", error);
      res.status(500).json({ error: "Erreur traitement webhook" });
    }
  },
);

// ── API CONTENU ──
app.get("/api/content", (req, res) => {
  try {
    const content = dbFunctions.getAllContent.all();
    const user = req.session.user ? findUser(req.session.user.contact) : null;
    const isPremium =
      user && (user.role === "premium" || user.role === "admin");

    // Filtrer le contenu premium si l'utilisateur n'est pas premium
    const filteredContent = content.map((item) => ({
      ...item,
      file_path: isPremium || !item.is_premium ? item.file_path : null,
    }));

    res.json(filteredContent);
  } catch (error) {
    console.error("Erreur récupération contenu:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/content/:id", (req, res) => {
  try {
    const content = dbFunctions.getContentById.get(req.params.id);
    if (!content) return res.status(404).json({ error: "Contenu non trouvé" });

    const user = req.session.user ? findUser(req.session.user.contact) : null;
    const hasAccess =
      user &&
      (user.role === "premium" || user.role === "admin" || !content.is_premium);

    if (!hasAccess) {
      return res.status(403).json({ error: "Accès premium requis" });
    }

    res.json(content);
  } catch (error) {
    console.error("Erreur récupération contenu:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── API ADMIN (protégée) ──
const requireAdmin = (req, res, next) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Non authentifié" });

  const user = findUser(req.session.user.contact);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Accès admin requis" });
  }

  req.user = user;
  next();
};

app.get("/api/admin/users", requireAdmin, (req, res) => {
  try {
    const users = dbFunctions.getAllUsers.all();
    res.json(users);
  } catch (error) {
    console.error("Erreur récupération utilisateurs:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/admin/users/:id/role", requireAdmin, (req, res) => {
  try {
    const { role } = req.body;
    if (!["free", "premium", "admin"].includes(role)) {
      return res.status(400).json({ error: "Rôle invalide" });
    }

    dbFunctions.updateUserRole.run(role, req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error("Erreur mise à jour rôle:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/admin/content", requireAdmin, (req, res) => {
  try {
    const content = dbFunctions.getAllContent.all();
    res.json(content);
  } catch (error) {
    console.error("Erreur récupération contenu:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/admin/content", requireAdmin, (req, res) => {
  try {
    const { title, description, type, category, file_path, is_premium } =
      req.body;

    const result = dbFunctions.createContent.run(
      title,
      description,
      type,
      category,
      file_path,
      is_premium ? 1 : 0,
    );

    res.json({ id: result.lastInsertRowid, ok: true });
  } catch (error) {
    console.error("Erreur création contenu:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/admin/content/:id", requireAdmin, (req, res) => {
  try {
    const { title, description, type, category, file_path, is_premium } =
      req.body;

    dbFunctions.updateContent.run(
      title,
      description,
      type,
      category,
      file_path,
      is_premium ? 1 : 0,
      req.params.id,
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Erreur mise à jour contenu:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/api/admin/content/:id", requireAdmin, (req, res) => {
  try {
    dbFunctions.deleteContent.run(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error("Erreur suppression contenu:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Fallback pour l'API si besoin
app.get("/api/ping", (req, res) => res.json({ ok: true }));

// Sert les fichiers statiques (site)
app.use(express.static(__dirname));

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `✅ JFSI server démarré sur http://0.0.0.0:${PORT} (accessible depuis le réseau local)`,
  );
});
