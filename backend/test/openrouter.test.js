import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonLoose } from '../src/utils/openrouterAPI.js';

test('parses clean JSON', () => {
  assert.deepEqual(parseJsonLoose('{"relevante":true,"razon":"ok"}'), { relevante: true, razon: 'ok' });
});

test('parses JSON embedded in prose', () => {
  const raw = 'Aquí tienes:\n{"nivel": "bajo", "razon": "natural", "sugerencia": null}\n\nsaludos';
  assert.deepEqual(parseJsonLoose(raw), { nivel: 'bajo', razon: 'natural', sugerencia: null });
});

test('returns null for garbage', () => {
  assert.equal(parseJsonLoose('esto no es json {'), null);
});

test('returns null for empty', () => {
  assert.equal(parseJsonLoose(''), null);
});