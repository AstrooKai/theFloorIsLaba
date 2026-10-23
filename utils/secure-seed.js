const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DEFAULT_SEED_PASSWORD_HASH = '$2b$10$AYStZPBMESfGf2PwG0MHCeEmKflNO4FQ4XLBrh94h1/CEvoCxE5Ba';
const MANAGER_EMAIL = 'rosa.mendoza@laba.ph';

async function seedWithBootstrapCredentials(conn, seedSql) {
    const managerPassword = process.env.CLOUD_SEED_MANAGER_PASSWORD;
    if (typeof managerPassword !== 'string' ||
        Buffer.byteLength(managerPassword, 'utf8') < 16 ||
        Buffer.byteLength(managerPassword, 'utf8') > 72) {
        throw new Error('Set CLOUD_SEED_MANAGER_PASSWORD to a unique password between 16 and 72 UTF-8 bytes before initializing a remote or production database.');
    }
    if (!seedSql.includes(DEFAULT_SEED_PASSWORD_HASH)) {
        throw new Error('Expected default seed credential hash was not found; refusing to initialize a remote or production database.');
    }

    const managerPasswordHash = await bcrypt.hash(managerPassword, 12);
    const unavailableSeedPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    const securedSeedSql = seedSql.replaceAll(DEFAULT_SEED_PASSWORD_HASH, unavailableSeedPasswordHash);

    await conn.query(securedSeedSql);
    const [managerUpdate] = await conn.query(
        'UPDATE staff SET password = ? WHERE email = ?',
        [managerPasswordHash, MANAGER_EMAIL]
    );
    if (managerUpdate.affectedRows !== 1) {
        throw new Error('Unable to set the cloud bootstrap Manager password.');
    }
}

module.exports = { seedWithBootstrapCredentials };
