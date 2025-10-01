# Supabase Setup Guide for Anonymous Video Face Blur

This guide will help you set up a free PostgreSQL database on Supabase for anonymous video processing.

## Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, GitLab, or email
4. Verify your email address

## Step 2: Create New Project

1. Click "New Project"
2. Fill in the details:
   - **Name**: `faceblur-anonymous` (or any name you like)
   - **Database Password**: Generate a strong password and save it!
   - **Region**: Choose closest to your users (e.g., US East, EU West)
3. Click "Create new project"
4. Wait 2-3 minutes for the project to initialize

## Step 3: Get Database Connection Details

1. Once project is ready, go to **Settings** (left sidebar)
2. Click **Database**
3. Scroll down to **Connection string** section
4. Copy the **URI** connection string (it looks like `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres`)

## Step 4: Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy and paste the contents of `supabase_simple.sql` from this repository
4. Click "Run" or press `Ctrl+Enter`
5. You should see "Success: No rows returned" if everything worked

## Step 5: Update Render Environment Variables

Go to your [Render dashboard](https://dashboard.render.com) and update these environment variables for both your web service and worker:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
DB_HOST=db.[PROJECT-ID].supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR-PASSWORD]

# Keep these existing settings
NODE_ENV=production
SKIP_DB_MIGRATION_ON_ERROR=true
```

## Step 6: Test the Connection

1. Redeploy your services on Render
2. Check the logs to see if database connection is successful
3. Test the API endpoints - they should now work with persistent storage

## Database Features

### Anonymous Sessions
- Users get automatic session IDs without registration
- Sessions expire after 24 hours
- Data is automatically cleaned up after 7 days

### Video Processing
- Track video upload and processing status
- Store face detection results
- Log all processing activities

### Automatic Cleanup
- Expired videos are automatically deleted
- Old sessions are cleaned up
- Processing logs are maintained for debugging

## Security Notes

- This setup allows anonymous access (no authentication required)
- Each user gets a unique session ID automatically
- Data expires after 7 days for privacy
- No personal information is stored

## Troubleshooting

### Connection Issues
- Make sure your Supabase project is fully initialized (wait 2-3 minutes)
- Check that the connection string is copied correctly
- Verify environment variables are set correctly in Render

### Database Errors
- Check Render logs for specific error messages
- Ensure the SQL schema was executed successfully in Supabase
- Verify database credentials are correct

### Performance
- Free tier has limits: 500MB storage, 2GB bandwidth
- Consider upgrading if you need more resources
- Monitor usage in Supabase dashboard

## Next Steps

Once your database is working:
1. Test video upload and processing
2. Verify face detection is working
3. Check that processing history is saved
4. Monitor database usage in Supabase dashboard

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Render Documentation](https://render.com/docs)
- Check application logs for specific errors