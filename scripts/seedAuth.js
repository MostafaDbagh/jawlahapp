/**
 * Seed (or reset) one mock account per role for development & QA, plus a demo
 * restaurant for the merchant account.
 *
 *   npm run seed:auth          (uses MONGO_URI from .env)
 *
 * Idempotent: re-running upserts each account (account_type + flags refreshed,
 * password reset to the documented value) and ensures the merchant's demo
 * vendor/branch/product exist. Credentials are documented in SEED_AUTH.md.
 *
 * ⚠️  MONGO_URI in .env points at the shared live Atlas DB. Point MONGO_URI at a
 * dev database before running if you don't want these mock accounts in prod:
 *   MONGO_URI=mongodb://127.0.0.1:27017/jawla_dev npm run seed:auth
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');
const Branch = require('../src/models/Branch');
const Product = require('../src/models/Product');

// Parse a full international phone the SAME way the OTP-login flow does
// (last 10 digits = national number), so phone-OTP login matches what we store.
function parsePhone(raw) {
  const clean = String(raw || '').replace(/^\+/, '');
  return { phone_number: clean.slice(-10), country_code: `+${clean.slice(0, -10) || '1'}` };
}

// Mock accounts — one per account_type. Email roles log in via email+password
// (web portal); DRIVER/CUSTOMER log in via phone OTP (mobile/driver app) using
// the dev master code 000000 (works when NODE_ENV !== 'production').
//
// Phone format matters for the OTP accounts: Syrian national numbers are stored
// in leading-0 form (0XXXXXXXXX, 10 digits) because the mobile apps build the
// international string as +963 + 0 + national. So a phone-login number MUST be
// written as +9630XXXXXXXXX here — drop the 0 and parsePhone() (last 10 digits)
// eats a country-code digit and OTP login can never match. (Email accounts below
// keep the 9-digit form since they never match by phone.)
const ACCOUNTS = [
  { username: 'admin',    email: 'admin@jawlah.sy',    password: 'Admin123',     full_name: 'مدير المنصة',  account_type: 'PLATFORM_ADMIN',         phone: '+963900000000' },
  { username: 'owner',    email: 'owner@jawlah.sy',    password: 'Owner12345',   full_name: 'مالك المنصة',  account_type: 'PLATFORM_OWNER',         phone: '+963900000001' },
  { username: 'merchant', email: 'merchant@jawlah.sy', password: 'Merchant123',  full_name: 'صاحب مطعم',    account_type: 'SERVICE_PROVIDER_OWNER', phone: '+963900000002' },
  { username: 'support',  email: 'support@jawlah.sy',  password: 'Support123',   full_name: 'خدمة العملاء', account_type: 'CUSTOMER_SERVICE',       phone: '+963900000003' },
  { username: 'driver',   email: 'driver@jawlah.sy',   password: 'Driver12345',  full_name: 'سائق جولة',    account_type: 'DRIVER',                 phone: '+9630944000001', metadata: { vehicle: 'دراجة نارية', rating: 5, is_online: false } },
  { username: 'customer', email: 'customer@jawlah.sy', password: 'Customer123',  full_name: 'عميل جولة',    account_type: 'CUSTOMER',               phone: '+9630944000002' },
];

async function upsertUser(def) {
  const { phone_number, country_code } = parsePhone(def.phone);
  let user = await User.findOne({ email: def.email });
  if (!user) {
    user = new User({
      username: def.username,
      email: def.email,
      full_name: def.full_name,
      country_code,
      phone_number,
      account_type: def.account_type,
      is_active: true,
      is_verified: true,
      email_verified: true,
      phone_verified: true,
      metadata: def.metadata || null,
      password_hash: 'placeholder',
      salt: 'placeholder',
    });
  } else {
    user.full_name = def.full_name;
    user.account_type = def.account_type;
    user.country_code = country_code;
    user.phone_number = phone_number;
    user.is_active = true;
    user.is_verified = true;
    user.email_verified = true;
    user.phone_verified = true;
    if (def.metadata) user.metadata = def.metadata;
  }
  await user.setPassword(def.password); // hashes + saves
  return user;
}

(async () => {
  await connectDB();

  const byType = {};
  for (const def of ACCOUNTS) {
    const u = await upsertUser(def);
    byType[def.account_type] = u;
    console.log(`✓ ${def.account_type.padEnd(22)} ${def.email}  (${def.phone})`);
  }

  // Demo restaurant for the merchant so the owner portal is fully usable.
  const merchant = byType.SERVICE_PROVIDER_OWNER;
  let vendor = await Vendor.findOne({ owner_user_id: merchant.user_id });
  if (!vendor) {
    vendor = await Vendor.create({
      name: 'مطعم جولة التجريبي',
      owner_user_id: merchant.user_id,
      type: 'restaurant',
      about: 'مطعم تجريبي لاختبار لوحة التاجر',
      approval_status: 'approved',
      is_active: true,
    });
    console.log(`✓ demo vendor created: ${vendor.name} (${vendor.id})`);
  } else {
    await vendor.update({ approval_status: 'approved', is_active: true });
    console.log(`✓ demo vendor present: ${vendor.name} (${vendor.id})`);
  }

  let branch = await Branch.findOne({ vendor_id: vendor.id });
  if (!branch) {
    branch = await Branch.create({
      vendor_id: vendor.id,
      name: 'الفرع الرئيسي',
      city: 'دمشق',
      address: 'شارع الحمراء',
      lat: 33.5138,
      lng: 36.2765,
      delivery_fee: 3000,
      free_delivery: false,
      is_active: true,
    });
    console.log(`✓ demo branch created: ${branch.name}`);
  }

  const product = await Product.findOne({ branch_id: branch.id });
  if (!product) {
    await Product.create({ branch_id: branch.id, name: 'شاورما دجاج', price: 25000, is_active: true });
    console.log('✓ demo product created: شاورما دجاج');
  }

  console.log('\nDone. See jawlahapp/SEED_AUTH.md for credentials & login flows.');
  console.log('⚠️  Change these passwords before using any shared/production environment.');

  await mongoose.connection.close();
  process.exit(0);
})().catch((err) => {
  console.error('Failed to seed auth mocks:', err.message);
  process.exit(1);
});
