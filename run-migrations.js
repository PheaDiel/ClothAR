#!/usr/bin/env node

/**
 * Database Migration Runner for ClothAR
 *
 * This script runs the database migrations in the correct order.
 * Make sure you have your Supabase credentials set up in .env
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

console.log('🚀 Starting ClothAR Database Migrations...');
console.log('📍 Supabase URL:', SUPABASE_URL);
console.log('');

// Migration files in order
const migrations = [
  '01-enhance-profiles.sql',
  '02-security-tables.sql',
  '03-functions-triggers.sql'
];

async function runMigrations() {
  for (const migration of migrations) {
    const filePath = path.join(__dirname, 'database-migrations', migration);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      continue;
    }

    console.log(`📄 Running migration: ${migration}`);

    try {
      const sql = fs.readFileSync(filePath, 'utf8');

      // For now, just display the SQL - you'll need to run it manually in Supabase
      console.log('📋 SQL Content:');
      console.log('='.repeat(50));
      console.log(sql);
      console.log('='.repeat(50));
      console.log('');

      console.log('✅ Migration prepared. Please run this SQL in your Supabase SQL Editor.');
      console.log('');

    } catch (error) {
      console.error(`❌ Error reading migration ${migration}:`, error.message);
    }
  }

  console.log('🎉 All migrations prepared!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Open your Supabase Dashboard');
  console.log('2. Go to SQL Editor');
  console.log('3. Run each migration SQL in order');
  console.log('4. Test registration in the app');
}

runMigrations().catch(console.error);