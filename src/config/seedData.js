const { sequelize } = require('./database');
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
  Offer 
} = require('../models');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await sequelize.sync({ force: true });
    console.log('🗑️  Cleared existing data');

    // Create Account Types first
    const accountTypes = await AccountType.bulkCreate([
      {
        type_code: 'CUSTOMER',
        type_name: 'Customer',
        description: 'Regular customer account'
      },
      {
        type_code: 'DRIVER',
        type_name: 'Driver',
        description: 'Delivery driver account'
      },
      {
        type_code: 'SERVICE_PROVIDER_OWNER',
        type_name: 'Service Provider Owner',
        description: 'Business owner account'
      }
    ]);
    console.log('👤 Created account types');

    // Create Users
    const users = await User.bulkCreate([
      {
        username: 'johndoe',
        email: 'john@example.com',
        country_code: '+1',
        phone_number: '2345678901',
        date_of_birth: '1990-05-15',
        gender: 'male',
        password_hash: 'hashedpassword123',
        salt: 'salt123',
        account_type: 'CUSTOMER',
        is_active: true,
        email_verified: true,
        metadata: {
          first_name: 'John',
          last_name: 'Doe'
        }
      },
      {
        username: 'janesmith',
        email: 'jane@example.com',
        country_code: '+44',
        phone_number: '7123456789',
        date_of_birth: '1985-08-22',
        gender: 'female',
        password_hash: 'hashedpassword123',
        salt: 'salt123',
        account_type: 'CUSTOMER',
        is_active: true,
        email_verified: true,
        metadata: {
          first_name: 'Jane',
          last_name: 'Smith'
        }
      },
      {
        username: 'mikejohnson',
        email: 'mike@example.com',
        country_code: '+971',
        phone_number: '501234567',
        date_of_birth: '1992-12-10',
        gender: 'male',
        password_hash: 'hashedpassword123',
        salt: 'salt123',
        account_type: 'CUSTOMER',
        is_active: true,
        email_verified: true,
        metadata: {
          first_name: 'Mike',
          last_name: 'Johnson'
        }
      },
      {
        username: 'sarahwilson',
        email: 'sarah@example.com',
        phone_number: '+1234567893',
        password_hash: 'hashedpassword123',
        salt: 'salt123',
        account_type: 'CUSTOMER',
        is_active: true,
        email_verified: true,
        metadata: {
          first_name: 'Sarah',
          last_name: 'Wilson'
        }
      },
      {
        username: 'davidbrown',
        email: 'david@example.com',
        phone_number: '+1234567894',
        password_hash: 'hashedpassword123',
        salt: 'salt123',
        account_type: 'CUSTOMER',
        is_active: true,
        email_verified: true,
        metadata: {
          first_name: 'David',
          last_name: 'Brown'
        }
      }
    ]);
    console.log('👥 Created 5 users');

    // Create Categories
    const categories = await Category.bulkCreate([
      {
        name: 'Food & Beverage',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=500',
        is_active: true
      },
      {
        name: 'Electronics',
        image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500',
        is_active: true
      },
      {
        name: 'Fashion & Clothing',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500',
        is_active: true
      },
      {
        name: 'Health & Beauty',
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500',
        is_active: true
      },
      {
        name: 'Home & Garden',
        image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500',
        is_active: true
      }
    ]);
    console.log('📂 Created 5 categories');

    // Create Vendors
    const vendors = await Vendor.bulkCreate([
      {
        name: 'Pizza Palace',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
        about: 'Authentic Italian pizza made with fresh ingredients and traditional recipes.',
        subscript_date: new Date('2024-01-15'),
        is_active: true
      },
      {
        name: 'Burger King',
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500',
        about: 'Flame-grilled burgers and crispy fries served fresh every day.',
        subscript_date: new Date('2024-02-20'),
        is_active: true
      },
      {
        name: 'Sushi Master',
        image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=500',
        about: 'Fresh sushi and Japanese cuisine prepared by master chefs.',
        subscript_date: new Date('2024-03-10'),
        is_active: true
      },
      {
        name: 'Coffee Corner',
        image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500',
        about: 'Premium coffee beans roasted daily, served with artisanal pastries.',
        subscript_date: new Date('2024-04-05'),
        is_active: true
      },
      {
        name: 'Taco Fiesta',
        image: 'https://images.unsplash.com/photo-1565299585323-38174c4aabaa?w=500',
        about: 'Authentic Mexican tacos with fresh salsas and traditional flavors.',
        subscript_date: new Date('2024-05-12'),
        is_active: true
      }
    ]);
    console.log('🏪 Created 5 vendors');

    // Create Branches
    const branches = await Branch.bulkCreate([
      {
        vendor_id: vendors[0].id,
        name: 'Downtown Pizza Palace',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
        lat: 40.7128,
        lng: -74.0060,
        address: '123 Main St',
        city: 'New York',
        work_time: {
          monday: '11:00-23:00',
          tuesday: '11:00-23:00',
          wednesday: '11:00-23:00',
          thursday: '11:00-23:00',
          friday: '11:00-24:00',
          saturday: '10:00-24:00',
          sunday: '10:00-22:00'
        },
        delivery_time: '30-45 minutes',
        min_order: 25.00,
        delivery_fee: 5.00,
        free_delivery: false,
        is_active: true
      },
      {
        vendor_id: vendors[0].id,
        name: 'Uptown Pizza Palace',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
        lat: 40.7589,
        lng: -73.9851,
        address: '456 Broadway',
        city: 'New York',
        work_time: {
          monday: '11:00-23:00',
          tuesday: '11:00-23:00',
          wednesday: '11:00-23:00',
          thursday: '11:00-23:00',
          friday: '11:00-24:00',
          saturday: '10:00-24:00',
          sunday: '10:00-22:00'
        },
        delivery_time: '25-40 minutes',
        min_order: 20.00,
        delivery_fee: 4.00,
        free_delivery: true,
        is_active: true
      },
      {
        vendor_id: vendors[1].id,
        name: 'Central Burger King',
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500',
        lat: 40.7505,
        lng: -73.9934,
        address: '789 5th Ave',
        city: 'New York',
        work_time: {
          monday: '06:00-23:00',
          tuesday: '06:00-23:00',
          wednesday: '06:00-23:00',
          thursday: '06:00-23:00',
          friday: '06:00-24:00',
          saturday: '06:00-24:00',
          sunday: '07:00-22:00'
        },
        delivery_time: '20-35 minutes',
        min_order: 15.00,
        delivery_fee: 3.00,
        free_delivery: false,
        is_active: true
      },
      {
        vendor_id: vendors[2].id,
        name: 'Sushi Master Midtown',
        image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=500',
        lat: 40.7614,
        lng: -73.9776,
        address: '321 Lexington Ave',
        city: 'New York',
        work_time: {
          monday: '12:00-22:00',
          tuesday: '12:00-22:00',
          wednesday: '12:00-22:00',
          thursday: '12:00-22:00',
          friday: '12:00-23:00',
          saturday: '12:00-23:00',
          sunday: '12:00-21:00'
        },
        delivery_time: '35-50 minutes',
        min_order: 30.00,
        delivery_fee: 6.00,
        free_delivery: false,
        is_active: true
      },
      {
        vendor_id: vendors[3].id,
        name: 'Coffee Corner SoHo',
        image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500',
        lat: 40.7231,
        lng: -74.0026,
        address: '654 Spring St',
        city: 'New York',
        work_time: {
          monday: '07:00-19:00',
          tuesday: '07:00-19:00',
          wednesday: '07:00-19:00',
          thursday: '07:00-19:00',
          friday: '07:00-20:00',
          saturday: '08:00-20:00',
          sunday: '08:00-18:00'
        },
        delivery_time: '15-25 minutes',
        min_order: 12.00,
        delivery_fee: 2.50,
        free_delivery: true,
        is_active: true
      }
    ]);
    console.log('🏢 Created 5 branches');

    // Create Subcategories
    const subcategories = await Subcategory.bulkCreate([
      {
        branch_id: branches[0].id,
        category_id: categories[0].id,
        name: 'Pizza',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
        has_offer: true,
        free_delivery: false,
        sort_order: 1,
        is_active: true
      },
      {
        branch_id: branches[0].id,
        category_id: categories[0].id,
        name: 'Pasta',
        image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=500',
        has_offer: false,
        free_delivery: false,
        sort_order: 2,
        is_active: true
      },
      {
        branch_id: branches[0].id,
        category_id: categories[0].id,
        name: 'Salads',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500',
        has_offer: false,
        free_delivery: true,
        sort_order: 3,
        is_active: true
      },
      {
        branch_id: branches[2].id,
        category_id: categories[0].id,
        name: 'Burgers',
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500',
        has_offer: true,
        free_delivery: false,
        sort_order: 1,
        is_active: true
      },
      {
        branch_id: branches[2].id,
        category_id: categories[0].id,
        name: 'Fries',
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500',
        has_offer: false,
        free_delivery: true,
        sort_order: 2,
        is_active: true
      },
      {
        branch_id: branches[3].id,
        category_id: categories[0].id,
        name: 'Sushi Rolls',
        image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=500',
        has_offer: true,
        free_delivery: false,
        sort_order: 1,
        is_active: true
      },
      {
        branch_id: branches[3].id,
        category_id: categories[0].id,
        name: 'Sashimi',
        image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=500',
        has_offer: false,
        free_delivery: false,
        sort_order: 2,
        is_active: true
      },
      {
        branch_id: branches[4].id,
        category_id: categories[0].id,
        name: 'Coffee',
        image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500',
        has_offer: false,
        free_delivery: true,
        sort_order: 1,
        is_active: true
      },
      {
        branch_id: branches[4].id,
        category_id: categories[0].id,
        name: 'Pastries',
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500',
        has_offer: true,
        free_delivery: true,
        sort_order: 2,
        is_active: true
      }
    ]);
    console.log('📁 Created 9 subcategories');

    // Create Products
    const products = await Product.bulkCreate([
      {
        branch_id: branches[0].id,
        subcategory_id: subcategories[0].id,
        name: 'Margherita Pizza',
        description: 'Classic tomato and mozzarella pizza with fresh basil',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
        price: 15.99,
        is_available: true,
        preparation_time: '20 minutes',
        calories: 300,
        allergens: ['gluten', 'dairy'],
        sort_order: 1
      },
      {
        branch_id: branches[0].id,
        subcategory_id: subcategories[0].id,
        name: 'Pepperoni Pizza',
        description: 'Spicy pepperoni with mozzarella cheese',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=500',
        price: 17.99,
        is_available: true,
        preparation_time: '22 minutes',
        calories: 350,
        allergens: ['gluten', 'dairy', 'pork'],
        sort_order: 2
      },
      {
        branch_id: branches[0].id,
        subcategory_id: subcategories[0].id,
        name: 'Vegetarian Pizza',
        description: 'Fresh vegetables with mozzarella cheese',
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500',
        price: 16.99,
        is_available: true,
        preparation_time: '25 minutes',
        calories: 280,
        allergens: ['gluten', 'dairy'],
        sort_order: 3
      },
      {
        branch_id: branches[0].id,
        subcategory_id: subcategories[1].id,
        name: 'Spaghetti Carbonara',
        description: 'Creamy pasta with bacon and parmesan cheese',
        image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=500',
        price: 14.99,
        is_available: true,
        preparation_time: '18 minutes',
        calories: 450,
        allergens: ['gluten', 'dairy', 'eggs'],
        sort_order: 1
      },
      {
        branch_id: branches[2].id,
        subcategory_id: subcategories[3].id,
        name: 'Classic Burger',
        description: 'Beef patty with lettuce, tomato, and special sauce',
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500',
        price: 12.99,
        is_available: true,
        preparation_time: '15 minutes',
        calories: 500,
        allergens: ['gluten', 'dairy', 'eggs'],
        sort_order: 1
      },
      {
        branch_id: branches[2].id,
        subcategory_id: subcategories[3].id,
        name: 'Chicken Burger',
        description: 'Grilled chicken breast with avocado and mayo',
        image: 'https://images.unsplash.com/photo-1606755962773-d324e9c8b1c8?w=500',
        price: 13.99,
        is_available: true,
        preparation_time: '18 minutes',
        calories: 420,
        allergens: ['gluten', 'dairy'],
        sort_order: 2
      },
      {
        branch_id: branches[3].id,
        subcategory_id: subcategories[5].id,
        name: 'California Roll',
        description: 'Crab, avocado, and cucumber roll',
        image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=500',
        price: 8.99,
        is_available: true,
        preparation_time: '12 minutes',
        calories: 200,
        allergens: ['fish', 'soy'],
        sort_order: 1
      },
      {
        branch_id: branches[3].id,
        subcategory_id: subcategories[5].id,
        name: 'Spicy Tuna Roll',
        description: 'Spicy tuna with cucumber and scallions',
        image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=500',
        price: 9.99,
        is_available: true,
        preparation_time: '15 minutes',
        calories: 180,
        allergens: ['fish', 'soy'],
        sort_order: 2
      },
      {
        branch_id: branches[4].id,
        subcategory_id: subcategories[7].id,
        name: 'Cappuccino',
        description: 'Rich espresso with steamed milk foam',
        image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500',
        price: 4.99,
        is_available: true,
        preparation_time: '5 minutes',
        calories: 80,
        allergens: ['dairy'],
        sort_order: 1
      },
      {
        branch_id: branches[4].id,
        subcategory_id: subcategories[8].id,
        name: 'Chocolate Croissant',
        description: 'Buttery croissant filled with chocolate',
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500',
        price: 3.99,
        is_available: true,
        preparation_time: '2 minutes',
        calories: 250,
        allergens: ['gluten', 'dairy', 'eggs'],
        sort_order: 1
      }
    ]);
    console.log('🍕 Created 10 products');

    // Create Product Variations
    const productVariations = await ProductVariation.bulkCreate([
      {
        product_id: products[0].id,
        attributes: {
          name: 'Small (10")',
          size: 'small',
          diameter: '10 inches'
        },
        price: 15.99,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500'
      },
      {
        product_id: products[0].id,
        attributes: {
          name: 'Medium (12")',
          size: 'medium',
          diameter: '12 inches'
        },
        price: 18.99,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500'
      },
      {
        product_id: products[0].id,
        attributes: {
          name: 'Large (14")',
          size: 'large',
          diameter: '14 inches'
        },
        price: 21.99,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500'
      },
      {
        product_id: products[4].id,
        attributes: {
          name: 'Single Patty',
          patties: 1,
          size: 'regular'
        },
        price: 12.99,
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500'
      },
      {
        product_id: products[4].id,
        attributes: {
          name: 'Double Patty',
          patties: 2,
          size: 'large'
        },
        price: 16.99,
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500'
      },
      {
        product_id: products[8].id,
        attributes: {
          name: 'Small (8oz)',
          size: 'small',
          volume: '8oz'
        },
        price: 4.99,
        image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500'
      },
      {
        product_id: products[8].id,
        attributes: {
          name: 'Large (12oz)',
          size: 'large',
          volume: '12oz'
        },
        price: 6.49,
        image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500'
      }
    ]);
    console.log('📏 Created 7 product variations');

    // Create Reviews
    const reviews = await Review.bulkCreate([
      {
        branch_id: branches[0].id,
        user_id: users[0].user_id,
        rating: 5,
        comment: 'Excellent pizza! Fresh ingredients and fast delivery.',
        order_id: 'order-1',
        is_verified: true
      },
      {
        branch_id: branches[0].id,
        user_id: users[1].user_id,
        rating: 4,
        comment: 'Great taste but delivery was a bit slow.',
        order_id: 'order-2',
        is_verified: true
      },
      {
        branch_id: branches[0].id,
        user_id: users[2].user_id,
        rating: 5,
        comment: 'Perfect pizza every time! Highly recommended.',
        order_id: 'order-3',
        is_verified: true
      },
      {
        branch_id: branches[2].id,
        user_id: users[3].user_id,
        rating: 4,
        comment: 'Good burgers, reasonable prices.',
        order_id: 'order-4',
        is_verified: true
      },
      {
        branch_id: branches[2].id,
        user_id: users[4].user_id,
        rating: 3,
        comment: 'Average burger, nothing special.',
        order_id: 'order-5',
        is_verified: true
      },
      {
        branch_id: branches[3].id,
        user_id: users[0].user_id,
        rating: 5,
        comment: 'Amazing sushi! Very fresh and authentic.',
        order_id: 'order-6',
        is_verified: true
      },
      {
        branch_id: branches[3].id,
        user_id: users[1].user_id,
        rating: 4,
        comment: 'Good sushi, but expensive.',
        order_id: 'order-7',
        is_verified: true
      },
      {
        branch_id: branches[4].id,
        user_id: users[2].user_id,
        rating: 5,
        comment: 'Best coffee in the neighborhood!',
        order_id: 'order-8',
        is_verified: true
      },
      {
        branch_id: branches[4].id,
        user_id: users[3].user_id,
        rating: 4,
        comment: 'Great coffee and pastries.',
        order_id: 'order-9',
        is_verified: true
      },
      {
        branch_id: branches[1].id,
        user_id: users[4].user_id,
        rating: 5,
        comment: 'Consistent quality and fast service.',
        order_id: 'order-10',
        is_verified: true
      }
    ]);
    console.log('⭐ Created 10 reviews');

    // Create Offers
    const offers = await Offer.bulkCreate([
      {
        entity_type: 'branch',
        entity_id: branches[0].id,
        title: '20% Off All Orders',
        description: 'Get 20% discount on all orders over $30',
        type: 'percentage',
        value: 20.00,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
        is_active: true
      },
      {
        entity_type: 'subcategory',
        entity_id: subcategories[0].id,
        title: 'Pizza Special',
        description: 'Buy 2 pizzas get 1 free',
        type: 'fixed',
        value: 15.99,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-06-30'),
        is_active: true
      },
      {
        entity_type: 'product',
        entity_id: products[0].id,
        title: 'Margherita Deal',
        description: 'Special price for Margherita Pizza',
        type: 'percentage',
        value: 15.00,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-03-31'),
        is_active: true
      },
      {
        entity_type: 'branch',
        entity_id: branches[2].id,
        title: 'Burger Combo',
        description: 'Burger + Fries + Drink for $15',
        type: 'fixed',
        value: 5.00,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
        is_active: true
      },
      {
        entity_type: 'branch',
        entity_id: branches[4].id,
        title: 'Coffee Morning Special',
        description: '50% off coffee before 10 AM',
        type: 'percentage',
        value: 50.00,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
        is_active: true
      },
      {
        entity_type: 'subcategory',
        entity_id: subcategories[5].id,
        title: 'Sushi Roll Deal',
        description: '3 rolls for the price of 2',
        type: 'fixed',
        value: 8.99,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-04-30'),
        is_active: true
      }
    ]);
    console.log('🎁 Created 6 offers');

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👤 Account Types: ${accountTypes.length}`);
    console.log(`👥 Users: ${users.length}`);
    console.log(`📂 Categories: ${categories.length}`);
    console.log(`🏪 Vendors: ${vendors.length}`);
    console.log(`🏢 Branches: ${branches.length}`);
    console.log(`📁 Subcategories: ${subcategories.length}`);
    console.log(`🍕 Products: ${products.length}`);
    console.log(`📏 Product Variations: ${productVariations.length}`);
    console.log(`⭐ Reviews: ${reviews.length}`);
    console.log(`🎁 Offers: ${offers.length}`);

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
};

module.exports = { seedDatabase };