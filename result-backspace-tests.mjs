import assert from 'node:assert/strict';
import { createState, reduce, view } from './calculator-state.js';

const act = (state, type, value) => reduce(state, value === undefined ? { type } : { type, value });
const input = (state, digits) => [...digits].reduce((s, value) => act(s, 'input', value), state);
function calc() {
  let state = input(createState(), '100');
  state = act(state, 'operate', '×');
  state = input(state, '200');
  return act(state, 'equals');
}
const shown = state => view(state).display;

let result = calc();
assert.equal(shown(result), '20,000');
result = act(result, 'backspace'); assert.equal(shown(result), '2,000');
result = act(result, 'backspace'); assert.equal(shown(result), '200');
assert.equal(shown(input(act(calc(), 'backspace'), '5')), '20,005');
const plus = act(act(calc(), 'backspace'), 'operate', '+');
assert.equal(shown(act(input(plus, '2'), 'equals')), '2,002');
const converted = reduce(input(createState(), '100'), { type: 'convert', kind: 'JPY', rate: '150' });
assert.equal(shown(act(converted, 'backspace')), '1,500');
assert.equal(shown(input(calc(), '5')), '5');
assert.equal(shown(act(act(act(input(createState(), '5'), 'operate', '+'), 'operate', '+'), 'backspace')), '0');
console.log('8 result backspace tests passed');
