/*
  JFSI — Backend (Express + PostgreSQL)
*/

const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const uid = require("uid-safe");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const stripe = require("stripe");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      contact VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(50) DEFAULT 'free',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      status VARCHAR(50),
      plan VARCHAR(50),
      current_period_start TIMESTAMP,
      current_period_end TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS content (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(50),
      category VARCHAR(100),
      file_path VARCHAR(500),
      is_premium BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS user_content_access (
      user_id INTEGER REFERENCES users(id),
      content_id INTEGER REFERENCES content(id),
      PRIMARY KEY (user_id, content_id)
    )`);
    console.log("✅ Base de données initialisée");
  } catch (err) {
    console.error("❌ Erreur DB:", err.message);
  }
}
initDb();

// SMTP
const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null;

// Stripe
const stripeClient = process.env.STRIPE_SECRET_KEY
  ? stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Session
const SESSION_SECRET = process.env.SESSION_SECRET || "jfsi-secret-demo";
app.use(session({
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
}));

// Helpers DB
async function findUser(contact) {
  const r = await pool.query("SELECT * FROM users WHERE contact = $1", [contact]);
  return r.rows[0] || null;
}
async function upsertUser(contact) {
  const user = await findUser(contact);
  if (user) return user;
  const r = await pool.query(
    "INSERT INTO users (contact, role) VALUES ($1, $2) RETURNING *",
    [contact, "free"]
  );
  return r.rows[0];
}

// OTP
const otpStore = new Map();
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── AUTH ──
app.post("/api/auth/request-otp", async (req, res) => {
  const { contact } = req.body;
  if (!contact || typeof contact !== "string")
    return res.status(400).json({ error: "Contact requis" });

  const otp = generateOTP();
  otpStore.set(contact, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

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
      console.warn("Email OTP non envoyé", err);
    }
  }

  console.log(`OTP pour ${contact} : ${otp}`);
  return res.json({ ok: true, message: "OTP généré", emailSent: !!(isEmail && transporter) });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { contact, otp } = req.body;
  if (!contact || !otp) return res.status(400).json({ error: "Contact + OTP requis" });

  const entry = otpStore.get(contact);
  if (!entry) return res.status(401).json({ error: "OTP non trouvé" });
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(contact);
    return res.status(401).json({ error: "OTP expiré" });
  }
  if (entry.otp !== otp) return res.status(401).json({ error: "OTP incorrect" });

  otpStore.delete(contact);
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
  req.session.destroy(() => res.json({ ok: true }));
});

// ── SETUP ADMIN (route temporaire) ──
app.get("/api/setup-admin", async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO users (contact, role) VALUES ($1, 'admin') ON CONFLICT (contact) DO UPDATE SET role = 'admin'",
      ["hasslerbenie10@gmail.com"]
    );
    res.json({ ok: true, message: "✅ Admin créé ! Tu peux supprimer cette route." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ABONNEMENTS ──
app.get("/api/subscription/status", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Non authentifié" });
  try {
    const user = await findUser(req.session.user.contact);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    const sub = await pool.query("SELECT * FROM subscriptions WHERE user_id = $1", [user.id]);
    res.json({ user: { contact: user.contact, role: user.role }, subscription: sub.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/subscription/cancel", async (req, res) => {
  if (!stripeClient) return res.status(400).json({ error: "Stripe non configuré" });
  if (!req.session.user) return res.status(401).json({ error: "Non authentifié" });
  try {
    const user = await findUser(req.session.user.contact);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    const sub = await pool.query("SELECT * FROM subscriptions WHERE user_id = $1", [user.id]);
    if (!sub.rows[0]?.stripe_subscription_id)
      return res.status(400).json({ error: "Aucun abonnement actif" });
    await stripeClient.subscriptions.update(sub.rows[0].stripe_subscription_id, { cancel_at_period_end: true });
    await pool.query("UPDATE subscriptions SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE user_id=$2", ["canceled", user.id]);
    await pool.query("UPDATE users SET role=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2", ["free", user.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Impossible d'annuler" });
  }
});

// ── CONTENU ──
app.get("/api/content", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM content ORDER BY created_at DESC");
    const user = req.session.user ? await findUser(req.session.user.contact) : null;
    const isPremium = user && (user.role === "premium" || user.role === "admin");
    const filtered = result.rows.map((item) => ({
      ...item,
      file_path: isPremium || !item.is_premium ? item.file_path : null,
    }));
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/content/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM content WHERE id = $1", [req.params.id]);
    const content = result.rows[0];
    if (!content) return res.status(404).json({ error: "Contenu non trouvé" });
    const user = req.session.user ? await findUser(req.session.user.contact) : null;
    const hasAccess = user && (user.role === "premium" || user.role === "admin" || !content.is_premium);
    if (!hasAccess) return res.status(403).json({ error: "Accès premium requis" });
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── ADMIN ──
const requireAdmin = async (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "Non authentifié" });
  const user = await findUser(req.session.user.contact);
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Accès admin requis" });
  req.user = user;
  next();
};

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, contact, role, created_at FROM users ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["free", "premium", "admin"].includes(role))
      return res.status(400).json({ error: "Rôle invalide" });
    await pool.query("UPDATE users SET role=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2", [role, req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/admin/content", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM content ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/admin/content", requireAdmin, async (req, res) => {
  try {
    const { title, description, type, category, file_path, is_premium } = req.body;
    const result = await pool.query(
      "INSERT INTO content (title, description, type, category, file_path, is_premium) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [title, description, type, category, file_path, is_premium || false]
    );
    res.json({ id: result.rows[0].id, ok: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/admin/content/:id", requireAdmin, async (req, res) => {
  try {
    const { title, description, type, category, file_path, is_premium } = req.body;
    await pool.query(
      "UPDATE content SET title=$1,description=$2,type=$3,category=$4,file_path=$5,is_premium=$6,updated_at=CURRENT_TIMESTAMP WHERE id=$7",
      [title, description, type, category, file_path, is_premium || false, req.params.id]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/api/admin/content/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM content WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/ping", (req, res) => res.json({ ok: true }));

// Fichiers statiques
app.use(express.static(__dirname));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ JFSI server démarré sur http://0.0.0.0:${PORT}`);
});
