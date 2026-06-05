const models = require('../models');

/**
 * With MongoDB there is no SQL schema to create — collections are created
 * lazily on first write. This routine just ensures each model's indexes are
 * built so unique constraints / query indexes are in place.
 */
const initDatabase = async () => {
  try {
    console.log('🔄 Initializing database (ensuring indexes)...');

    await Promise.all(
      Object.values(models).map(async (model) => {
        try {
          await model.createIndexes();
        } catch (error) {
          console.warn(`Warning building indexes for ${model.modelName}:`, error.message);
        }
      })
    );

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

module.exports = { initDatabase };
