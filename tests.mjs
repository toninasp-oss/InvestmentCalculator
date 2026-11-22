import assert from 'node:assert/strict';
import { add, calculate, divide, multiply } from './calculator.js';
import { actionForKey, createState, loadRate, reduce, saveRate, view } from './calculator-state.js';

let count = 0;
function equal(actual, expected, message) { assert.equal(actual, expected, message); count++; }
function deepEqual(actual, expected, message) { assert.deepEqual(actual, expected, message); count++; }
function throws(fn, message) { assert.throws(fn); count++; }
function run(actions) { return actions.reduce((state, action) => reduce(state, action), createState()); }
function keys(text) {
  return [...text].map(key => {
    if (/\d|\./.test(key)) return { type: 'input', value: key };
    if ('+−×÷'.includes(key)) return { type: 'operate', value: key };
    if (key === '=') return { type: 'equals' };
    if (key === '%') return { type: 'percent' };
    if (key === '⌫') return { type: 'backspace' };
    throw new Error(`Unsupported test key: ${key}`);
  });
}

equal(add('.1', '.2'), '0.3');
equal(calculate('54.36', '×', '220'), '11959.2');
equal(multiply('11959.2', '150'), '1793880');
equal(multiply('4800', '150'), '720000');
equal(divide('720000', '150'), '4800');
throws(() => divide('1', '0'));

equal(view(run(keys('10+10=20'))).display, '20', 'new digits replace a confirmed result');
equal(view(run(keys('10+10=+2='))).display, '22', 'operator continues from a confirmed result');
const plusPending = run(keys('10+'));
equal(view(plusPending).display, '10', 'pending addition keeps the left operand on screen');
equal(view(run([...keys('10+'), { type: 'input', value: '2' }])).display, '2', 'a digit replaces the pending-operation display');
equal(view(run(keys('10+2='))).display, '12', 'addition confirms after the second operand');
for (const operator of ['+', '−', '×', '÷']) {
  equal(view(run(keys(`10${operator}`))).display, '10', `pending ${operator} keeps the left operand on screen`);
}
const correctedPending = run(keys('10+×'));
equal(view(correctedPending).display, '10', 'operator correction keeps the left operand on screen');
equal(view(correctedPending).expression, '10 ×', 'operator correction changes only the pending operator');
const constantPending = run(keys('10++'));
equal(view(constantPending).display, '10', 'constant setup keeps the left operand on screen');
equal(view(run(keys('10++2='))).display, '12', 'constant setup accepts a new right operand');
const replacement = run(keys('2+×3='));
equal(view(replacement).display, '6', 'pending operator is replaced');
equal(replacement.history.length, 1, 'operator replacement does not create intermediate history');
equal(view(run(keys('2+3⌫4='))).display, '6', 'backspace corrects the current operand');
equal(view(run(keys('1.2.3'))).display, '1.23', 'only one decimal point is accepted');
equal(view(run(keys('005'))).display, '5', 'leading zeroes are replaced');
equal(view(run([{ type: 'input', value: '1' }, { type: 'input', value: '00' }])).display, '100', '00 key appends two zeroes');
equal(view(run([{ type: 'input', value: '00' }])).display, '0', '00 key does not create a leading zero');

const divideByZero = run(keys('6÷0='));
equal(view(divideByZero).display, 'E', 'division by zero enters an error state');
equal(view(reduce(divideByZero, { type: 'input', value: '7' })).display, '7', 'digit input recovers from error');

const normalDivision = run(keys('9÷45='));
equal(view(normalDivision).display, '0.2', 'ordinary division is not a constant calculation');
equal(view(normalDivision).expression, '', 'ordinary calculation has no K indicator');
const ordinaryRepeatedEquals = run(keys('5+1==='));
equal(view(ordinaryRepeatedEquals).display, '6', 'ordinary calculation does not repeat with equals');
equal(view(ordinaryRepeatedEquals).expression, '', 'ordinary repeated equals does not show K');
equal(view(run(keys('23++12=45='))).display, '68', 'CASIO addition constant calculation requires a double operator');
equal(view(run(keys('5−−7=2='))).display, '-3', 'CASIO subtraction constant calculation reverses the constant operand');
equal(view(run(keys('12××2=4='))).display, '48', 'CASIO multiplication constant calculation requires a double operator');
equal(view(run(keys('9÷÷45=72='))).display, '8', 'CASIO division constant calculation requires a double operator');
const repeatedConstant = run(keys('5++1==='));
equal(view(repeatedConstant).display, '16', 'constant calculation repeats with equals');
equal(view(repeatedConstant).expression, 'K + 5', 'K indicator matches constant state');
equal(repeatedConstant.history[0], '11 + 5 = 16', 'constant history records the effective calculation');
const operatorCorrection = run(keys('5++×3='));
equal(view(operatorCorrection).display, '15', 'a different operator corrects the operator instead of retaining K');
equal(view(operatorCorrection).expression, '', 'operator correction clears K indicator');

equal(view(run(keys('200×5%='))).display, '10', 'CASIO percentage amount');
equal(view(run(keys('30÷60%='))).display, '50', 'CASIO percentage ratio');
equal(view(run(keys('100+5%='))).display, '105', 'CASIO percentage increase');
equal(view(run(keys('500−20%='))).display, '400', 'CASIO percentage discount');

const toJpy = run([{ type: 'input', value: '1' }, { type: 'input', value: '0' }, { type: 'input', value: '0' }, { type: 'convert', kind: 'JPY', rate: '150' }]);
equal(view(toJpy).display, '15,000', '100 USD converts to 15000 JPY');
equal(view(reduce(toJpy, { type: 'input', value: '2' })).display, '2', 'digit input replaces conversion result');
const continuedJpy = reduce(reduce(toJpy, { type: 'operate', value: '+' }), { type: 'input', value: '1' });
equal(view(reduce(continuedJpy, { type: 'equals' })).display, '15,001', 'calculation continues from conversion result');
const toUsd = run([{ type: 'input', value: '1' }, { type: 'input', value: '5' }, { type: 'input', value: '0' }, { type: 'input', value: '0' }, { type: 'input', value: '0' }, { type: 'convert', kind: 'USD', rate: '150' }]);
equal(view(toUsd).display, '100', '15000 JPY converts to 100 USD');

const storage = new Map();
const fakeStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
equal(saveRate(fakeStorage, '150.00'), '150', 'rate is normalized before saving');
equal(loadRate(fakeStorage), '150', 'saved rate reloads');

const mouseAction = { type: 'operate', value: '×' };
deepEqual(actionForKey('*'), mouseAction, 'keyboard multiply maps to the same action as the button');
deepEqual(actionForKey('Enter'), { type: 'equals' }, 'keyboard Enter maps to equals');
deepEqual(actionForKey('Backspace'), { type: 'backspace' }, 'keyboard Backspace maps to delete');
deepEqual(actionForKey('Escape'), { type: 'clear' }, 'keyboard Escape maps to clear');

console.log(`${count} calculator tests passed`);
