// Quick test script to verify Supabase Storage bucket configuration
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cllrgwibouypimgccfng.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbHJnd2lib3V5cGltZ2NjZm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY3NDk5NywiZXhwIjoyMDc1MjUwOTk3fQ.yzGk8iFaCmIhZnGOGYFEx6X8gLlP-W7B22mUVN3C9Hs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
  console.log('🔍 Testing Supabase Storage Configuration...\n');

  try {
    // Test 1: Check if bucket exists
    console.log('1. Checking if product-images bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Failed to list buckets:', bucketsError.message);
      return;
    }

    const productImagesBucket = buckets.find(b => b.name === 'product-images');
    if (!productImagesBucket) {
      console.error('❌ product-images bucket does not exist!');
      console.log('Available buckets:', buckets.map(b => b.name));
      return;
    }

    console.log('✅ product-images bucket exists');
    console.log('   - Public:', productImagesBucket.public);
    console.log('   - Created:', productImagesBucket.created_at);

    // Test 2: Try to list objects in bucket
    console.log('\n2. Testing bucket access...');
    const { data: objects, error: listError } = await supabase.storage
      .from('product-images')
      .list('', { limit: 1 });

    if (listError) {
      console.error('❌ Cannot access product-images bucket:', listError.message);
      console.error('   This usually means policies are missing or incorrect');
      return;
    }

    console.log('✅ Can access product-images bucket');
    console.log('   Objects in bucket:', objects?.length || 0);

    // Test 3: Try upload simulation (without actual file)
    console.log('\n3. Testing upload permissions...');
    // We'll simulate by trying to upload a tiny text file
    const testFile = new Blob(['test'], { type: 'text/plain' });
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload('test-connection.txt', testFile, { upsert: true });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
      console.error('   This confirms the policies are blocking uploads');
    } else {
      console.log('✅ Upload test successful');
      // Clean up test file
      await supabase.storage.from('product-images').remove(['test-connection.txt']);
    }

    console.log('\n🎯 DIAGNOSIS:');
    if (uploadError) {
      console.log('The issue is with storage policies. Check Supabase Security Adviser for errors.');
    } else {
      console.log('Storage is configured correctly. The issue might be in the app code.');
    }

  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
  }
}

testStorage();