// Temporary script to trigger the initial sync
fetch('https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/airtable-full-sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ manual_trigger: true })
})
.then(response => response.json())
.then(data => {
  console.log('Sync completed:', data);
})
.catch(error => {
  console.error('Sync error:', error);
});