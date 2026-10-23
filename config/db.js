const mysql = require('mysql2/promise');
require('dotenv').config();

function parseDatabaseUrl(urlStr) {
    const ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
    try {
        const u = new URL(urlStr);
        return {
            host: u.hostname,
            port: u.port ? Number(u.port) : 3306,
            user: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password),
            database: u.pathname ? u.pathname.replace(/^\//, '') : undefined,
            ssl
        };
    } catch {
        return { uri: urlStr, ssl };
    }
}

const parsedUrl = process.env.DATABASE_URL ? parseDatabaseUrl(process.env.DATABASE_URL) : null;
const dbName = parsedUrl?.database || process.env.DB_NAME || 'laundry_shop_db';

const isCloud = Boolean(
    process.env.DATABASE_URL ||
    (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')
);

// Pool configuration
const poolConfig = parsedUrl
    ? {
        ...parsedUrl,
        multipleStatements: true,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ...(process.env.DB_SSL === 'false'
            ? { ssl: undefined }
            : { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } })
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        multipleStatements: true,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ...(process.env.DB_SSL === 'true' || (isCloud && process.env.DB_SSL !== 'false')
            ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } }
            : {})
    };

const pool = mysql.createPool(poolConfig);
let dbInitPromise;

async function initDB() {
    if (process.env.AUTO_SEED !== 'true' && process.env.NODE_ENV === 'production') {
        return false;
    }
    if (!dbInitPromise) {
        const { initializeDatabase } = require('../scripts/seed-db');
        dbInitPromise = initializeDatabase().catch((error) => {
            dbInitPromise = null;
            throw error;
        });
    }
    await dbInitPromise;
    return true;
}

async function testConnection() {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query('SELECT 1');
        console.log(`Connected to MySQL database successfully [${dbName}] (${isCloud ? 'Cloud' : 'Local'})`);
        return true;
    } catch (error) {
        console.error('Database connection error:', error.code || error.message || error);
        return false;
    } finally {
        if (connection) connection.release();
    }
}

module.exports = pool;
module.exports.initDB = initDB;
module.exports.testConnection = testConnection;
