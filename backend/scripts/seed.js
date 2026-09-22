// Seed demo data into a real PostgreSQL (uses shared demo seed).
// Usage: npm run db:seed
import 'dotenv/config';
import pg from 'pg';
import { seedDemoData } from '../src/config/seed.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await seedDemoData(pool);
  if (result.seeded) {
    console.log(`✅ Demo data seeded (userId: ${result.userId})`);
  } else {
    console.log(`ℹ️ Skip: ${result.reason}`);
  }
} catch (err) {
  console.error('❌ Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}