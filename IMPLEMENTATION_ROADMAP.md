# JFSI Project - Implementation Roadmap

Priority-ordered roadmap to make the site fully operational.

---

## 🚀 Phase 1: Get Working (TODAY - 1-2 hours)

### What You Get

- Backend server running
- Database populated with sample data
- Library pages showing real content
- Admin dashboard showing data
- Complete backend API functional

### Steps

#### 1.1 Start Backend

```bash
cd c:\Users\HP\Desktop\jfsi-final
npm install
npm start
```

**Expected**: Server starts on `http://localhost:3000` without errors

#### 1.2 Create Configuration File

Create file: `.env`

```properties
NODE_ENV=development
PORT=3000
SESSION_SECRET=jfsi-demo-secret-key-12345
DB_PATH=data/jfsi.db
```

#### 1.3 Populate Database

```bash
node seed.js
```

**Expected Output**:

```
✅ Base de données remplie avec du contenu exemple
📚 5 éléments de contenu ajoutés
```

#### 1.4 Test It Works

- Open `http://localhost:3000`
- Click a category in Library
- Should show 5 sample books instead of "No content"
- Try filters → They now query the database

---

## 🔐 Phase 2: Email OTP (OPTIONS - 2-3 hours)

### Current State

- OTP displays only in browser console (F12)
- Can't send to real email

### Option A: Gmail Setup (Recommended)

1. Go to https://myaccount.google.com/apppasswords
2. Create "App password" for Mail
3. Copy password
4. Add to `.env`:

```properties
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=JFSI <noreply@jfsi.local>
```

5. Restart server: `npm start`
6. Test: Login → Enter email → Check email for OTP code

### Option B: Use Brevo/Sendinblue (Free)

1. Create free account at https://www.brevo.com
2. Get SMTP credentials
3. Add to `.env`
4. Test same as Gmail

### Option C: Use Mailtrap (Development Only)

1. Create free account at https://mailtrap.io
2. Use SMTP credentials provided
3. Test emails appear in Mailtrap inbox
4. Don't use in production!

---

## 💳 Phase 3: Stripe Payments (1-2 weeks)

### Prerequisites

- Stripe account (free at https://stripe.com)

### Steps

#### 3.1 Get Stripe Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Note your:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)
   - **Webhook Signing Secret** (if you set up webhooks)

#### 3.2 Configure .env

```properties
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

#### 3.3 Create Price IDs

In Stripe Dashboard → Products → Create Product:

1. Name: "JFSI Premium"
2. Pricing: Recurring, Monthly
3. Price: 9.99/month
4. Copy the Price ID (looks like `price_1O8n2...`)

```properties
PREMIUM_PRICE_ID=price_your_price_id_here
```

#### 3.4 Test Payment Flow

1. Restart server
2. Go to Subscriptions page
3. Click "S'abonner"
4. Should redirect to Stripe Checkout
5. Use test card: `4242 4242 4242 4242`, exp: any future date, CVC: any 3 digits

#### 3.5 Set Up Webhooks (Advanced)

1. Install **Stripe CLI**: https://stripe.com/docs/stripe-cli
2. Run: `stripe listen --forward-to localhost:3000/api/webhook/stripe`
3. Copy signing secret to `.env`
4. Now real payments will trigger subscription creation

---

## 👤 Phase 4: Admin Dashboard (2-3 days)

### Current State

- UI exists, no functionality
- Anyone can access (no verification)
- No data displayed

### What Needs Implementation

#### 4.1 Admin Verification

In `server.js`, the `requireAdmin` middleware exists but is incomplete:

```javascript
// Line ~340 - This needs database check
const requireAdmin = (req, res, next) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Non authentifié" });

  const user = findUser(req.session.user.contact); // ← Need to implement findUser()
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Accès admin requis" });
  }

  req.user = user;
  next();
};
```

**Missing**: Implement `findUser()` function that queries database

#### 4.2 User Management API

Already exists but needs testing:

- `GET /api/admin/users` — List all users
- `PUT /api/admin/users/:id/role` — Change user role

**Test with curl**:

```bash
curl http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json"
```

#### 4.3 Content Management API

Already exists:

- `GET /api/admin/content` — List all content
- `POST /api/admin/content` — Add new content
- `PUT /api/admin/content/:id` — Update content
- `DELETE /api/admin/content/:id` — Delete content

**Test creating content**:

```bash
curl -X POST http://localhost:3000/api/admin/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Book",
    "description": "Book description",
    "type": "book",
    "category": "fiqh",
    "file_path": "documents/fiqh/new-book.pdf",
    "is_premium": 0
  }'
```

#### 4.4 Frontend Dashboard (JavaScript)

Create `js/admin.js`:

```javascript
// Initialize admin dashboard
class AdminDashboard {
  constructor() {
    this.loadUsers();
    this.loadContent();
  }

  async loadUsers() {
    const res = await fetch("/api/admin/users");
    const users = await res.json();
    // Display in table
    this.displayUsers(users);
  }

  async loadContent() {
    const res = await fetch("/api/admin/content");
    const content = await res.json();
    // Display in table
    this.displayContent(content);
  }

  // Implement display methods
}

