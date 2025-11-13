const db = require('./backend/config/database');

async function checkEvents() {
  try {
    console.log('='.repeat(50));
    console.log('DATABASE CHECK - RAW DATA');
    console.log('='.repeat(50));

    const events = await db.query('SELECT * FROM events');

    console.log('\nRaw events data:');
    console.log(JSON.stringify(events, null, 2));

    if (events.length === 0) {
      console.log('\n❌ NO EVENTS FOUND IN DATABASE');
    } else {
      console.log(`\n✅ Found ${events.length} event(s) in database`);

      // Count open events
      const openEvents = events.filter(e => e.registration_open === 1 || e.registration_open === true);
      console.log(`\n📊 Events with registration_open = TRUE: ${openEvents.length}`);

      if (openEvents.length === 0) {
        console.log('\n❌ NO EVENTS AVAILABLE FOR DROPDOWN');
        console.log('All events have registration_open = 0 (FALSE)');
      }
    }

    console.log('\n' + '='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR checking database:', error);
    process.exit(1);
  }
}

checkEvents();
