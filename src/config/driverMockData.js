// Mock / seed data for the driver side of Jawlah, kept separate from the main
// seedData.js so the driver app's demo data lives in one place.
//
// Contains three things:
//   1. driverUsers           — demo DRIVER account(s) for the driver app login.
//   2. mockDriverSnapshot     — the public { name, vehicle, rating, avatar } blob
//                               shown on a customer's tracking screen.
//   3. buildDriverJobBoardOrders(ctx) — factory for the `ready`, unclaimed orders
//                               that populate the driver job board (needs the
//                               resolved branches/products + Order model).

// Demo driver account(s). Log in from the driver app with 0955555555 / OTP 000000.
// phone_number is the 10-digit value the backend parser extracts from the dialled
// number, so +9630955555555 maps here. metadata.{vehicle,rating} surface on the
// driver profile + the snapshot written onto an order when this driver accepts it.
const driverUsers = [
  {
    username: 'kareem', email: 'kareem@jawlah.sy', full_name: 'Kareem Najjar',
    country_code: '+963', phone_number: '0955555555', gender: 'male',
    password_hash: 'seedphonelogin', salt: 'seedsalt', account_type: 'DRIVER',
    is_active: true, phone_verified: true, preferred_language: 'ar',
    metadata: { vehicle: 'Motorbike', rating: 4.9, is_online: true }
  }
];

// Public driver snapshot for the sample `on_the_way` order so the customer
// tracking screen shows driver details. Display-only mock (not linked to a real
// driver_user_id) — a real driver's snapshot is written by the accept endpoint.
const mockDriverSnapshot = {
  name: 'Khaled',
  vehicle: 'Motorcycle • Red',
  rating: '4.8',
  avatar: 'https://i.pravatar.cc/150?img=12'
};

// Build the `ready`, unclaimed orders that give the driver job board something to
// accept. A factory because orders reference real branch/product ids resolved
// during seeding, plus Order.buildTimeline for the status timeline.
//   ctx: { Order, userId, branches, products }
function buildDriverJobBoardOrders({ Order, userId, branches, products }) {
  const branch = branches[1];
  const items = [
    { product_id: products[1].id, name: products[1].name, image: products[1].image, unit_price: products[1].price, qty: 1, options: null },
    { product_id: products[3].id, name: products[3].name, image: products[3].image, unit_price: products[3].price, qty: 2, options: null }
  ];
  const subtotal = items.reduce((s, it) => s + it.unit_price * it.qty, 0);
  const deliveryFee = 5500;
  return [
    {
      user_id: userId, branch_id: branch.id, vendor_name: branch.name,
      items, subtotal, delivery_fee: deliveryFee, discount: 0,
      total: subtotal + deliveryFee, currency: 'SYP', payment_method: 'COD', status: 'ready',
      delivery_address: 'Malki, Damascus', leave_at_door: false, dont_ring_bell: false,
      status_timeline: Order.buildTimeline('ready'), eta_minutes: 25
    }
  ];
}

module.exports = { driverUsers, mockDriverSnapshot, buildDriverJobBoardOrders };
