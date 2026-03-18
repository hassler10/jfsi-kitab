#!/usr/bin/env node
/**
 * JFSI Database Seeder — Production Ready
 *
 * Usage:
 *   node seed.js                    # Mode dev: seed content + admin
 *   node seed.js --prod             # Mode production: schema only + admin
 *   node seed.js --reset            # Reset (delete all data, rebuild schema)
 *   node seed.js --admin-only       # Create admin user only
 *   node seed.js --admin EMAIL      # Create specific admin (custom email)
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "data", "jfsi.db");
const schemaPath = path.join(__dirname, "data", "schema.sql");

// Parse CLI arguments
const args = process.argv.slice(2);
const isDev = !args.includes("--prod");
const shouldReset = args.includes("--reset");
const adminOnly = args.includes("--admin-only");
const adminIdx = args.indexOf("--admin");
const customAdminEmail = adminIdx !== -1 ? args[adminIdx + 1] : null;

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, "data"))) {
  fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
}

// Initialize database
const db = new Database(dbPath);

// Helper: Reset database
function resetDatabase() {
  console.log("🔄 Resetting database...");
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  const db = new Database(dbPath);
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);
  console.log("✅ Database reset and schema reinitialized");
  return db;
}

// Reset if requested
if (shouldReset) {
  const newDb = resetDatabase();
  newDb.close();
  const db = new Database(dbPath);
}

// Ensure schema exists
try {
  db.prepare("SELECT COUNT(*) FROM users").get();
} catch (err) {
  console.log("📋 Initializing schema...");
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);
}

// Sample content (dev mode only)
const sampleContent = [
  {
    title: "Le Saint Coran - Sourate Al-Fatiha",
    description: "La première sourate du Coran, mère du Livre.",
    type: "book",
    category: "coran",
    file_path: "documents/coran/fatiha.pdf",
    is_premium: 0,
  },
  {
    title: "Hadith du Prophète - Authenticité et Transmission",
    description: "Étude approfondie sur l'authenticité des hadiths.",
    type: "book",
    category: "hadith",
    file_path: "documents/hadith/authenticite.pdf",
    is_premium: 1,
  },
  {
    title: "Fiqh de la Prière - Guide Complet",
    description: "Manuel complet sur les règles de la prière en Islam.",
    type: "book",
    category: "fiqh",
    file_path: "documents/fiqh/priere.pdf",
    is_premium: 1,
  },
  {
    title: "Formation Aqida - Les Fondements de la Foi",
    description: "Cours sur les principes fondamentaux de l'aqida islamique.",
    type: "video",
    category: "aqida",
    file_path: "videos/formations/aqida-fondements.mp4",
    is_premium: 1,
  },
  {
    title: "Conférence Ramadan 2024",
    description: "Conférence sur les vertus du mois de Ramadan.",
    type: "audio",
    category: "spiritualite",
    file_path: "audio/conferences/ramadan-2024.mp3",
    is_premium: 0,
  },
];

// Seed content (dev/test only)
if (isDev && !adminOnly) {
  console.log("📚 Adding sample content...");
  const insertContent = db.prepare(`
    INSERT OR REPLACE INTO content (title, description, type, category, file_path, is_premium, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  sampleContent.forEach((content) => {
    insertContent.run(
      content.title,
      content.description,
      content.type,
      content.category,
      content.file_path,
      content.is_premium,
    );
  });
  console.log(`✅ ${sampleContent.length} content items added`);
}

// Create admin user
if (!adminOnly || adminOnly || customAdminEmail) {
  const adminEmail = customAdminEmail || "hasslerbenie10@gmail.com";
  console.log(`👤 Creating admin user: ${adminEmail}`);

  const createUser = db.prepare(
    "INSERT OR IGNORE INTO users (contact, role) VALUES (?, ?)",
  );
  createUser.run(adminEmail, "admin");
  console.log(`✅ Admin account ready: ${adminEmail}`);
}

// Summary
console.log("");
console.log("═══════════════════════════════════════");
console.log("✨ Database initialization complete!");
console.log("═══════════════════════════════════════");
console.log(`Mode: ${isDev ? "Development" : "Production"}`);
console.log(`Database: ${dbPath}`);
if (isDev) console.log(`Content items: ${sampleContent.length}`);
console.log("Admin user: admin@jfsi.local");
console.log("");
console.log("🚀 Start server: npm start");
console.log("");

db.close();
