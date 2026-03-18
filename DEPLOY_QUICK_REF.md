# 🚀 JFSI — Quick Deployment Reference

**One-page cheat sheet for deploying JFSI to Render.com**

---

## ⚡ TL;DR (5 Minutes)

```bash
# 1. Prepare
git push origin main

# 2. Create on Render
- render.com → New Web Service
- Connect GitHub repo JFSI
- Configuration auto-detected ✅

# 3. Add Environment Variables
NODE_ENV=production
SESSION_SECRET=<generate-random>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PREMIUM_PRICE_ID=price_...

# 4. Deploy
Button: "Create Web Service"
Wait: 3-5 minutes
Visit: https://your-app.render.com
```

✅ **Done!**

---

## 📋 Checklist

**Before Deploy:**

- [ ] GitHub repo with JFSI code
- [ ] Stripe account + Live keys
- [ ] Generate SESSION_SECRET
- [ ] Render account created

**After Deploy:**

- [ ] Site loads: https://your-app.render.com
- [ ] OTP works: test@example.com
- [ ] Stripe: test card 4242 4242 4242 4242
- [ ] Admin: admin@jfsi.local access

---

## 🔑 Generate SESSION_SECRET

```bash
# From terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to Render `SESSION_SECRET`.

---

## 💳 Stripe Setup (5 min)

1. stripe.com → Dashboard
2. Settings → API Keys → Copy SK (Secret Key)
3. Products → +Add → "Premium" → Add Price ($9.99/mo)
4. Copy Price ID
5. Settings → Webhooks → +Add endpoint
   - URL: `https://your-app.render.com/api/webhook/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`, `customer.subscription.deleted`
   - Copy Signing secret

---

## 🌐 Custom Domain (Optional)

1. Render → Service → Settings
2. Custom Domain → Add your domain
3. Copy nameservers
4. Update DNS at registrar
5. SSL auto-generated ✅

---

## 🧪 Test After Deploy

```
URL: https://your-app.render.com

1. Homepage → loads ✅
2. Connexion → works ✅
3. OTP code → appears ✅
4. Abonnements → checkout loads ✅
5. Admin access → admin@jfsi.local ✅
```

---

## ⚙️ Common Commands

```bash
# Local development
npm run dev

# Database seed
npm run seed:prod

# Backup database
./scripts/backup-db.sh

# View logs (Render)
Render Dashboard → Service → Logs
```

---

## 🆘 If Something Fails

**Build fails:**
→ Check logs: Render Dashboard > Logs

**OTP doesn't work:**
→ SMTP not configured? Use console OTP (F12)

**Stripe rejects:**
→ Check PREMIUM_PRICE_ID exists in Stripe

**Webhooks not received:**
→ Verify STRIPE_WEBHOOK_SECRET exact match

---

## 📞 Full Docs

- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed setup
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) - Complete checklist
- [INDEX.md](INDEX.md) - All documentation

---

**✅ Ready? Go to [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)**

Deploy time: 15–30 minutes  
Database size: Starts <1MB  
Monthly cost: €7+ (Render Starter)  
Monthly revenue: Stripe fees only

🚀 **Let's go!**
