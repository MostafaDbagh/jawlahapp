// One-off test helper: assign the seeded driver to the demo customer's most
// recent order so the tracking screen shows a real driver name + phone number.
// Mirrors exactly what the driver app writes on claim (driverSnapshot).
//   Usage: node scripts/assignTestDriver.js
require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/database');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const { driverSnapshot } = require('../src/utils/driverSnapshot');

const CUSTOMER_PHONE = '0911111111'; // demo login
const DRIVER_PHONE = '0955555555';   // seeded driver (Kareem Najjar)

(async () => {
  try {
    await connectDB();

    const customer = await User.findOne({ phone_number: CUSTOMER_PHONE });
    if (!customer) throw new Error(`No customer with phone ${CUSTOMER_PHONE}`);

    const driver = await User.findOne({ phone_number: DRIVER_PHONE });
    if (!driver) throw new Error(`No driver with phone ${DRIVER_PHONE}`);

    // Most recent order for the demo customer.
    const order = await Order.findOne({ user_id: customer.user_id }).sort({ created_at: -1 });
    if (!order) throw new Error(`No orders for customer ${customer.user_id}`);

    const snapshot = driverSnapshot(driver);
    order.driver_user_id = driver.user_id;
    order.driver = snapshot;
    // If the order hasn't reached "on the way" yet, nudge it so the driver card
    // is the natural thing to show; otherwise leave the status untouched.
    await order.save();

    console.log('✅ Assigned driver to order:', order.order_id);
    console.log('   status   :', order.status);
    console.log('   driver   :', JSON.stringify(snapshot));
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌', err.message);
    try { await mongoose.connection.close(); } catch {}
    process.exit(1);
  }
})();
