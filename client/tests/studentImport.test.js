import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv } from '../src/utils/csvRows.js'
import { autoMapHeaders, normalizePhone, classify, studentsFromRows, readStudentFile, SAMPLE_CSV } from '../src/utils/studentImport.js'

test('csv: quoted cells keep commas, quotes and line breaks; BOM and CRLF are handled', () => {
    const { rows } = parseCsv('﻿Name,Branch\r\n"Verma, Asha","Computer Science, Engineering"\r\n"Say ""hi""","two\nlines"\r\n')
    assert.deepEqual(rows, [['Name', 'Branch'], ['Verma, Asha', 'Computer Science, Engineering'], ['Say "hi"', 'two\nlines']])
})

test('csv: semicolon and tab delimited files are detected, blank rows dropped', () => {
    assert.deepEqual(parseCsv('a;b;c\n\n1;2;3\n').rows, [['a', 'b', 'c'], ['1', '2', '3']])
    assert.deepEqual(parseCsv('a\tb\n1\t2').rows, [['a', 'b'], ['1', '2']])
    assert.equal(parseCsv('a,b\n1,"x;y"').delimiter, ',')
})

test('headers are mapped from common spreadsheet names, each field once', () => {
    assert.deepEqual(autoMapHeaders(['Student Name', 'E-mail ID', 'Mobile No.', 'Enrollment No', 'Dept', 'Passout Year']), ['name', 'email', 'phone', 'rollNumber', 'branch', 'batch'])
    assert.deepEqual(autoMapHeaders(['Name', 'Email', 'Full Name', 'Notes']), ['name', 'email', '', ''])
})

test('phone numbers lose +91, 0 prefix, spaces and dashes', () => {
    assert.equal(normalizePhone('+91 98765-43210'), '9876543210')
    assert.equal(normalizePhone('09876543210'), '9876543210')
    assert.equal(normalizePhone('98765 43210'), '9876543210')
    assert.equal(normalizePhone(''), '')
})

test('the sample CSV imports cleanly with its own headers', () => {
    const file = readStudentFile(SAMPLE_CSV)
    assert.equal(file.hasHeader, true)
    const students = classify(studentsFromRows(file.rows, file.mapping, 2))
    assert.deepEqual(students.map((s) => s.status), ['ok', 'ok', 'ok'])
    assert.equal(students[1].phone, '9876543211')
    assert.equal(students[2].branch, 'Electronics & Communication')
})

test('a file with no header row uses the default column order', () => {
    const file = readStudentFile('Asha Verma,asha@college.edu,9876543210,21CS001,CSE,2025')
    assert.equal(file.hasHeader, false)
    const [s] = studentsFromRows(file.rows, file.mapping)
    assert.deepEqual([s.name, s.email, s.rollNumber, s.batch], ['Asha Verma', 'asha@college.edu', '21CS001', '2025'])
})

test('rows say exactly what is wrong; invalid rows never block valid ones', () => {
    const rows = [['', 'x@y.edu'], ['Bad Mail', 'nope'], ['Short Phone', 'a@b.edu', '123'], ['Good', 'good@b.edu']]
    const out = classify(studentsFromRows(rows, ['name', 'email', 'phone']))
    assert.deepEqual(out.map((s) => s.status), ['invalid', 'invalid', 'invalid', 'ok'])
    assert.match(out[0].reason, /name is missing/)
    assert.match(out[1].reason, /email is not valid/)
    assert.match(out[2].reason, /phone must be 10 digits/)
})

test('duplicates are caught inside the list and against students already on the exam', () => {
    const existing = { emails: ['old@b.edu'], phones: ['9000000001'], rolls: ['21cs009'] }
    const rows = [
        ['One', 'one@b.edu', '9000000002', '21CS001'], ['One again', 'ONE@b.edu', '', ''], ['Same phone', 'p@b.edu', '9000000002', ''],
        ['Same roll', 'r@b.edu', '', '21cs001'], ['Old email', 'old@b.edu', '', ''], ['Old phone', 'q@b.edu', '+91 90000 00001', ''], ['Old roll', 's@b.edu', '', '21CS009'],
    ]
    const out = classify(studentsFromRows(rows, ['name', 'email', 'phone', 'rollNumber']), existing)
    assert.deepEqual(out.map((s) => s.status), ['ok', 'duplicate', 'duplicate', 'duplicate', 'duplicate', 'duplicate', 'duplicate'])
    assert.match(out[1].reason, /email/)
    assert.match(out[2].reason, /phone/)
    assert.match(out[3].reason, /roll number/)
})

import { splitFile, defaultMapping } from '../src/utils/studentImport.js'

test('flipping the header toggle re-splits the same file', () => {
    const file = readStudentFile('Name,Email\nAsha,asha@b.edu')
    assert.equal(file.hasHeader, true)
    const noHeader = splitFile(file.raw, false)
    assert.equal(noHeader.rows.length, 2)
    assert.deepEqual(noHeader.mapping, defaultMapping(2))
    assert.deepEqual(splitFile(file.raw, true).mapping, ['name', 'email'])
})
