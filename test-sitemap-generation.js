// Test sitemap generation
async function testSitemap() {
  try {
    const response = await fetch('https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/generate-sitemap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY'
      }
    });
    
    const text = await response.text();
    console.log('Sitemap generation response:', text);
    
    // Check if specific tokens are included
    const tokens = ['pendle', 'rndr', 'zro', 'aitech', 'skl'];
    tokens.forEach(token => {
      if (text.includes(`/token/${token}`)) {
        console.log(`✅ Found: /token/${token}`);
      } else {
        console.log(`❌ Missing: /token/${token}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSitemap();