const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function parseDatabaseUrl(urlStr) {
    try {
        const u = new URL(urlStr);
        return {
            host: u.hostname,
            port: u.port ? Number(u.port) : 3306,
            user: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password),
            database: u.pathname ? u.pathname.replace(/^\//, '') : undefined,
            ssl: { rejectUnauthorized: false }
        };
    } catch {
        return { uri: urlStr, ssl: { rejectUnauthorized: false } };
    }
}

const parsedUrl = process.env.DATABASE_URL ? parseDatabaseUrl(process.env.DATABASE_URL) : null;
const dbName = parsedUrl?.database || process.env.DB_NAME || 'laundry_shop_db';

const isCloud = Boolean(
    process.env.DATABASE_URL ||
    (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')
);

// Connection pool configuration: supports single DATABASE_URL or individual env vars
const poolConfig = parsedUrl
    ? {
        ...parsedUrl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ...(process.env.DB_SSL === 'false' ? { ssl: undefined } : { ssl: { rejectUnauthorized: false } })
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ...(process.env.DB_SSL === 'true' || (isCloud && process.env.DB_SSL !== 'false')
            ? { ssl: { rejectUnauthorized: false } }
            : {})
    };

const pool = mysql.createPool(poolConfig);

async function initDB() {
    try {
        if (!isCloud) {
            // Local presentation mode: check/create local database
            const rootConn = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
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
                if (fs.existsSync(schemaPath)) {
                    await rootConn.query(fs.readFileSync(schemaPath, 'utf8'));
                    console.log(`Database [${dbName}] tables initialized.`);
                }
            }

            await rootConn.end();
            return true;
        } else {
            // Cloud deployment mode: verify tables on provisioned database
            const conn = await pool.getConnection();
            const [tables] = await conn.query(
                'SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ?',
                [dbName]
            );

            if (tables[0].count === 0) {
                const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
                if (fs.existsSync(schemaPath)) {
                    let schemaSql = fs.readFileSync(schemaPath, 'utf8');
                    schemaSql = schemaSql.replace(/CREATE DATABASE[\s\S]*?;/gi, '').replace(/USE\s+[`\w]+;/gi, '');
                    await conn.query(schemaSql);
                    console.log(`Cloud database [${dbName}] tables initialized.`);
                }
            }

            conn.release();
            return true;
        }
    } catch (error) {
        console.warn('Database initialization note:', error.code || error.message || error);
        return false;
    }
}

async function testConnection() {
    try {
        await initDB();
        const connection = await pool.getConnection();
        console.log(`Connected to MySQL database successfully [${dbName}] (${isCloud ? 'Cloud' : 'Local'})`);
        connection.release();
        return true;
    } catch (error) {
        console.error('Database connection error:', error.code || error.message || error);
        return false;
    }
}

module.exports = pool;
module.exports.testConnection = testConnection;


