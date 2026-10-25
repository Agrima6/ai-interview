import test from 'node:test'
import assert from 'node:assert/strict'
import { parseStudents } from '../src/utils/parseStudents.js'

test('a header row sets the column order, with common aliases', () => {
    const [a] = parseStudents('Roll No,Student Name,Email,Branch\n21CS001,Asha Verma,ASHA@college.edu,CSE')
    assert.deepEqual([a.rollNumber, a.name, a.email, a.branch, a.problems.length], ['21CS001', 'Asha Verma', 'asha@college.edu', 'CSE', 0])
})

test('without a header the order is name, email, phone, roll number, branch, batch', () => {
    const [a] = parseStudents('Asha Verma,asha@college.edu,9876543210,21CS001,CSE,2025')
    assert.deepEqual([a.name, a.phone, a.rollNumber, a.batch], ['Asha Verma', '9876543210', '21CS001', '2025'])
})

test('rows report exactly what is wrong', () => {
    const rows = parseStudents('name,email,phone\n,bad-email,12345\nOk One,ok@x.edu,')
    assert.deepEqual(rows[0].problems, ['name missing', 'invalid email', 'phone must be 10 digits'])
    assert.equal(rows[1].problems.length, 0)
    assert.equal(rows[0].line, 2)
})

test('blank input gives no rows', () => {
    assert.deepEqual(parseStudents('  \n\n'), [])
})
