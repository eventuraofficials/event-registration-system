const db = require('./backend/config/database');

async function runMigration() {
  console.log('🚀 Running database migration: Add form settings...\n');

  try {
    // Add registration_form_config to events table
    console.log('1️⃣  Adding registration_form_config column...');
    await db.execute(`
      ALTER TABLE events
      ADD COLUMN registration_form_config TEXT NULL
    `).catch(err => {
      if (err.message && err.message.includes('duplicate column name')) {
        console.log('   ⏭️  Column registration_form_config already exists, skipping...');
      } else {
        throw err;
      }
    });

    // Update existing events with default form config
    console.log('2️⃣  Setting default form config for existing events...');
    const defaultConfig = JSON.stringify({
      fields: {
        full_name: { enabled: true, required: true, label: 'Full Name' },
        email: { enabled: true, required: true, label: 'Email Address' },
        contact_number: { enabled: true, required: true, label: 'Contact Number' },
        home_address: { enabled: true, required: false, label: 'Home Address' },
        company_name: { enabled: true, required: false, label: 'Company Name' },
        guest_category: { enabled: true, required: false, label: 'Guest Category' }
      },
      custom_fields: []
    });

    await db.execute(`
      UPDATE events
      SET registration_form_config = ?
      WHERE registration_form_config IS NULL
    `, [defaultConfig]);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('   - Added registration_form_config column to events table');
    console.log('   - Set default form configuration for existing events');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
