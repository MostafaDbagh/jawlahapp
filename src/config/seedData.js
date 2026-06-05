const { connectDB } = require('./database');
const {
  User,
  AccountType,
  Category,
  Vendor,
  Branch,
  Subcategory,
  Product,
  ProductVariation,
  Review,
  Offer,
  Promotion,
  Notification,
  Cart,
  Order,
  OTP,
  Session,
  Role,
  Permission
} = require('../models');

// ---------------------------------------------------------------------------
// Jawlah seed — Damascus, Syria. Food-focused catalog, Cash-on-Delivery only.
// Demo login: phone 0911111111 (or any number) + master OTP code 000000.
// The 0911111111 user owns the seeded orders + notifications so the order
// history / tracking / notifications screens render real data right away.
// ---------------------------------------------------------------------------

// Per-category food images (Unsplash).
const CAT_IMG = {
  Shawarma: 'https://images.unsplash.com/photo-1633321088355-d0f81134ca3b?w=600',
  Burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
  Pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
  Grills: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
  Chicken: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600',
  Breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600',
  Sandwiches: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600',
  Arabic: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600',
  Healthy: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
  Coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
  Desserts: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600',
  'Ice Cream': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600',
  Fried: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600',
  Bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
  'Fast Food': 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600',
  International: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600'
};

const IMG = {
  shawarma: CAT_IMG.Shawarma,
  grill: CAT_IMG.Grills,
  baklava: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600',
  coffee: CAT_IMG.Coffee,
  pizza: CAT_IMG.Pizza,
  burger: CAT_IMG.Burgers,
  bakery: CAT_IMG.Bakery,
  fries: CAT_IMG.Fried,
  sandwich: CAT_IMG.Sandwiches,
  mezze: CAT_IMG.Arabic
};

// The food categories shown on the home screen (order preserved).
const CATEGORY_NAMES = [
  'Shawarma', 'Burgers', 'Pizza', 'Grills', 'Chicken', 'Breakfast',
  'Sandwiches', 'Arabic', 'Healthy', 'Coffee', 'Desserts', 'Ice Cream',
  'Fried', 'Bakery', 'Fast Food', 'International'
];

