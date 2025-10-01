# SUPABASE CREDENTIALS FIX GUIDE

## Problem Identified
The current Supabase credentials are invalid. The password appears to be a JWT token instead of a PostgreSQL password.

## Solution: Get Correct Credentials from Supabase Dashboard

### Step 1: Access Your Supabase Project
1. Go to https://app.supabase.com
2. Sign in to your account
3. Select your project (aaitxlxpoplreysthvrf)

### Step 2: Get Database Connection Details
1. In your project dashboard, go to **Settings** (left sidebar)
2. Click on **Database**
3. Scroll down to **Connection Info** section
4. You'll see the connection details:
   - Host: `aaitxlxpoplreysthvrf.supabase.co` (should match)
   - Port: `5432` (should match)
   - Database: `postgres` (should match)
   - User: `postgres` (should match)
   - Password: **This is what you need to copy**

### Step 3: Update Your Code
Replace the password in these files with the actual password from your dashboard:

1. **src/config/database.js** - Line ~10
2. **test-db-connection.js** - Line ~8
3. **test-supabase-connection-string.js** - Line ~4

### Step 4: Alternative Connection Methods

#### Option A: Use Connection String
Supabase provides a connection string format:
```
postgresql://postgres:[YOUR-ACTUAL-PASSWORD]@aaitxlxpoplreysthvrf.supabase.co:5432/postgres
```

#### Option B: Use Supabase Client Library
If direct PostgreSQL connection continues to fail, you can use the Supabase client library:
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://aaitxlxpoplreysthvrf.supabase.co', 'your-actual-anon-key');
```

### Step 5: Test the Connection
After updating the credentials, run:
```bash
node diagnose-supabase-connection.js
```

### Important Notes:
- **Do not share your actual password** - the repository will be hidden but keep it secure
- **Wait 2-3 minutes** after creating a new Supabase project for it to fully initialize
- **Check firewall settings** if connection still fails after correct credentials
- **PostgreSQL password ≠ JWT token** - they are different things

### If You Still Have Issues:
1. Make sure your Supabase project is fully initialized
2. Try resetting the database password in Supabase dashboard
3. Check if there are any IP restrictions in your Supabase settings
4. Verify the SQL schema was executed successfully in Supabase

## Current Status: ⚠️ CREDENTIALS NEED UPDATE
The network connectivity is working, but authentication is failing due to invalid credentials.