// Start on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const dashboard = new AdminDashboard();
  });
} else {
  const dashboard = new AdminDashboard();
}
```

Add to `pages/admin-dashboard.html`:

```html
<script src="../js/admin.js"></script>
```

#### 4.5 Make Admin Dashboard Functional

1. Add user/content tables to HTML
2. Implement CRUD operations
3. Add permission checks
4. Add delete/edit buttons

---

## 📊 Phase 5: Content Migration (1 week)

### Current Issues

- Only 5 sample items in database
- All actual content is hardcoded in HTML
- No real books/courses available

### Task List

#### 5.1 Extract HTML Content

Review each page:

- `pages/bibliotheque.html` → Extract all `<div class="livre-card">` entries
- `pages/formations.html` → Extract all `<div class="formation-card">` entries

#### 5.2 Create Data Migration Script

Create `migrate-from-html.js`:

```javascript
// Parse HTML files
// Extract book/formation data
// Insert into database with proper categorization
// Update file_path references
```

#### 5.3 Update database/seed.js

Add all content from HTML:

```javascript
const sampleContent = [
  // From bibliotheque.html
  {
    title: "Tafsir Al-Quran",
    description: "Qur'anic interpretation",
    type: "book",
    category: "coran",
    file_path: "documents/coran/tafsir.pdf",
    is_premium: 0,
  },
  // From formations.html
  {
    title: "Arabic Basics",
    description: "Learn Arabic fundamentals",
    type: "video",
    category: "arabic",
    file_path: "videos/formations/arabic-basics.mp4",
    is_premium: 1,
  },
  // ... all 30+ items
];
```

#### 5.4 Re-run Seed

```bash
rm data/jfsi.db  # Delete old database
node seed.js      # Create fresh with all content
```

---

## 🔒 Phase 6: Security Improvements (Ongoing)

### Session Security

- [ ] Use secure cookies instead of sessionStorage
- [ ] Add CSRF protection
- [ ] Implement rate limiting on OTP
- [ ] Add IP whitelist for admin

### Example Secure Config

```javascript
// In server.js
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // ← Prevents XSS access
      secure: true, // ← HTTPS only
      sameSite: "strict", // ← CSRF protection
      maxAge: 1000 * 60 * 60, // ← 1 hour
    },
  }),
);
```

### Password Hashing

Install: `npm install bcryptjs`

Use for storing passwords if you add them:

```javascript
const bcrypt = require("bcryptjs");
const hashed = bcrypt.hashSync(password, 10);
```

---

## 🌐 Phase 7: Deployment (1-2 weeks)

### Platform Options

#### Option 1: Heroku (Easiest)

```bash
npm install -g heroku
heroku login
heroku create jfsi-app
git push heroku main
```

#### Option 2: AWS

1. EC2 instance (t2.micro free tier)
2. Install Node.js
3. Use PM2 for process management
4. Set up SSL with Let's Encrypt

#### Option 3: DigitalOcean

1. Create droplet ($5/month)
2. Install Node.js
3. Use Nginx reverse proxy
4. Set up domain

### Pre-Deployment Checklist

- [ ] Environment variables set
- [ ] Database backed up
- [ ] HTTPS/SSL enabled
- [ ] Email configured
- [ ] Stripe live keys ready
- [ ] File uploads tested
- [ ] Admin functions tested
- [ ] All links verified

---

## 📈 Phase 8: Scaling (After Launch)

### Monitor & Optimize

- [ ] Set up error logging (Sentry)
- [ ] Monitor performance (New Relic)
- [ ] Track user analytics (Google Analytics)
- [ ] Set up automated backups

### Add Features

- [ ] User profiles
- [ ] Ratings/reviews
- [ ] Discussion forums
- [ ] Live classes via Zoom
- [ ] Mobile app
- [ ] Social sharing

---

## ⏱️ Timeline Summary

| Phase     | Task                | Days         | Priority    |
| --------- | ------------------- | ------------ | ----------- |
| 1         | Backend + Database  | 0.5          | 🔴 Critical |
| 2         | Email OTP           | 0.5          | 🟡 High     |
| 3         | Stripe Payments     | 5            | 🟡 High     |
| 4         | Admin Dashboard     | 3            | 🟡 High     |
| 5         | Content Migration   | 5            | 🟡 High     |
| 6         | Security            | 2            | 🟡 High     |
| 7         | Deployment          | 7            | 🟢 Medium   |
| 8         | Scaling             | ?            | 🟢 Low      |
| **Total** | **Full Production** | **~24 days** |             |

---

## ✅ How to Track Progress

After each phase, verify:

1. ✅ All previous features still work
2. ✅ No new errors in console
3. ✅ Database still has data
4. ✅ All APIs respond correctly

---

## 🆘 If Something Breaks

Common issues and fixes:

### "Database locked"

```bash
# Close all connections
# Delete jfsi.db
rm data/jfsi.db
node seed.js
npm start
```

### "Module not found"

```bash
npm install
npm start
```

### "Port 3000 in use"

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# OR change .env PORT to 3001
```

### "Email not sending"

- Check `.env` has SMTP settings
- Test SMTP credentials separately
- Check firewall allows SMTP port

---

## 🎓 Resources

- **Express.js**: https://expressjs.com
- **SQLite**: https://www.sqlite.org/docs.html
- **Stripe**: https://stripe.com/docs
- **Nodemailer**: https://nodemailer.com
- **Node.js**: https://nodejs.org/docs

---

**Next Step**: Start with Phase 1 (30 minutes) to get the backend running!
