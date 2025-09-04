const mongoose = require('mongoose');

async function resetDatabase() {
    try {
        // Get MongoDB URI from environment or use default
        const mongoUri = "mongodb+srv://hitanshutandon21_db_user:hitanshu9005@cluster0.inesof0.mongodb.net" || process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/weekly-planner';

        console.log('Connecting to MongoDB...');
        console.log('URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in log

        // Connect to MongoDB
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB successfully');

        // Get database name from URI
        const dbName = mongoose.connection.db.databaseName;
        console.log(`📊 Working with database: ${dbName}`);

        // Drop all collections
        const collections = await mongoose.connection.db.listCollections().toArray();

        if (collections.length === 0) {
            console.log('ℹ️  No collections found to drop');
        } else {
            console.log(`🗑️  Found ${collections.length} collections to drop:`);

            for (const collection of collections) {
                await mongoose.connection.db.collection(collection.name).drop();
                console.log(`   ✅ Dropped: ${collection.name}`);
            }
        }

        console.log('🎉 Database reset completed successfully');
    } catch (error) {
        console.error('❌ Error resetting database:', error.message);

        if (error.message.includes('authentication failed')) {
            console.error('💡 Check your MongoDB credentials in MONGODB_URI');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.error('💡 Make sure MongoDB is running and accessible');
        }
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('🔌 Database connection closed');
        }
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node scripts/reset-database.js [options]

Options:
  --help, -h    Show this help message

Environment Variables:
  MONGODB_URI   MongoDB connection string (required)
  MONGODB_URL   Alternative MongoDB connection string

Examples:
  MONGODB_URI="mongodb://localhost:27017/weekly-planner" node scripts/reset-database.js
  MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/db" node scripts/reset-database.js
`);
    process.exit(0);
}

resetDatabase();
