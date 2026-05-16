# Octobere Backend Deployment Guide

## Overview
The backend is a Node.js Express API ready for deployment. It needs:
- **PostgreSQL** database (Neon free tier for now, Namecheap later)
- **Auth0** tenant for authentication
- **Render** (free tier) or **Namecheap** for hosting
- API keys for Resend, Twilio, OpenRouter

---

## Step 1: Set Up Auth0 (30 minutes)

1. Go to https://auth0.com and sign up for free
2. Create a **New Application** → **Single Page Application**
3. Name it `Octobere Portal`
4. Go to **Settings** → note `Domain` and `Client ID`
5. Under **Application URIs**:
   - Allowed Callback URLs: `https://octobere-portal.vercel.app`, `http://localhost:3000`
   - Allowed Logout URLs: same
   - Allowed Web Origins: same
6. Create a new **API** in Auth0:
   - Name: `Octobere API`
   - Identifier: `https://api.octobere.com`
   - Signing Algorithm: `RS256`
7. Copy these values to `.env`:
   ```
   AUTH0_DOMAIN=dev-cji3la3omjoumedw.us.auth0.com
   AUTH0_AUDIENCE=https://api.octobere.com
   AUTH0_ISSUER=https://dev-cji3la3omjoumedw.us.auth0.com/
   ```
8. In **auth-client.js** and all HTML files, replace `YOUR_AUTH0_CLIENT_ID` with your actual Client ID

---

## Step 2: Set Up Neon PostgreSQL (15 minutes)

1. Go to https://neon.tech and sign up for free
2. Create a new project → `octobere-db`
3. Copy the connection string (looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/octobere?sslmode=require`)
4. Run the schema:
   ```
   psql "YOUR_CONNECTION_STRING" -f src/db/schema.sql
   ```
5. Run the seed:
   ```
   psql "YOUR_CONNECTION_STRING" -f src/db/seed.sql
   ```
6. Add to `.env`:
   ```
   DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/octobere?sslmode=require
   ```

---

## Step 3: Set Up Render (20 minutes)

1. Go to https://render.com and sign up for free
2. Create a **New Web Service**
3. Connect your GitHub repo or use the **Blueprint** from `render.yaml`
4. Config:
   - **Name**: `octobere-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables (all from your `.env` file):
   - `DATABASE_URL`
   - `AUTH0_DOMAIN`
   - `AUTH0_AUDIENCE`
   - `AUTH0_ISSUER`
   - `RESEND_API_KEY`
   - `TWILIO_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_TO_NUMBER`
   - `OPENROUTER_API_KEY`
   - `FRONTEND_URL` = `https://octobere-portal.vercel.app`
6. Deploy → wait 2-3 minutes
7. Test: visit `https://octobere-api.onrender.com/api/health`

---

## Step 4: Update Frontend (10 minutes)

1. In `api.js`, update the API base URL (line 3):
   ```js
   const API_BASE = window.API_BASE_URL || 'https://octobere-api.onrender.com';
   ```
2. Deploy frontend to Vercel:
   ```
   git add .
   git commit -m "Migrate from Supabase to custom backend"
   git push
   ```
3. Vercel auto-deploys

---

## Step 5: Verify Everything Works

### Auth Flow
1. Go to `https://octobere-portal.vercel.app/login.html`
2. Click "Sign In" → should redirect to Auth0 login page
3. After login, redirects to portal.html

### Client Portal
1. Profile loads with user initials
2. Favorites, requests, chat all use API

### Admin Panel
1. Dashboard shows stats
2. User CRUD works
3. CMS editor saves content

---

## API Keys You'll Need

| Service | Where to Get | Free Tier |
|---------|-------------|-----------|
| **Auth0** | auth0.com | 7,000 users |
| **Neon** | neon.tech | 0.5GB storage |
| **Render** | render.com | 512MB RAM |
| **Resend** | resend.com | 100 emails/day |
| **Twilio** | twilio.com | $15 credit |
| **OpenRouter** | openrouter.ai | Free models |

---

## Moving to Namecheap Later

When ready to move from Render to Namecheap:

1. Export Neon DB: `pg_dump "NEON_URL" > backup.sql`
2. Import on Namecheap: `psql "NAMECHEAP_URL" < backup.sql`
3. Update `api.js` base URL → Namecheap URL
4. Update environment variables
5. Deploy frontend with new API URL
