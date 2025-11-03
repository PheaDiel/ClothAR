#!/usr/bin/env node

/**
 * Quick Fix for ClothAR Registration Issues
 *
 * This script helps diagnose and fix common registration problems.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🔧 ClothAR Quick Fix Tool');
console.log('==========================\n');

// Check environment variables
console.log('1. Checking Environment Variables:');
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.log('❌ EXPO_PUBLIC_SUPABASE_URL is missing');
} else {
  console.log('✅ EXPO_PUBLIC_SUPABASE_URL is set');
}

if (!SUPABASE_ANON_KEY) {
  console.log('❌ EXPO_PUBLIC_SUPABASE_ANON_KEY is missing');
} else {
  console.log('✅ EXPO_PUBLIC_SUPABASE_ANON_KEY is set');
}

console.log('');

// Check if .env file exists
console.log('2. Checking .env file:');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('EXPO_PUBLIC_SUPABASE_URL')) {
    console.log('✅ .env contains Supabase URL');
  } else {
    console.log('❌ .env missing Supabase URL');
  }
  if (envContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY')) {
    console.log('✅ .env contains Supabase Anon Key');
  } else {
    console.log('❌ .env missing Supabase Anon Key');
  }
} else {
  console.log('❌ .env file does not exist');
}

console.log('');

// Check migration files
console.log('3. Checking Migration Files:');
const migrations = [
  '01-enhance-profiles.sql',
  '02-security-tables.sql',
  '03-functions-triggers.sql'
];

let allMigrationsExist = true;
migrations.forEach(migration => {
  const filePath = path.join(__dirname, 'database-migrations', migration);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${migration} exists`);
  } else {
    console.log(`❌ ${migration} missing`);
    allMigrationsExist = false;
  }
});

console.log('');

// Recommendations
console.log('4. Recommendations:');
console.log('==================');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log('• Create/update .env file with Supabase credentials');
  console.log('• Copy from .env.example and fill in your values');
}

if (!fs.existsSync(envPath)) {
  console.log('• Create .env file in project root');
}

if (!allMigrationsExist) {
  console.log('• Run: node run-migrations.js to see migration SQL');
  console.log('• Copy and run each migration in Supabase SQL Editor');
}

console.log('• Restart Expo: npx expo start --clear');
console.log('• Test registration flow');

console.log('');
console.log('5. Next Steps:');
console.log('==============');
console.log('1. Fix any ❌ issues above');
console.log('2. Run database migrations in Supabase');
console.log('3. Restart Expo dev server');
console.log('4. Try registration again');
console.log('5. Check console logs for debugging info');

console.log('');
console.log('🎯 Expected Console Output During Registration:');
console.log('• 🔵 Starting registration...');
console.log('• ✅ Supabase signup successful');
console.log('• ⚠️ Profile not found, creating manually... (if migrations not run)');
console.log('• ✅ Profile created manually');
console.log('• 🎯 Setting user state');
console.log('• 🔄 Navigation - User state changed: {hasUser: true}');
console.log('• Dashboard should appear!');

console.log('');
console.log('📞 Need help? Check TROUBLESHOOTING.md for detailed solutions.');