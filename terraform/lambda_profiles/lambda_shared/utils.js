"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResponse = createResponse;
exports.parseBody = parseBody;
exports.calculateAgeFromBirthday = calculateAgeFromBirthday;
exports.isValidDate = isValidDate;
exports.nowISO = nowISO;
const constants_1 = require("./constants");
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: constants_1.CORS_HEADERS,
        body: JSON.stringify(body),
    };
}
function parseBody(body) {
    if (!body)
        return null;
    try {
        return JSON.parse(body);
    }
    catch {
        return null;
    }
}
function calculateAgeFromBirthday(birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
function isValidDate(dateStr) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr))
        return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}
function nowISO() {
    return new Date().toISOString();
}
