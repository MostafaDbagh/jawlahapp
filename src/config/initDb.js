const { sequelize } = require('./database');
const fs = require('fs');
const path = require('path');

const initDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && !statement.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sequelize.query(statement + ';');
        } catch (error) {
          // Skip if table/view/function already exists
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate key') &&
              !error.message.includes('relation') &&
              !error.message.includes('function')) {
            console.warn('Warning executing statement:', error.message);
          }
        }
      }
    }
    
    console.log('✅ Database initialized successfully');
    
    // Sync models to ensure they match the schema
    await sequelize.sync({ alter: true });
    console.log('✅ Models synchronized with database');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

module.exports = { initDatabase };
