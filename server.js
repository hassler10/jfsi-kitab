/*
  JFSI — Backend minimal (Express)
  - Sert les fichiers statiques (site complet)
  - Fournit une API d'authentification OTP
  - Gère les sessions (cookie sécurisé)
*/

const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const uid = require("uid-safe");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const sqlite3 = require("sqlite3").verbose();
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

// Créer le dossier data si nécessaire
if (!fs.existsSync(path.join(__dirname, "data"))) {
  fs.mkdirSync(path.join(__dirname, "data"));
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Erreur ouverture base de données:", err);
  } else {
    console.log("✅ Base de données connectée");
    initDb();
  }
});

// Promisify db.run et db.get pour usage async
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialiser la base de données
function initDb() {
  const schemaPath = path.join(__dirname, "data", "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    // Exécuter chaque instruction séparément
    const statements = schema.split(";").filter((s) => s.trim());
    statements.forEach((stmt) => {
      db.run(stmt, (err) => {
        if (err && !err.message.includes("already exists")) {
          console.warn("Schema warning:", err.message);
        }
      });
    });
  }
}

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
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: "strict",
    },
  })
);

// Fonctions utilitaires base de données
async function findUser(contact) {
  return await dbGet("SELECT * FROM users WHERE contact = ?", [contact]);
}

async function upsertUser(contact) {
  const user = await findUser(contact);
  if (user) return user;
  await dbRun("INSERT INTO users (contact, role) VALUES (?, ?)", [
    contact,
    "free",
  ]);
  return await findUser(contact);
}

// Fonctions OTP (en mémoire)
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function setOtpEntry(contact, otp, expiresAt) {
  otpStore.set(contact, { otp, expiresAt });
}

function getOtpEntry(contact) {
  return otpStore.get(contact);
}

function deleteOtpEntry(contact) {
  otpStore.delete(contact);
}

