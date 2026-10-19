/**
 * Cloud Database Seed Script
 * 
 * Safely seeds your remote cloud MySQL database (TiDB Cloud, Aiven, Railway, etc.)
 * with the exact same schema and initial sample data as your local setup.
 * 
 * Usage:
 *   1. Create a .env.cloud file (or pass DATABASE_URL / DB_HOST via environment)
 *   2. Run: npm run db:cloud:seed
 * 
 * NOTE: This script does NOT touch your local database (laundry_shop_db on localhost).
 */
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

// Attempt to load .env.cloud first if present, otherwise fall back to existing .env
const cloudEnvPath = path.join(__dirname, '..', '.env.cloud');
if (fs.existsSync(cloudEnvPath)) {
    require('dotenv').config({ path: cloudEnvPath });
} else {
    require('dotenv').config();
}

function parseDatabaseUrl(urlStr) {
    try {
        const u = new URL(urlStr);
        return {
            host: u.hostname,
            port: u.port ? Number(u.port) : 3306,
            user: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password),
            database: u.pathname ? u.pathname.replace(/^\//, '') : undefined,
            multipleStatements: true,
            ssl: { rejectUnauthorized: false }
        };
    } catch {
        return { uri: urlStr, multipleStatements: true, ssl: { rejectUnauthorized: false } };
    }
}

async function seedCloud() {
    console.log('--- The Floor Is Laba: Cloud Database Seeder ---');

    const isCloud = Boolean(
        process.env.DATABASE_URL ||
        (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')
    );

    if (!isCloud) {
        console.error('Error: DB_HOST is set to localhost or no cloud credentials provided.');
        console.error('To seed your cloud database:');
        console.error('  1. Create a .env.cloud file with DATABASE_URL="mysql://...", OR');
        console.error('  2. Run with: DATABASE_URL="mysql://..." npm run db:cloud:seed');
        process.exit(1);
    }

    const parsedUrl = process.env.DATABASE_URL ? parseDatabaseUrl(process.env.DATABASE_URL) : null;
    const dbName = parsedUrl?.database || process.env.DB_NAME || 'laundry_shop_db';

    const connConfig = parsedUrl
        ? {
            ...parsedUrl,
            ...(process.env.DB_SSL === 'false' ? { ssl: undefined } : { ssl: { rejectUnauthorized: false } })
        }
        : {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: dbName,
            multipleStatements: true,
            ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false }
        };

    let conn;
    try {
        console.log(`Connecting to Cloud Database at ${process.env.DB_HOST || 'DATABASE_URL'}...`);
        conn = await mysql.createConnection(connConfig);
        console.log('Connected successfully via SSL!');

        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file missing at ${schemaPath}`);
        }
        if (!fs.existsSync(seedPath)) {
            throw new Error(`Seed file missing at ${seedPath}`);
        }

        console.log('Applying database schema to cloud...');
        let schemaSql = fs.readFileSync(schemaPath, 'utf8');
        // Clean up any database-level creation statements for cloud compatibility
        schemaSql = schemaSql.replace(/CREATE DATABASE[\s\S]*?;/gi, '').replace(/USE\s+[`\w]+;/gi, '');
        await conn.query(schemaSql);
        console.log('Schema applied successfully.');

        console.log('Inserting initial seed data (staff, services, order statuses, samples)...');
        let seedSql = fs.readFileSync(seedPath, 'utf8');
        seedSql = seedSql.replace(/USE\s+[`\w]+;/gi, '');
        await conn.query(seedSql);
        console.log('Seed data inserted successfully.');

        console.log('\n[SUCCESS] Cloud database initialized and seeded!');
        console.log('Your Vercel deployment is now ready to connect to this cloud database.');
        process.exit(0);
    } catch (err) {
        console.error('Cloud database seeding failed:', err.message || err);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

seedCloud();
