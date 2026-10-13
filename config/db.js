const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'laundry_shop_db';

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initDB() {
    try {
        const rootConn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);

        const [tables] = await rootConn.query(
            'SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ?',
            [dbName]
        );

        if (tables[0].count === 0) {
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

            if (fs.existsSync(schemaPath)) {
                await rootConn.query(fs.readFileSync(schemaPath, 'utf8'));
            }
            if (fs.existsSync(seedPath)) {
                await rootConn.query(fs.readFileSync(seedPath, 'utf8'));
            }
            console.log(`Database [${dbName}] created and seeded automatically.`);
        }

        await rootConn.end();
        return true;
    } catch (error) {
        console.error('Database initialization error:', error.message);
        return false;
    }
}

async function testConnection() {
    try {
        await initDB();
        const connection = await pool.getConnection();
        console.log(`Connected to MySQL database successfully [${dbName}]`);
        connection.release();
        return true;
    } catch (error) {
        console.error('Database connection error:', error.message);
        return false;
    }
}

module.exports = pool;
module.exports.testConnection = testConnection;

