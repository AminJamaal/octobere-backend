# Octobere Backend - Namecheap Stellar Plus Deployment

## Prerequisites
- Namecheap Stellar Plus hosting with Node.js and PostgreSQL enabled
- cPanel access credentials
- FTP or cPanel File Manager access

## Step 1: Prepare the Backend Files

1. Zip the entire `backend/` folder (excluding `node_modules/` and `.env`)
2. Upload via cPanel **File Manager** or **FTP** to your desired directory
3. Extract the zip on the server

## Step 2: Set Up Node.js App in cPanel

1. In cPanel, search for **"Setup Node.js App"**
2. Click **Create Application** or **Add Application**
3. Configure:
   - **Node.js version**: Select 18.x or higher
   - **Application mode**: Production
   - **Application root**: `/path/to/backend` (where you uploaded the files)
   - **Application startup file**: `start.js`
   - **Application entry point**: `npm start` (or leave as `start.js`)
   - **Environment variables**: Add each variable from `.env`
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
     - `NODE_ENV` = `production`
4. Click **Create**

## Step 3: Install Dependencies

1. In cPanel, open **Terminal** (or SSH)
2. Navigate to your app root: `cd /path/to/backend`
3. Run: `npm install --production`
4. The app will auto-start

## Step 4: Set Up PostgreSQL

1. In cPanel, search for **"PostgreSQL Databases"**
2. Create a new database (e.g., `octobere_crm`)
3. Create a database user with a strong password
4. Add the user to the database with ALL PRIVILEGES
5. Open **phpPgAdmin** or use **psql** to run the schema:
   - Copy the contents of `src/db/schema.sql`
   - Paste and execute in the SQL window
   - Then run `src/db/seed.sql`

## Step 5: Update Frontend

1. Update `config.js` on your Vercel deployment:
   ```js
   API_BASE_URL: 'https://your-domain.com' // Your Namecheap domain
   ```
2. Or update the Vercel env var `API_BASE_URL`
3. Also update the Auth0 callback URLs if your domain changed

## Step 6: Verify

1. Visit `https://your-domain.com/api/health`
2. Expected response: `{ "status": "ok", "timestamp": "..." }`

## Troubleshooting

### App won't start
- Check `~/logs/app.log` or the Node.js app status in cPanel
- Ensure all environment variables are set
- Run `node -e "import('./src/config.js')"` to test module loading

### Database connection fails
- Verify PostgreSQL is running: `SELECT version();`
- Check the connection string in `.env`
- Ensure the database user has proper permissions

### Port issues
- cPanel assigns a random port (usually 8080+)
- The `PORT` env var is auto-set by cPanel
- Use `.htaccess` or cPanel's **Redirects** to proxy requests
