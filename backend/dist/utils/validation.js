"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeString = exports.validateGoogleSheetsUrl = void 0;
exports.isValidDate = isValidDate;
exports.isPositiveNumber = isPositiveNumber;
exports.isScaleValue = isScaleValue;
function isValidDate(value) {
    if (!value)
        return false;
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(value))
        return false;
    const [day, month, year] = value.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return (date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day &&
        date <= new Date());
}
function isPositiveNumber(value) {
    if (value === null || value === undefined || value === '')
        return false;
    const num = Number(value);
    return !isNaN(num) && num >= 0;
}
function isScaleValue(value, min, max, required = false) {
    if (value === null || value === undefined || value === '')
        return !required;
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
}
const validateGoogleSheetsUrl = (url) => {
    return /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.test(url);
};
exports.validateGoogleSheetsUrl = validateGoogleSheetsUrl;
const sanitizeString = (value) => {
    return value.replace(/[<>\"']/g, '');
};
exports.sanitizeString = sanitizeString;
