/**
 * Database Seed and Reset Script
 * Run with: npm run db:reset or npm run db:seed
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbName = process.env.DB_NAME || 'laundry_shop_db';

async function resetAndSeed() {
    let conn;
    try {
        console.log(`Connecting to MySQL host: ${process.env.DB_HOST || 'localhost'}...`);
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log(`Resetting database [${dbName}]...`);
        await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
        await conn.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await conn.query(`USE \`${dbName}\`;`);

        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

        if (fs.existsSync(schemaPath)) {
            console.log('Applying database schema...');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await conn.query(schemaSql);
        } else {
            throw new Error(`Schema file not found at ${schemaPath}`);
        }

        if (fs.existsSync(seedPath)) {
            console.log('Seeding initial sample data...');
            const seedSql = fs.readFileSync(seedPath, 'utf8');
            await conn.query(seedSql);
        } else {
            console.warn(`Seed file not found at ${seedPath}`);
        }

        console.log(`Database [${dbName}] successfully reset and seeded!`);
        process.exit(0);
    } catch (error) {
        console.error('Database reset/seed failed:', error.code || error.message || error);
        process.exit(1);
    } finally {
        if (conn) {
            await conn.end();
        }
    }
}

resetAndSeed();
