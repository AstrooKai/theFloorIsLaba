const PERSON_NAME_PATTERN = /^[\p{L}][\p{L}\s.'-]*$/u;
const SERVICE_NAME_PATTERN = /^[\p{L}\s&'().,-]+$/u;
const SERVICE_CATEGORIES = [
    'Wash & fold',
    'Wash & dry',
    'Pressing',
    'Specialty care',
    'Bedding & bulky',
    'Dry cleaning'
];

function cleanName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function isValidPersonName(value) {
    const name = cleanName(value);
    return name.length <= 50 && PERSON_NAME_PATTERN.test(name);
}

function isValidServiceName(value) {
    const name = cleanName(value);
    return name.length > 0 && name.length <= 50 && SERVICE_NAME_PATTERN.test(name);
}

function isValidServiceCategory(value) {
    return SERVICE_CATEGORIES.some(category => category.toLowerCase() === String(value || '').trim().toLowerCase());
}

function normalizePhone(value) {
    const phone = String(value || '').trim();
    if (!/^[0-9 -]+$/.test(phone)) return null;
    const digits = phone.replace(/[ -]/g, '');
    return /^09\d{9}$/.test(digits) ? digits : null;
}

function isValidDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function todayManila() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}

module.exports = {
    cleanName,
    isValidPersonName,
    isValidServiceName,
    isValidServiceCategory,
    SERVICE_CATEGORIES,
    normalizePhone,
    isValidDate,
    todayManila
};