const workTime = {
  monday: '10:00-23:30',
  tuesday: '10:00-23:30',
  wednesday: '10:00-23:30',
  thursday: '10:00-23:30',
  friday: '12:00-24:00',
  saturday: '10:00-24:00',
  sunday: '10:00-23:00'
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding (Damascus / Syria)...');
    await connectDB();

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      AccountType.deleteMany({}),
      Category.deleteMany({}),
      Vendor.deleteMany({}),
      Branch.deleteMany({}),
      Subcategory.deleteMany({}),
      Product.deleteMany({}),
      ProductVariation.deleteMany({}),
      Review.deleteMany({}),
      Offer.deleteMany({}),
      Promotion.deleteMany({}),
      Notification.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
      OTP.deleteMany({}),
      Session.deleteMany({}),
      Role.deleteMany({}),
      Permission.deleteMany({})
    ]);
    console.log('🗑️  Cleared existing data');

    // Account types
    const accountTypes = await AccountType.insertMany([
      { type_code: 'CUSTOMER', type_name: 'Customer', description: 'Regular customer account' },
      { type_code: 'DRIVER', type_name: 'Driver', description: 'Delivery driver account' },
      { type_code: 'SERVICE_PROVIDER_OWNER', type_name: 'Service Provider Owner', description: 'Business owner account' }
    ]);
    console.log('👤 Created account types');

    // Users — Syrian numbers. phone_number is the 10-digit value the backend
    // parser extracts from the dialled number, so logging in with these exact
    // digits maps to these accounts.
    const users = await User.insertMany([
      {
        username: 'ahmad', email: 'ahmad@jawlah.sy', full_name: 'Ahmad Khaled',
        country_code: '+963', phone_number: '0911111111', gender: 'male',
        password_hash: 'seedphonelogin', salt: 'seedsalt', account_type: 'CUSTOMER',
        is_active: true, phone_verified: true, preferred_language: 'ar'
      },
      {
        username: 'lina', email: 'lina@jawlah.sy', full_name: 'Lina Hassan',
        country_code: '+963', phone_number: '0922222222', gender: 'female',
        password_hash: 'seedphonelogin', salt: 'seedsalt', account_type: 'CUSTOMER',
        is_active: true, phone_verified: true, preferred_language: 'ar'
      },
      {
        username: 'omar', email: 'omar@jawlah.sy', full_name: 'Omar Saleh',
        country_code: '+963', phone_number: '0933333333', gender: 'male',
        password_hash: 'seedphonelogin', salt: 'seedsalt', account_type: 'CUSTOMER',
        is_active: true, phone_verified: true, preferred_language: 'ar'
      },
      {
        username: 'noura', email: 'noura@jawlah.sy', full_name: 'Noura Ali',
        country_code: '+963', phone_number: '0944444444', gender: 'female',
        password_hash: 'seedphonelogin', salt: 'seedsalt', account_type: 'CUSTOMER',
        is_active: true, phone_verified: true, preferred_language: 'ar'
      }
    ]);
    console.log('👥 Created 4 users');

    // Categories (the food categories shown on the home screen)
    const categories = await Category.insertMany(
      CATEGORY_NAMES.map((name) => ({ name, image: CAT_IMG[name] || null, free_delivery: false }))
    );
    console.log(`📂 Created ${categories.length} categories`);
    const cat = (name) => categories.find((c) => c.name === name);

    // Vendors (Damascus food shops)
    const vendors = await Vendor.insertMany([
      { name: 'Shawarma Al-Sham', image: IMG.shawarma, about: 'Authentic Damascene shawarma and grills.', is_active: true },
      { name: 'Damascus Sweets', image: IMG.baklava, about: 'Traditional Syrian sweets and desserts.', is_active: true },
      { name: 'Abu Shaker Grill', image: IMG.grill, about: 'Charcoal kebab and mezze, a Damascus favourite.', is_active: true },
      { name: 'Pizza Corner', image: IMG.pizza, about: 'Wood-fired pizza and Italian favourites.', is_active: true },
      { name: 'Café Younes', image: IMG.coffee, about: 'Specialty coffee and fresh pastries.', is_active: true },
      { name: 'Burger House', image: IMG.burger, about: 'Juicy smash burgers, fried chicken and fries.', is_active: true }
    ]);
    console.log('🏪 Created 6 vendors');

    // Branches — clustered around central Damascus (33.5138, 36.2765)
    const branches = await Branch.insertMany([
      { vendor_id: vendors[0].id, name: 'Shawarma Al-Sham — Mezzeh', image: IMG.shawarma, lat: 33.5102, lng: 36.2480, address: 'Mezzeh Highway', city: 'Damascus', work_time: workTime, delivery_time: '25-40 min', min_order: 20000, delivery_fee: 5000, free_delivery: false, is_active: true },
      { vendor_id: vendors[1].id, name: 'Damascus Sweets — Salhiyah', image: IMG.baklava, lat: 33.5165, lng: 36.2920, address: 'Salhiyah St', city: 'Damascus', work_time: workTime, delivery_time: '30-45 min', min_order: 15000, delivery_fee: 4000, free_delivery: false, is_active: true },
      { vendor_id: vendors[2].id, name: 'Abu Shaker Grill — Abu Rummaneh', image: IMG.grill, lat: 33.5210, lng: 36.2790, address: 'Abu Rummaneh', city: 'Damascus', work_time: workTime, delivery_time: '30-50 min', min_order: 30000, delivery_fee: 6000, free_delivery: false, is_active: true },
      { vendor_id: vendors[3].id, name: 'Pizza Corner — Shaalan', image: IMG.pizza, lat: 33.5158, lng: 36.2885, address: 'Shaalan', city: 'Damascus', work_time: workTime, delivery_time: '25-40 min', min_order: 25000, delivery_fee: 5000, free_delivery: false, is_active: true },
      { vendor_id: vendors[4].id, name: 'Café Younes — Malki', image: IMG.coffee, lat: 33.5249, lng: 36.2731, address: 'Malki', city: 'Damascus', work_time: workTime, delivery_time: '15-30 min', min_order: 12000, delivery_fee: 3000, free_delivery: false, is_active: true },
      { vendor_id: vendors[5].id, name: 'Burger House — Baramkeh', image: IMG.burger, lat: 33.5096, lng: 36.2837, address: 'Baramkeh', city: 'Damascus', work_time: workTime, delivery_time: '25-40 min', min_order: 20000, delivery_fee: 5000, free_delivery: false, is_active: true }
    ]);
    console.log('🏢 Created 6 branches');

    // Subcategories (each tied to one of the food categories above)
    const subcategories = await Subcategory.insertMany([
      // Shawarma Al-Sham
      { branch_id: branches[0].id, category_id: cat('Shawarma').id, name: 'Shawarma', image: CAT_IMG.Shawarma, has_offer: true, sort_order: 1, is_active: true },
      { branch_id: branches[0].id, category_id: cat('Grills').id, name: 'Grills', image: CAT_IMG.Grills, sort_order: 2, is_active: true },
      { branch_id: branches[0].id, category_id: cat('Sandwiches').id, name: 'Sandwiches', image: CAT_IMG.Sandwiches, sort_order: 3, is_active: true },
      // Damascus Sweets
      { branch_id: branches[1].id, category_id: cat('Desserts').id, name: 'Baklava', image: IMG.baklava, has_offer: true, sort_order: 1, is_active: true },
      { branch_id: branches[1].id, category_id: cat('Desserts').id, name: 'Maamoul', image: IMG.baklava, sort_order: 2, is_active: true },
      // Abu Shaker Grill
      { branch_id: branches[2].id, category_id: cat('Grills').id, name: 'Kebab', image: CAT_IMG.Grills, has_offer: true, sort_order: 1, is_active: true },
      { branch_id: branches[2].id, category_id: cat('Arabic').id, name: 'Mezze', image: CAT_IMG.Arabic, sort_order: 2, is_active: true },
      // Pizza Corner
      { branch_id: branches[3].id, category_id: cat('Pizza').id, name: 'Pizza', image: CAT_IMG.Pizza, has_offer: true, sort_order: 1, is_active: true },
      { branch_id: branches[3].id, category_id: cat('Fast Food').id, name: 'Sides', image: CAT_IMG['Fast Food'], sort_order: 2, is_active: true },
      // Café Younes
      { branch_id: branches[4].id, category_id: cat('Coffee').id, name: 'Hot Drinks', image: CAT_IMG.Coffee, sort_order: 1, is_active: true },
      { branch_id: branches[4].id, category_id: cat('Bakery').id, name: 'Pastries', image: CAT_IMG.Bakery, has_offer: true, sort_order: 2, is_active: true },
      // Burger House
      { branch_id: branches[5].id, category_id: cat('Burgers').id, name: 'Burgers', image: CAT_IMG.Burgers, has_offer: true, sort_order: 1, is_active: true },
      { branch_id: branches[5].id, category_id: cat('Fried').id, name: 'Fried', image: CAT_IMG.Fried, sort_order: 2, is_active: true }
    ]);
    console.log('📁 Created subcategories');
    const sub = (name) => subcategories.find((s) => s.name === name);

    // Products (prices in SYP)
    const products = await Product.insertMany([
      // Shawarma Al-Sham
      { branch_id: branches[0].id, subcategory_id: sub('Shawarma').id, name: 'Chicken Shawarma Sandwich', description: 'Marinated chicken, garlic toum, pickles in saj bread.', image: IMG.shawarma, price: 15000, is_active: true },
      { branch_id: branches[0].id, subcategory_id: sub('Shawarma').id, name: 'Meat Shawarma Plate', description: 'Beef shawarma with fries, salad and tahini.', image: IMG.shawarma, price: 35000, is_active: true },
      { branch_id: branches[0].id, subcategory_id: sub('Grills').id, name: 'Grilled Chicken Half', description: 'Charcoal-grilled half chicken with garlic and bread.', image: IMG.grill, price: 45000, is_active: true },
      // Damascus Sweets
      { branch_id: branches[1].id, subcategory_id: sub('Baklava').id, name: 'Mixed Baklava (500g)', description: 'Assorted pistachio and cashew baklava.', image: IMG.baklava, price: 60000, is_active: true },
      { branch_id: branches[1].id, subcategory_id: sub('Maamoul').id, name: 'Maamoul with Dates (1kg)', description: 'Semolina cookies filled with dates.', image: IMG.baklava, price: 80000, is_active: true },
      // Abu Shaker Grill
      { branch_id: branches[2].id, subcategory_id: sub('Kebab').id, name: 'Kebab Hindi', description: 'Spiced minced-meat kebab in tomato sauce.', image: IMG.grill, price: 50000, is_active: true },
      { branch_id: branches[2].id, subcategory_id: sub('Mezze').id, name: 'Mezze Platter', description: 'Hummus, mutabbal, tabbouleh and fattoush.', image: IMG.grill, price: 40000, is_active: true },
      // Pizza Corner
      { branch_id: branches[3].id, subcategory_id: sub('Pizza').id, name: 'Margherita Pizza', description: 'Tomato, mozzarella and fresh basil.', image: IMG.pizza, price: 45000, is_active: true },
      { branch_id: branches[3].id, subcategory_id: sub('Pizza').id, name: 'Pepperoni Pizza', description: 'Spicy pepperoni with mozzarella.', image: IMG.pizza, price: 55000, is_active: true },
      { branch_id: branches[3].id, subcategory_id: sub('Sides').id, name: 'Garlic Bread', description: 'Oven-baked bread with garlic butter.', image: IMG.bakery, price: 18000, is_active: true },
      // Café Younes
      { branch_id: branches[4].id, subcategory_id: sub('Hot Drinks').id, name: 'Cappuccino', description: 'Espresso with steamed milk foam.', image: IMG.coffee, price: 12000, is_active: true },
      { branch_id: branches[4].id, subcategory_id: sub('Pastries').id, name: 'Chocolate Croissant', description: 'Buttery croissant filled with chocolate.', image: IMG.bakery, price: 9000, is_active: true },
      // Burger House
      { branch_id: branches[5].id, subcategory_id: sub('Burgers').id, name: 'Classic Burger', description: 'Beef patty, lettuce, tomato and special sauce.', image: IMG.burger, price: 30000, is_active: true },
      { branch_id: branches[5].id, subcategory_id: sub('Burgers').id, name: 'Chicken Burger', description: 'Crispy chicken fillet with mayo and pickles.', image: IMG.burger, price: 32000, is_active: true },
      { branch_id: branches[5].id, subcategory_id: sub('Fried').id, name: 'French Fries', description: 'Golden, crispy fries with a pinch of salt.', image: IMG.fries, price: 12000, is_active: true }
    ]);
    console.log('🍽️  Created products');

    // Variations (sizes for shawarma plate, cappuccino, classic burger)
    await ProductVariation.insertMany([
      { product_id: products[1].id, attributes: { name: 'Regular', size: 'regular' }, price: 35000, image: IMG.shawarma },
      { product_id: products[1].id, attributes: { name: 'Large', size: 'large' }, price: 42000, image: IMG.shawarma },
      { product_id: products[10].id, attributes: { name: 'Small', size: 'small' }, price: 12000, image: IMG.coffee },
      { product_id: products[10].id, attributes: { name: 'Large', size: 'large' }, price: 16000, image: IMG.coffee },
      { product_id: products[12].id, attributes: { name: 'Single', size: 'single' }, price: 30000, image: IMG.burger },
      { product_id: products[12].id, attributes: { name: 'Double', size: 'double' }, price: 42000, image: IMG.burger }
    ]);
    console.log('📏 Created product variations');

    // ----- Test restaurant with a full 10-meal menu (for testing) -----
    const testVendor = await Vendor.create({
      name: 'Jawlah Test Kitchen', image: CAT_IMG.International,
      about: 'Test restaurant — full menu for QA.', is_active: true
    });
    const testBranch = await Branch.create({
      vendor_id: testVendor.id, name: 'Jawlah Test Kitchen — Downtown', image: CAT_IMG.International,
      lat: 33.5138, lng: 36.2765, address: 'Downtown', city: 'Damascus', work_time: workTime,
      delivery_time: '30-45 min', min_order: 20000, delivery_fee: 0, free_delivery: true, is_active: true
    });
    const testSub = await Subcategory.create({
      branch_id: testBranch.id, category_id: cat('International').id, name: 'Meals',
      image: CAT_IMG.International, sort_order: 1, is_active: true
    });
    const testMeals = [
      { name: 'Test Meal 1 — Mixed Grill', description: 'Assorted grilled meats with rice.', image: CAT_IMG.Grills, price: 55000 },
      { name: 'Test Meal 2 — Chicken Shawarma', description: 'Chicken shawarma wrap with fries.', image: CAT_IMG.Shawarma, price: 16000 },
      { name: 'Test Meal 3 — Beef Burger', description: 'Double beef patty with cheese.', image: CAT_IMG.Burgers, price: 34000 },
      { name: 'Test Meal 4 — Margherita Pizza', description: 'Classic cheese and tomato pizza.', image: CAT_IMG.Pizza, price: 45000 },
      { name: 'Test Meal 5 — Caesar Salad', description: 'Crisp romaine, parmesan and croutons.', image: CAT_IMG.Healthy, price: 28000 },
      { name: 'Test Meal 6 — Fried Chicken Bucket', description: '8 pieces of crispy fried chicken.', image: CAT_IMG.Chicken, price: 60000 },
      { name: 'Test Meal 7 — Club Sandwich', description: 'Triple-decker chicken club with fries.', image: CAT_IMG.Sandwiches, price: 24000 },
      { name: 'Test Meal 8 — Breakfast Platter', description: 'Eggs, halloumi, zaatar and bread.', image: CAT_IMG.Breakfast, price: 30000 },
      { name: 'Test Meal 9 — Ice Cream Sundae', description: 'Three scoops with toppings.', image: CAT_IMG['Ice Cream'], price: 18000 },
      { name: 'Test Meal 10 — Mixed Mezze', description: 'Hummus, mutabbal, tabbouleh and bread.', image: CAT_IMG.Arabic, price: 32000 }
    ];
    await Product.insertMany(
      testMeals.map((m) => ({
        branch_id: testBranch.id, subcategory_id: testSub.id,
        name: m.name, description: m.description, image: m.image, price: m.price, is_active: true
      }))
    );
    console.log('🧪 Created test restaurant with 10 meals');

    // Reviews
    await Review.insertMany([
      { branch_id: branches[0].id, user_id: users[0].user_id, rating: 5, comment: 'Best shawarma in Damascus!' },
      { branch_id: branches[0].id, user_id: users[1].user_id, rating: 4, comment: 'Tasty and fast delivery.' },
      { branch_id: branches[1].id, user_id: users[2].user_id, rating: 5, comment: 'Baklava is fresh and not too sweet.' },
      { branch_id: branches[2].id, user_id: users[0].user_id, rating: 5, comment: 'Kebab is excellent, great mezze too.' },
      { branch_id: branches[4].id, user_id: users[3].user_id, rating: 4, comment: 'Lovely coffee and atmosphere.' },
      { branch_id: branches[3].id, user_id: users[1].user_id, rating: 5, comment: 'Quick grocery delivery, free of charge.' }
    ]);
    console.log('⭐ Created reviews');

    // Offers (used as home banners + discounts) — wide active window
    const start = new Date('2026-01-01');
    const end = new Date('2027-12-31');
    await Offer.insertMany([
      { entity_type: 'branch', entity_id: branches[0].id, title: '20% off Shawarma', description: 'Get 20% off all shawarma this week.', type: 'percentage', value: 20, start_date: start, end_date: end, is_active: true },
      { entity_type: 'branch', entity_id: branches[1].id, title: 'Sweets Festival', description: 'Up to 50% off selected sweets!', type: 'percentage', value: 50, start_date: start, end_date: end, is_active: true },
      { entity_type: 'branch', entity_id: branches[3].id, title: 'Pizza Tuesday', description: '15% off all pizzas every Tuesday.', type: 'percentage', value: 15, start_date: start, end_date: end, is_active: true },
      { entity_type: 'product', entity_id: products[3].id, title: 'Baklava Deal', description: 'Special price on mixed baklava.', type: 'percentage', value: 15, start_date: start, end_date: end, is_active: true }
    ]);
    console.log('🎁 Created offers');

    // Notifications for the demo user (ahmad / 0911111111)
    const demo = users[0];
    await Notification.insertMany([
      { user_id: demo.user_id, type: 'offers', title: 'Sweets Festival 🎉', message: 'Up to 50% off selected sweets at Damascus Sweets.', is_read: false },
      { user_id: demo.user_id, type: 'order', title: 'Order on the way 🛵', message: 'Your Abu Shaker Grill order is out for delivery.', is_read: false },
      { user_id: demo.user_id, type: 'order', title: 'Order delivered ✅', message: 'Your Shawarma Al-Sham order was delivered. Enjoy!', is_read: true },
      { user_id: demo.user_id, type: 'system', title: 'Welcome to Jawlah', message: 'Browse shops near you across Damascus.', is_read: true },
      { user_id: demo.user_id, type: 'offers', title: 'Free delivery weekend', message: 'Enjoy free delivery on selected orders this weekend.', is_read: false }
    ]);
    console.log('🔔 Created notifications');

    // Sample orders for the demo user — one delivered (history), one on the way (tracking)
    const deliveredItems = [
      { product_id: products[0].id, name: products[0].name, image: products[0].image, unit_price: products[0].price, qty: 2, options: null },
      { product_id: products[2].id, name: products[2].name, image: products[2].image, unit_price: products[2].price, qty: 1, options: null }
    ];
    const deliveredSubtotal = deliveredItems.reduce((s, it) => s + it.unit_price * it.qty, 0);

    const onTheWayItems = [
      { product_id: products[5].id, name: products[5].name, image: products[5].image, unit_price: products[5].price, qty: 1, options: null },
      { product_id: products[6].id, name: products[6].name, image: products[6].image, unit_price: products[6].price, qty: 1, options: null }
    ];
    const onTheWaySubtotal = onTheWayItems.reduce((s, it) => s + it.unit_price * it.qty, 0);

    await Order.insertMany([
      {
        user_id: demo.user_id, branch_id: branches[0].id, vendor_name: 'Shawarma Al-Sham',
        items: deliveredItems, subtotal: deliveredSubtotal, delivery_fee: 5000, discount: 0,
        total: deliveredSubtotal + 5000, currency: 'SYP', payment_method: 'COD', status: 'delivered',
        delivery_address: 'Mezzeh, Damascus', leave_at_door: false, dont_ring_bell: false,
        status_timeline: Order.buildTimeline('delivered'), eta_minutes: 0
      },
      {
        user_id: demo.user_id, branch_id: branches[2].id, vendor_name: 'Abu Shaker Grill',
        items: onTheWayItems, subtotal: onTheWaySubtotal, delivery_fee: 6000, discount: 0,
        total: onTheWaySubtotal + 6000, currency: 'SYP', payment_method: 'COD', status: 'on_the_way',
        delivery_address: 'Abu Rummaneh, Damascus', leave_at_door: true, dont_ring_bell: false,
        driver: { name: 'Khaled', vehicle: 'Motorcycle • Red', rating: '4.8', avatar: 'https://i.pravatar.cc/150?img=12' },
        status_timeline: Order.buildTimeline('on_the_way'), eta_minutes: 18
      }
    ]);
    console.log('🧾 Created sample orders');

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${users.length}  (demo login: 0911111111 / OTP 000000)`);
    console.log(`📂 Categories: ${categories.length}`);
    console.log(`🏪 Vendors: ${vendors.length}`);
    console.log(`🏢 Branches: ${branches.length}`);
    console.log(`📁 Subcategories: ${subcategories.length}`);
    console.log(`🍽️  Products: ${products.length}`);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
};

module.exports = { seedDatabase };
