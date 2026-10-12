const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for MySQL (XAMPP / local)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'laundry_shop_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper to verify database connectivity on server startup
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log(`✅ Connected to MySQL database successfully [${process.env.DB_NAME || 'laundry_shop_db'}]`);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        console.error('👉 Tip: Ensure MySQL (XAMPP) is started and database has been imported.');
        return false;
    }
}

module.exports = pool;
module.exports.testConnection = testConnection;
