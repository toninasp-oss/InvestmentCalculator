import assert from 'node:assert/strict';
import { actionForKey, createState, reduce, view } from './calculator-state.js';
import { readFileSync } from 'node:fs';

const input = (state, text) => [...text].reduce((s, value) => reduce(s, { type: 'input', value }), state);
const back = state => reduce(state, { type: 'backspace' });
const shown = state => view(state).display;

assert.equal(shown(back(input(createState(), '1234'))), '123');
assert.equal(shown(back(back(input(createState(), '1234')))), '12');
assert.equal(shown(back(input(createState(), '1'))), '0');
assert.equal(shown(back(input(createState(), '12.34'))), '12.3');
assert.equal(shown(input(back(input(createState(), '123')), '4')), '124');
assert.deepEqual(actionForKey('Backspace'), { type: 'backspace' });

const html = readFileSync('./index.html', 'utf8');
const app = readFileSync('./app.js', 'utf8');
assert.match(html, /id="back" data-action="backspace"[^>]*>▶<\/button>/);
assert.match(app, /#back'\)\.addEventListener\('click', \(\) => dispatch\(\{ type: 'backspace' \}\)\)/);
console.log('8 backspace wiring tests passed');
