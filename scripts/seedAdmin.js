/**
 * Seed (or reset) a platform admin account for the web dashboard.
 *
 *   node scripts/seedAdmin.js
 *
 * Credentials come from env (with safe local defaults). Override before
 * running in any shared environment, then change the password after first login.
 *
 *   ADMIN_EMAIL=admin@jawlah.sy ADMIN_PASSWORD='Admin123' node scripts/seedAdmin.js
 *
 * Idempotent: if the email already exists it is promoted to PLATFORM_ADMIN and
 * its password is reset to the given value.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const User = require('../src/models/User');

const EMAIL = (process.env.ADMIN_EMAIL || 'admin@jawlah.sy').toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123';
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PHONE = process.env.ADMIN_PHONE || '900000000';

(async () => {
  await connectDB();

  let user = await User.findOne({ email: EMAIL });

  if (user) {
    user.account_type = 'PLATFORM_ADMIN';
    user.is_active = true;
    user.is_verified = true;
    user.email_verified = true;
    await user.setPassword(PASSWORD); // hashes + saves
    console.log(`✓ Updated existing user to PLATFORM_ADMIN: ${EMAIL}`);
  } else {
    user = new User({
      username: USERNAME,
      email: EMAIL,
      full_name: 'Platform Admin',
      country_code: '+963',
      phone_number: PHONE,
      account_type: 'PLATFORM_ADMIN',
      is_active: true,
      is_verified: true,
      email_verified: true,
      // setPassword fills password_hash + salt; seed placeholders to satisfy required fields first.
      password_hash: 'placeholder',
      salt: 'placeholder',
    });
    await user.setPassword(PASSWORD);
    console.log(`✓ Created PLATFORM_ADMIN: ${EMAIL}`);
  }

  console.log('  Login at the web dashboard with:');
  console.log(`    email:    ${EMAIL}`);
  console.log(`    password: ${PASSWORD}`);
  console.log('  ⚠️  Change this password after first login.');

  await mongoose.connection.close();
  process.exit(0);
})().catch((err) => {
  console.error('Failed to seed admin:', err.message);
  process.exit(1);
});
