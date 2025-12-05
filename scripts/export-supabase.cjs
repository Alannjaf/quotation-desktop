/**
 * Supabase Data Export Script
 * 
 * This script exports all data from your Supabase database to a JSON file
 * that can be imported into the Quotation Desktop app.
 * 
 * Usage:
 * 1. Update the SUPABASE_URL and SUPABASE_KEY below with your credentials
 *    (Use the service_role key for full access, not anon key)
 * 2. Run: node export-supabase.cjs
 * 3. The export file will be created in the current directory
 * 4. Import this file into the desktop app via Settings > Data > Import
 */

const fs = require('fs');

// UPDATE THESE WITH YOUR SUPABASE CREDENTIALS
// You can find these in your Supabase project settings > API
const SUPABASE_URL = "https://kqjznewgfiwzbxhwtubn.supabase.co";
// Use the service_role key (not anon key) for full database access
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxanpuZXdnZml3emJ4aHd0dWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODEzNjM4NiwiZXhwIjoyMDUzNzEyMzg2fQ.kRC36VVebyG0cZq7K8ZkvvAa34wgo-O_jJ6AM_xFS3M"; // Replace with your service_role key

async function fetchAllFromTable(tableName) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch ${tableName}:`, response.status, errorText);
    return [];
  }

  return response.json();
}

async function exportData() {
  console.log('Starting Supabase data export...\n');

  if (SUPABASE_KEY === "YOUR_SERVICE_ROLE_KEY_HERE") {
    console.error('❌ Please update SUPABASE_KEY with your service_role key!');
    console.log('\nTo get your service_role key:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Click on Settings (gear icon) > API');
    console.log('3. Copy the "service_role" key (NOT the anon key)');
    console.log('4. Paste it in this script and run again\n');
    process.exit(1);
  }

  try {
    // Fetch all tables
    console.log('Fetching quotations...');
    const quotations = await fetchAllFromTable('quotations');
    console.log(`  Found ${quotations.length} quotations`);

    console.log('Fetching quotation items...');
    const quotation_items = await fetchAllFromTable('quotation_items');
    console.log(`  Found ${quotation_items.length} items`);

    console.log('Fetching vendors...');
    const vendors = await fetchAllFromTable('vendors');
    console.log(`  Found ${vendors.length} vendors`);

    console.log('Fetching recipients...');
    const recipients = await fetchAllFromTable('recipients');
    console.log(`  Found ${recipients.length} recipients`);

    console.log('Fetching categories...');
    const categories = await fetchAllFromTable('categories');
    console.log(`  Found ${categories.length} categories`);

    console.log('Fetching item types...');
    const item_types = await fetchAllFromTable('item_types');
    console.log(`  Found ${item_types.length} item types`);

    console.log('Fetching exchange rates...');
    const exchange_rates = await fetchAllFromTable('exchange_rates');
    console.log(`  Found ${exchange_rates.length} exchange rates`);

    console.log('Fetching company settings...');
    const company_settings = await fetchAllFromTable('company_settings');
    console.log(`  Found ${company_settings.length} settings`);

    // Create export object
    const exportObj = {
      quotations: quotations.map(q => ({
        id: q.id,
        quotation_number: q.quotation_number,
        project_name: q.project_name,
        date: q.date,
        validity_date: q.validity_date,
        budget_type: q.budget_type,
        recipient: q.recipient,
        currency_type: q.currency_type,
        vendor_id: q.vendor_id,
        vendor_cost: q.vendor_cost || 0,
        vendor_currency_type: q.vendor_currency_type || 'usd',
        discount: q.discount || 0,
        note: q.note,
        description: q.description,
        status: q.status,
        created_at: q.created_at,
        updated_at: q.updated_at,
      })),
      quotation_items: quotation_items.map(i => ({
        id: i.id,
        quotation_id: i.quotation_id,
        name: i.name,
        description: i.description,
        quantity: i.quantity,
        type_id: i.type_id,
        category_id: i.category_id,
        unit_price: i.unit_price,
        price: i.price,
        total_price: i.total_price,
        created_at: i.created_at,
        updated_at: i.updated_at,
      })),
      vendors: vendors.map(v => ({
        id: v.id,
        name: v.name,
        created_at: v.created_at,
        updated_at: v.updated_at,
      })),
      recipients: recipients.map(r => ({
        id: r.id,
        name: r.name,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      item_types: item_types.map(t => ({
        id: t.id,
        name: t.name,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      exchange_rates: exchange_rates.map(e => ({
        id: e.id,
        rate: e.rate,
        date: e.date,
        created_at: e.created_at,
        updated_at: e.updated_at,
      })),
      settings: company_settings.map(s => ({
        id: s.id,
        company_address: s.company_address,
        logo_url: s.logo_url,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
      exported_at: new Date().toISOString(),
      version: '1.0.0',
    };

    // Write to file
    const filename = `supabase-export-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(exportObj, null, 2));

    console.log('\n✅ Export completed successfully!');
    console.log(`📁 File saved as: ${filename}`);
    console.log('\nTo import into the desktop app:');
    console.log('1. Open Quotation Desktop');
    console.log('2. Go to Settings > Data tab');
    console.log('3. Click "Import Data" and select the exported file');

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

// Run export
exportData();

