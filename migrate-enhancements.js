const db = require('./backend/config/database');

async function runMigration() {
  console.log('🚀 Running database migration: Add enhancement features...\n');

  try {
    // Add guest_category to guests table (SQLite uses TEXT instead of ENUM)
    console.log('1️⃣  Adding guest_category column...');
    await db.execute(`
      ALTER TABLE guests
      ADD COLUMN guest_category TEXT DEFAULT 'Regular' CHECK(guest_category IN ('VIP', 'Speaker', 'Sponsor', 'Media', 'Regular'))
    `).catch(err => {
      if (err.message && err.message.includes('duplicate column name')) {
        console.log('   ⏭️  Column guest_category already exists, skipping...');
      } else {
        throw err;
      }
    });

    // Add check-in gate tracking
    console.log('2️⃣  Adding check_in_gate column...');
    await db.execute(`
      ALTER TABLE guests
      ADD COLUMN check_in_gate TEXT NULL
    `).catch(err => {
      if (err.message && err.message.includes('duplicate column name')) {
        console.log('   ⏭️  Column check_in_gate already exists, skipping...');
      } else {
        throw err;
      }
    });

    // Add max_capacity to events table
    console.log('3️⃣  Adding max_capacity column...');
    await db.execute(`
      ALTER TABLE events
      ADD COLUMN max_capacity INTEGER DEFAULT NULL
    `).catch(err => {
      if (err.message && err.message.includes('duplicate column name')) {
        console.log('   ⏭️  Column max_capacity already exists, skipping...');
      } else {
        throw err;
      }
    });

    // Add event_qr_code to events table
    console.log('4️⃣  Adding event_qr_code column...');
    await db.execute(`
      ALTER TABLE events
      ADD COLUMN event_qr_code TEXT NULL
    `).catch(err => {
      if (err.message && err.message.includes('duplicate column name')) {
        console.log('   ⏭️  Column event_qr_code already exists, skipping...');
      } else {
        throw err;
      }
    });

    // Create indexes
    console.log('5️⃣  Creating indexes...');
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_guest_category ON guests(guest_category)
    `).catch(err => console.log('   ⏭️  Index creation handled by IF NOT EXISTS'));

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_check_in_gate ON guests(check_in_gate)
    `).catch(err => console.log('   ⏭️  Index creation handled by IF NOT EXISTS'));

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('   - Added guest_category column to guests table');
    console.log('   - Added check_in_gate column to guests table');
    console.log('   - Added max_capacity column to events table');
    console.log('   - Added event_qr_code column to events table');
    console.log('   - Created performance indexes');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