// ── API AUTH ──
app.post("/api/auth/request-otp", async (req, res) => {
  const { contact } = req.body;
  if (!contact || typeof contact !== "string") {
    return res.status(400).json({ error: "Contact requis" });
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000;
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

app.post("/api/auth/verify-otp", async (req, res) => {
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
  try {
    const user = await upsertUser(contact);
    req.session.user = { contact: user.contact, loginTime: Date.now() };
    return res.json({ ok: true, user: req.session.user });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/auth/session", async (req, res) => {
  if (req.session.user) {
    const user = await findUser(req.session.user.contact);
    return res.json({ authenticated: true, user: user || req.session.user });
  }
  return res.json({ authenticated: false });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ── API ABONNEMENTS ──
app.get("/api/subscription/status", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Non authentifié" });

  try {
    const user = await findUser(req.session.user.contact);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const subscription = await dbGet(
      "SELECT * FROM subscriptions WHERE user_id = ?",
      [user.id]
    );
    res.json({ user: { contact: user.contact, role: user.role }, subscription });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/subscription/create-session", async (req, res) => {
  if (!stripeClient)
    return res.status(400).json({ error: "Stripe non configuré" });
  if (!process.env.PREMIUM_PRICE_ID)
    return res.status(400).json({ error: "PREMIUM_PRICE_ID non configuré" });
  if (!req.session.user)
    return res.status(401).json({ error: "Utilisateur non authentifié" });

  try {
    const user = await findUser(req.session.user.contact);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const checkoutSession = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: process.env.PREMIUM_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.protocol}://${req.get("host")}/pages/mes-abonnements.html?success=true`,
      cancel_url: `${req.protocol}://${req.get("host")}/pages/mes-abonnements.html?canceled=true`,
      client_reference_id: user.id.toString(),
    });

    res.json({ url: checkoutSession.url });
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

  try {
    const user = await findUser(req.session.user.contact);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const sub = await dbGet(
      "SELECT * FROM subscriptions WHERE user_id = ?",
      [user.id]
    );
    if (!sub || !sub.stripe_subscription_id)
      return res.status(400).json({ error: "Aucun abonnement actif trouvé" });

    await stripeClient.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await dbRun(
      "UPDATE subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
      ["canceled", user.id]
    );
    await dbRun(
      "UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ["free", user.id]
    );

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
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      const handleSubscriptionUpdate = async (subscription) => {
        const sub = await dbGet(
          "SELECT * FROM subscriptions WHERE stripe_subscription_id = ?",
          [subscription.id]
        );
        if (!sub) return;

        await dbRun(
          "UPDATE subscriptions SET status = ?, current_period_start = ?, current_period_end = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
          [
            subscription.status,
            new Date(subscription.current_period_start * 1000),
            new Date(subscription.current_period_end * 1000),
            sub.user_id,
          ]
        );

        const newRole =
          subscription.status === "active" || subscription.status === "trialing"
            ? "premium"
            : "free";
        await dbRun(
          "UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [newRole, sub.user_id]
        );
      };

      if (event.type === "checkout.session.completed") {
        const checkoutSession = event.data.object;
        const userId = parseInt(checkoutSession.client_reference_id);
        const subscription = await stripeClient.subscriptions.retrieve(
          checkoutSession.subscription
        );

        await dbRun(
          `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, plan, current_period_start, current_period_end)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            checkoutSession.customer,
            checkoutSession.subscription,
            subscription.status,
            "premium",
            new Date(subscription.current_period_start * 1000),
            new Date(subscription.current_period_end * 1000),
          ]
        );

        await dbRun(
          "UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          ["premium", userId]
        );
      }

      if (event.type === "customer.subscription.updated") {
        await handleSubscriptionUpdate(event.data.object);
      }

      if (event.type === "invoice.payment_failed") {
        const subscription = await stripeClient.subscriptions.retrieve(
          event.data.object.subscription
        );
        await handleSubscriptionUpdate(subscription);
      }

      if (event.type === "customer.subscription.deleted") {
        await handleSubscriptionUpdate(event.data.object);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Erreur webhook:", error);
      res.status(500).json({ error: "Erreur traitement webhook" });
    }
  }
);

// ── API CONTENU ──
app.get("/api/content", async (req, res) => {
  try {
    const content = await dbAll(
      "SELECT * FROM content ORDER BY created_at DESC"
    );
    const user = req.session.user ? await findUser(req.session.user.contact) : null;
    const isPremium = user && (user.role === "premium" || user.role === "admin");

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

app.get("/api/content/:id", async (req, res) => {
  try {
    const content = await dbGet("SELECT * FROM content WHERE id = ?", [
      req.params.id,
    ]);
    if (!content) return res.status(404).json({ error: "Contenu non trouvé" });

    const user = req.session.user ? await findUser(req.session.user.contact) : null;
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

// ── API ADMIN ──
const requireAdmin = async (req, res, next) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Non authentifié" });

  const user = await findUser(req.session.user.contact);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Accès admin requis" });
  }

  req.user = user;
  next();
};

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await dbAll(
      "SELECT id, contact, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["free", "premium", "admin"].includes(role)) {
      return res.status(400).json({ error: "Rôle invalide" });
    }
    await dbRun(
      "UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [role, req.params.id]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/admin/content", requireAdmin, async (req, res) => {
  try {
    const content = await dbAll(
      "SELECT * FROM content ORDER BY created_at DESC"
    );
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/admin/content", requireAdmin, async (req, res) => {
  try {
    const { title, description, type, category, file_path, is_premium } =
      req.body;
    const result = await dbRun(
      "INSERT INTO content (title, description, type, category, file_path, is_premium) VALUES (?, ?, ?, ?, ?, ?)",
      [title, description, type, category, file_path, is_premium ? 1 : 0]
    );
    res.json({ id: result.lastID, ok: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/admin/content/:id", requireAdmin, async (req, res) => {
  try {
    const { title, description, type, category, file_path, is_premium } =
      req.body;
    await dbRun(
      "UPDATE content SET title = ?, description = ?, type = ?, category = ?, file_path = ?, is_premium = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [title, description, type, category, file_path, is_premium ? 1 : 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/api/admin/content/:id", requireAdmin, async (req, res) => {
  try {
    await dbRun("DELETE FROM content WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/ping", (req, res) => res.json({ ok: true }));

// Sert les fichiers statiques
app.use(express.static(__dirname));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ JFSI server démarré sur http://0.0.0.0:${PORT}`);
});
