# ClothAR Setup Guide

## Initial Setup

### 1. Environment Configuration

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual Supabase credentials in `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

3. **IMPORTANT:** Never commit `.env` to git! It's already in `.gitignore`.

### 2. Database Setup

**Option A: Automatic Migration Runner (Recommended)**

```bash
# Install dotenv if not already installed
npm install dotenv

# Run the migration script
node run-migrations.js
```

This will display all the SQL commands you need to run in Supabase.

**Option B: Manual Setup**

Run the database migration scripts in your Supabase SQL Editor in this order:

1. **Enhanced Profiles Table:**
   - Open: `ClothAR/database-migrations/01-enhance-profiles.sql`
   - Copy and run in Supabase SQL Editor

2. **Security Tables:**
   - Open: `ClothAR/database-migrations/02-security-tables.sql`
   - Copy and run in Supabase SQL Editor

3. **Functions and Triggers:**
   - Open: `ClothAR/database-migrations/03-functions-triggers.sql`
   - Copy and run in Supabase SQL Editor

### 3. SMS Provider Setup (For OTP)

#### Option A: Semaphore (Recommended for Philippines)

1. Sign up at https://semaphore.co/
2. Get your API key
3. Add to `.env`:
   ```
   SEMAPHORE_API_KEY=your-api-key
   ```

#### Option B: Twilio

1. Sign up at https://www.twilio.com/
2. Get your credentials
3. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID=your-account-sid
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=your-twilio-number
   ```

### 4. Install Dependencies

```bash
npm install
# or
yarn install
```

### 5. Run the App

```bash
npx expo start
```

## Security Checklist

- [ ] `.env` file created and configured
- [ ] `.env` is in `.gitignore`
- [ ] Database migrations run successfully
- [ ] SMS provider configured
- [ ] App runs without errors
- [ ] Can register new user
- [ ] OTP is sent and verified
- [ ] Login works with rate limiting

## Troubleshooting

### "Supabase URL and Anon Key are required" Error

- Make sure `.env` file exists
- Check that environment variables are set correctly
- Restart the Expo development server

### OTP Not Sending

- Check SMS provider credentials
- Verify phone number format (+63 for Philippines)
- Check SMS provider balance/credits

### Database Errors

- Ensure all migration scripts ran successfully
- Check Supabase dashboard for error logs
- Verify RLS policies are enabled

## Next Steps

After setup, refer to:
- `SECURITY_AUDIT.md` - Security analysis
- `DATABASE_ENHANCEMENTS.md` - Database schema details
- `OTP_IMPLEMENTATION_GUIDE.md` - OTP implementation details
- `IMPLEMENTATION_ROADMAP.md` - Full implementation plan