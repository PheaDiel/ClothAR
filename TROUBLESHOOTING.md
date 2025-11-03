# Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "Invalid API key" Error

**Symptoms:**
- Registration fails with "Invalid API key"
- App crashes on startup
- Supabase connection errors

**Causes:**
- `.env` file not created or incomplete
- Environment variables not loaded
- Expo dev server not restarted after creating `.env`

**Solutions:**

1. **Check if `.env` file exists:**
   ```bash
   # In project root (ClothAR/)
   ls -la .env  # Mac/Linux
   dir .env     # Windows
   ```

2. **Verify `.env` content:**
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://ctjxkkkuprnrzxkuwoiu.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0anhra2t1cHJucnp4a3V3b2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTk4MjIsImV4cCI6MjA3MzY5NTgyMn0.JFAzkmG9lL9Z7b5SwJcY4Xssre3LROXQYXzjZryTDTY
   ```
   
   **IMPORTANT:** The anon key must be complete (very long string)!

3. **Restart Expo dev server:**
   ```bash
   # Stop current server (Ctrl+C or Cmd+C)
   # Then start again
   npx expo start --clear
   ```

4. **Clear cache if still not working:**
   ```bash
   npx expo start --clear
   # Or
   rm -rf node_modules/.cache
   npx expo start
   ```

---

### Issue 2: "No OTP Prompt" During Registration

**Symptoms:**
- Registration completes without asking for phone verification
- No OTP sent to phone
- Phone verification step skipped

**This is EXPECTED behavior!**

**Explanation:**
- The OTP system is currently using **mock/fake OTP** for development
- Real OTP with SMS will be implemented in **Day 2-3** of the sprint
- The mock OTP shows the code in an alert (for testing only)

**Current Flow:**
1. Enter phone number
2. Click "Send OTP"
3. Alert shows the OTP code (e.g., "123456")
4. Enter that code
5. Click "Verify"

**To implement real OTP:**
- Follow Day 2 implementation in `OTP_IMPLEMENTATION_GUIDE.md`
- Set up SMS provider (Semaphore or Twilio)
- Create Supabase Edge Functions
- Update PhoneVerificationStep component

---

### Issue 3: Environment Variables Not Loading

**Symptoms:**
- `process.env.EXPO_PUBLIC_SUPABASE_URL` is undefined
- Console shows "Missing" for environment variables

**Solutions:**

1. **Verify variable names start with `EXPO_PUBLIC_`:**
   ```bash
   # Correct ✅
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   
   # Wrong ❌
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   ```

2. **Check `.env` file location:**
   - Must be in project root: `ClothAR/.env`
   - NOT in `ClothAR/src/.env`

3. **Restart with clear cache:**
   ```bash
   npx expo start --clear
   ```

4. **Check for typos in `.env`:**
   - No spaces around `=`
   - No quotes around values
   - Each variable on its own line

---

### Issue 4: Registration Succeeds But No Profile Created

**Symptoms:**
- User can register but profile is empty
- Database shows user in `auth.users` but not in `profiles`

**Causes:**
- Database migrations not run
- Trigger not created or not working

**Solutions:**

1. **Run database migrations:**
   - Open Supabase SQL Editor
   - Run `database-migrations/01-enhance-profiles.sql`
   - Run `database-migrations/02-security-tables.sql`
   - Run `database-migrations/03-functions-triggers.sql`

2. **Verify trigger exists:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

3. **Check trigger function:**
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```

4. **Manually create profile if needed:**
   ```sql
   INSERT INTO public.profiles (id, name, email, role, role_status)
   SELECT id, '', email, 'customer', 'approved'
   FROM auth.users
   WHERE id NOT IN (SELECT id FROM public.profiles);
   ```

---

### Issue 5: "Account Locked" Error

**Symptoms:**
- Cannot login after multiple failed attempts
- Error: "Account is locked until..."

**This is EXPECTED behavior!**

**Explanation:**
- Security feature: Account locks after 5 failed login attempts
- Lock duration: 15 minutes
- Prevents brute force attacks

