const { test } = require('node:test');
const assert = require('node:assert/strict');
const { alumnoDateValue, nullableAlumnoFields } = require('../src/utils/alumnoFields.ts');

test('blank optional student fields are explicit JSON nulls', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(nullableAlumnoFields('  ', '', ''))), {
    numeroDocumento: null, fechaNacimiento: null, genero: null,
  });
});

test('existing student values are preserved without a default gender', () => {
  assert.deepEqual(nullableAlumnoFields(' 30123456 ', '2000-02-29', 'Mujer'), {
    numeroDocumento: '30123456', fechaNacimiento: '2000-02-29', genero: 'Mujer',
  });
  assert.equal(nullableAlumnoFields('', null, 'Varon').genero, 'Varon');
  assert.equal(nullableAlumnoFields('', null, 'unknown').genero, null);
});

test('date-only formatting handles missing, invalid, scanned and local dates safely', () => {
  for (const value of [null, undefined, '', 'Invalid Date', '2001-02-29', new Date(NaN)]) {
    assert.equal(alumnoDateValue(value), '');
  }
  assert.equal(alumnoDateValue('29/02/2000'), '2000-02-29');
  assert.equal(alumnoDateValue('2000-02-29T00:00:00'), '2000-02-29');
  assert.equal(alumnoDateValue(new Date(2000, 1, 29)), '2000-02-29');
});
