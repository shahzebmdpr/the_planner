# Aman Study Tracker — Minimalist Duo Study & Knowledge Gap Tracker

A clean, minimalist collaborative study tracker for two study partners. Add chapters and topics, mark completion, and instantly visualize what you've mastered, what your friend has mastered, and what gaps remain between you.

Syncs in real-time across devices via **Upstash Redis** (serverless) and deploys seamlessly to **Vercel** with zero token exposure.

---

## 🔐 User Authentication & Master Key Regulation

- **Study Partners**: Pre-configured for **Shahzeb** and **Aman** (default passcodes: `1234`).
- **Master Key**: `thekey` — unlocks the regulator panel to add users, change usernames, or update passcodes.
- **Anti-Tampering Lock**: 
  - When **Aman** logs in, Aman can **only** check/uncheck his own topics. Shahzeb's checkmarks are locked (`🔒`) and cannot be altered by Aman.
  - When **Shahzeb** logs in, Shahzeb can **only** check/uncheck his own topics. Aman's checkmarks are locked (`🔒`) and cannot be altered by Shahzeb.
  - Your ticked items remain 100% safe and un-disturbed!


---

## 🚀 How to Deploy on Vercel via GitHub (Safely)

Your `.env` file with secret keys will **never** be pushed to GitHub because `.gitignore` excludes it. Instead, you'll add the Upstash credentials securely directly inside the Vercel dashboard.

### Step 1: Push This Project to GitHub

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `the_planner` or `aman-study-tracker`). Keep it Public or Private — your secrets are safe either way.
2. In your terminal inside this project folder, run:
   ```bash
   # 1. Stage all project files (safe — .gitignore blocks .env)
   git add .

   # 2. Commit the changes
   git commit -m "Initial commit: Aman Study Tracker with Upstash sync"

   # 3. Rename branch to main if not already
   git branch -M main

   # 4. Link your GitHub repository (replace with your repo URL)
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

   # 5. Push to GitHub
   git push -u origin main
   ```

*(Notice that `.env.example` is committed as a reference template, while `.env` stays strictly local.)*

---

### Step 2: Get Free Upstash Redis Credentials (30 seconds)

1. Sign up / Log in at [console.upstash.com](https://console.upstash.com) (free tier, no credit card required).
2. Click **"Create Database"** → choose **Redis** → select your nearest region → Click **Create**.
3. On your database page, scroll down to the **"REST API"** section.
4. Select the **JavaScript / Fetch** tab.
5. You'll see:
   - `UPSTASH_REDIS_REST_URL` (starts with `https://...`)
   - `UPSTASH_REDIS_REST_TOKEN` (a long string of characters)
   Keep these handy for the next step!

---

### Step 3: Import Project into Vercel & Add Environment Variables

1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New..."** → **"Project"**.
3. Find your GitHub repository and click **"Import"**.
4. In the configuration screen, expand the **"Environment Variables"** section:
   - Add Key: `UPSTASH_REDIS_REST_URL`  
     Value: `https://your-database.upstash.io`
   - Add Key: `UPSTASH_REDIS_REST_TOKEN`  
     Value: `your_upstash_token_here`
5. Click **"Deploy"**.

---

### Step 4: Done! Share with Your Friend

- Once deployment finishes, Vercel gives you a live URL (e.g. `https://your-planner.vercel.app`).
- When you open the website, it automatically detects the Vercel serverless proxy (`/api/sync`) and connects to your Upstash Redis database!
- Send the URL to your friend. Both of you can now update topics and see each other's progress in real-time.

---

## 💻 Running Locally (Optional)

If you want to run the project locally on your machine with Node.js:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your Upstash credentials:
   ```env
   UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_token_here
   PORT=8080
   ```
3. Start the server:
   ```bash
   node server.js
   ```
4. Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🔒 Security: Why Secrets Never Leak

- `.gitignore` explicitly ignores `.env`, `.env.local`, and all variations.
- The browser frontend talks to the `/api/sync` serverless endpoint on Vercel.
- The serverless function accesses `process.env.UPSTASH_REDIS_REST_URL` and `process.env.UPSTASH_REDIS_REST_TOKEN` securely server-side.
- Your secret Upstash token is **never** sent to the client browser or included in public Git commits.