**Solutions:**

1. **Wait 15 minutes** for automatic unlock

2. **Or manually unlock in database:**
   ```sql
   UPDATE public.profiles
   SET account_locked_until = NULL,
       failed_login_attempts = 0
   WHERE email = 'your-email@example.com';
   ```

3. **Check lock status:**
   ```sql
   SELECT email, account_locked_until, failed_login_attempts
   FROM public.profiles p
   JOIN auth.users u ON p.id = u.id
   WHERE u.email = 'your-email@example.com';
   ```

---

### Issue 6: Database Connection Errors

**Symptoms:**
- "Failed to fetch"
- "Network request failed"
- Timeout errors

**Solutions:**

1. **Check internet connection**

2. **Verify Supabase project is active:**
   - Go to https://supabase.com/dashboard
   - Check project status

3. **Test connection:**
   ```javascript
   // Add to App.tsx temporarily
   import { supabase } from './src/services/supabase'
   
   supabase.from('profiles').select('count').then(
     result => console.log('✅ Connected:', result),
     error => console.error('❌ Error:', error)
   )
   ```

4. **Check RLS policies:**
   - Ensure RLS is enabled on tables
   - Verify policies allow access

---

### Issue 7: TypeScript Errors

**Symptoms:**
- Red squiggly lines in code
- "Cannot find module" errors
- Type errors

**Solutions:**

1. **Restart TypeScript server:**
   - VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"

2. **Check tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "types": ["node"]
     }
   }
   ```

3. **Install type definitions if needed:**
   ```bash
   npm install --save-dev @types/node
   ```

---

## Quick Fixes Checklist

When something goes wrong, try these in order:

- [ ] Check console for error messages
- [ ] Verify `.env` file exists and is complete
- [ ] Restart Expo dev server with `--clear` flag
- [ ] Check Supabase dashboard for errors
- [ ] Verify database migrations are run
- [ ] Clear app data on device/simulator
- [ ] Check network connection
- [ ] Review recent code changes

---

## Getting Help

If issues persist:

1. **Check error logs:**
   - Expo dev tools console
   - Supabase dashboard logs
   - Browser console (if using web)

2. **Review documentation:**
   - `SETUP_GUIDE.md`
   - `SECURITY_AUDIT.md`
   - `OTP_IMPLEMENTATION_GUIDE.md`

3. **Common error patterns:**
   - "Invalid API key" → Environment variables
   - "No OTP" → Expected (mock OTP)
   - "Account locked" → Security feature
   - "Network error" → Supabase connection

---

## Development Tips

### Best Practices

1. **Always restart after `.env` changes:**
   ```bash
   npx expo start --clear
   ```

2. **Check environment variables on startup:**
   ```javascript
   console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
   ```

3. **Use meaningful error messages:**
   ```javascript
   catch (error) {
     console.error('Registration error:', error.message)
     Alert.alert('Error', error.message)
   }
   ```

4. **Test in development mode first:**
   - Use mock OTP for testing
   - Verify database changes in Supabase dashboard
   - Check audit logs for security events

### Debugging Tools

1. **React Native Debugger**
2. **Expo Dev Tools** (press `m` in terminal)
3. **Supabase Dashboard** → Logs
4. **Chrome DevTools** (for web)

---

## Environment Setup Verification

Run this checklist to verify your setup:

```bash
# 1. Check .env file exists
cat .env  # Should show your environment variables

# 2. Check .gitignore includes .env
cat .gitignore | grep .env  # Should show .env

# 3. Verify node_modules installed
ls node_modules/@supabase  # Should show supabase-js

# 4. Check Expo is running
npx expo --version  # Should show version number

# 5. Test Supabase connection
# (Add test code to App.tsx as shown above)
```

---

## Next Steps After Fixing Issues

Once registration works:

1. ✅ Verify user created in Supabase dashboard
2. ✅ Check profile created in `profiles` table
3. ✅ Test login with created account
4. ✅ Proceed to Day 2: Real OTP implementation
