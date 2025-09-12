const { seedDatabase } = require('./src/config/seedData');

const runSeeding = async () => {
  try {
    console.log('🚀 Starting database seeding process...');
    await seedDatabase();
    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
};

runSeeding();
