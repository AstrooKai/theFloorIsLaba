require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function stripDatabaseDirectives(sql) {
    return sql
        .replace(/CREATE DATABASE[\s\S]*?;/gi, '')
        .replace(/USE\s+[`'\w]+;/gi, '');
}

async function seedIfEmpty(conn, seedSql) {
    const tables = ['customers', 'staff', 'service_types', 'order_statuses', 'orders', 'order_items', 'payments', 'deliveries'];
    const counts = await Promise.all(tables.map(async (table) => {
        const [rows] = await conn.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
        return Number(rows[0].count);
    }));

    if (counts.every((count) => count === 0)) {
        await conn.query(stripDatabaseDirectives(seedSql));
        console.log('Seed data inserted.');
        return;
    }

    const [seedManager] = await conn.query(
        "SELECT staff_id FROM staff WHERE email = 'rosa.mendoza@laba.ph' LIMIT 1"
    );
    if (seedManager.length > 0) {
        console.log('Seed data already exists; no seed changes made.');
        return;
    }

    throw new Error('Database contains data but is not recognized as seeded; refusing to insert duplicate sample data.');
}

async function initializeDatabase({ reset = false } = {}) {
    const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
    const dbName = databaseUrl
        ? decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''))
        : (process.env.DB_NAME || 'laundry_shop_db');
    if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
        throw new Error('DB_NAME may contain only letters, numbers, and underscores.');
    }
    if (reset && process.env.ALLOW_DB_RESET !== 'true') {
        throw new Error('Destructive reset blocked. Set ALLOW_DB_RESET=true and rerun only if you intend to drop this database.');
    }

    const host = databaseUrl?.hostname || process.env.DB_HOST || 'localhost';
    const cloudHost = !['localhost', '127.0.0.1', '::1'].includes(host);
    const useSsl = process.env.DB_SSL === 'true' || (cloudHost && process.env.DB_SSL !== 'false');
    if (databaseUrl && reset) {
        throw new Error('Database reset through DATABASE_URL is not supported. Use an explicitly configured local database.');
    }
    const connectionConfig = {
        host,
        port: databaseUrl?.port ? Number(databaseUrl.port) : (process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306),
        user: databaseUrl ? decodeURIComponent(databaseUrl.username) : (process.env.DB_USER || 'root'),
        password: databaseUrl ? decodeURIComponent(databaseUrl.password) : (process.env.DB_PASSWORD || ''),
        multipleStatements: true,
        ...(databaseUrl ? { database: dbName } : {}),
        ...(useSsl ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } } : {})
    };
    const conn = await mysql.createConnection(connectionConfig);

    try {
        if (reset) {
            console.warn(`Explicitly resetting database [${dbName}]...`);
            await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
        }
        if (!databaseUrl) {
            await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await conn.query(`USE \`${dbName}\``);
        }

        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const seedSql = fs.readFileSync(seedPath, 'utf8');

        await conn.query(stripDatabaseDirectives(schemaSql));
        console.log('Database schema is up to date.');
        await seedIfEmpty(conn, seedSql);
        console.log(`Database [${dbName}] initialized.`);
    } finally {
        await conn.end();
    }
}

async function runCli() {
    const force = process.argv.includes('--force');
    const reset = process.argv.includes('--reset');
    const host = process.env.DATABASE_URL
        ? new URL(process.env.DATABASE_URL).hostname
        : (process.env.DB_HOST || 'localhost');
    const localHost = ['localhost', '127.0.0.1', '::1'].includes(host);
    if ((process.env.NODE_ENV === 'production' || !localHost) && !force) {
        throw new Error('Database initialization on production or remote hosts requires --force.');
    }
    await initializeDatabase({ reset });
}

if (require.main === module) {
    runCli().catch((error) => {
        console.error('Database initialization failed:', error.message || error);
        process.exitCode = 1;
    });
}

module.exports = { initializeDatabase };
