import test from 'node:test'
import assert from 'node:assert/strict'
import { LIMITS, digitsOnly, decimalOnly, emailError, lengthError, nameError, normalizePhone, phoneError, rangeError, settlePhone, tidyPhone } from '../src/components/oa/oaRules.js'

// The form rules must agree with the server's (services/client-service/utils/oaValidate.js).

test('phone: exactly ten digits, however typed', () => {
    for (const ok of ['9876543210', '+91 98765 43210', '+919876543210', '09876543210', '(987) 654-3210']) assert.equal(normalizePhone(ok), '9876543210', ok)
    for (const bad of ['', '12345', '98765432101', '98765abcde', '0000']) assert.equal(normalizePhone(bad), null, bad)
    assert.equal(phoneError(''), '')
    assert.match(phoneError('', { required: true }), /10-digit/)
    assert.match(phoneError('12345'), /exactly 10 digits/)
    assert.equal(phoneError('+91 98765 43210'), '')
})

test('phone typing keeps a +91 prefix alive key by key, and never lets letters in', () => {
    let typed = ''
    for (const ch of '+91 98765 43210') typed = tidyPhone(typed + ch)
    assert.equal(typed, '+91 98765 43210')
    assert.equal(settlePhone(typed), '9876543210')
    assert.equal(tidyPhone('98ab76x54'), '987654')
    assert.equal(tidyPhone('9+8'), '98')           // a plus only means something at the start
    assert.equal(settlePhone('12345'), '12345')    // not a valid number: left for the error message
})

test('names: letters in any script, no digits or symbols', () => {
    for (const ok of ['Asha Verma', "Jean-Luc O'Neil", 'अनन्या शर्मा', 'José Álvarez']) assert.equal(nameError(ok), '', ok)
    for (const bad of ['', 'A', 'R2D2', '<script>', 'x'.repeat(101)]) assert.notEqual(nameError(bad), '', bad)
})

test('email and length', () => {
    assert.equal(emailError('a@b.co'), '')
    assert.notEqual(emailError('nope'), '')
    assert.notEqual(emailError(`${'x'.repeat(200)}@b.co`), '')
    assert.equal(emailError('', { required: false }), '')
    assert.notEqual(lengthError('ab', { min: 3, max: 10, label: 'Name' }), '')
    assert.notEqual(lengthError('x'.repeat(11), { min: 3, max: 10, label: 'Name' }), '')
    assert.equal(lengthError('abcd', { min: 3, max: 10, label: 'Name' }), '')
})

test('ranges: whole numbers by default, decimals on request, nothing clamped silently', () => {
    const v = LIMITS.maxViolations
    assert.equal(rangeError('7', { ...v, label: 'V' }), '')
    assert.equal(rangeError('10', { ...v, label: 'V' }), '')
    for (const bad of ['0', '11', '', 'abc', '2.5']) assert.notEqual(rangeError(bad, { ...v, label: 'V' }), '', bad)
    assert.equal(rangeError('', { ...v, label: 'V', required: false }), '')
    assert.equal(rangeError('0.5', { ...LIMITS.marks, label: 'Marks', decimals: true }), '')
    assert.notEqual(rangeError('0.4', { ...LIMITS.marks, label: 'Marks', decimals: true }), '')
    assert.notEqual(rangeError('100.5', { ...LIMITS.marks, label: 'Marks', decimals: true }), '')
})

test('numeric filters drop everything but digits', () => {
    assert.equal(digitsOnly('1a2-3e4', 3), '123')
    assert.equal(decimalOnly('1.2.3'), '1.23')
    assert.equal(decimalOnly('12.345'), '12.34')
    assert.equal(decimalOnly('-5e3'), '53')
})

test('the limits match the server', () => {
    assert.deepEqual([LIMITS.maxViolations.min, LIMITS.maxViolations.max], [1, 10])
    assert.deepEqual([LIMITS.durationMinutes.min, LIMITS.durationMinutes.max], [5, 360])
    assert.deepEqual([LIMITS.snapshotIntervalSec.min, LIMITS.snapshotIntervalSec.max], [15, 300])
    assert.deepEqual([LIMITS.aiCount.min, LIMITS.aiCount.max], [1, 25])
})
