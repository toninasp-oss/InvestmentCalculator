import assert from 'node:assert/strict';

class Element {
  constructor({ value = '', dataset = {} } = {}) { this.value = value; this.dataset = dataset; this.textContent = ''; this.innerHTML = ''; this.listeners = new Map(); }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  emit(type, event = {}) { this.listeners.get(type)?.({ target: this, ...event }); }
  click() { this.listeners.get('click')?.({ target: this }); this.onclick?.({ target: this }); }
}
const ids = ['display','expression','unit','history','rate','equals','clear','back','pct','toJpy','toUsd'];
const el = Object.fromEntries(ids.map(id => [id, new Element()]));
const saved = new Element();
const keys = ['0','00','.','1','2','3','4','5','6','7','8','9'].map(value => new Element({ dataset: { key: value } }));
const ops = ['+','−','×','÷'].map(value => new Element({ dataset: { op: value } }));
let keyHandler;
globalThis.document = {
  querySelector: selector => selector === '.saved' ? saved : el[selector.slice(1)],
  querySelectorAll: selector => selector === '[data-key]' ? keys : selector === '[data-op]' ? ops : [],
  addEventListener: (type, fn) => { if (type === 'keydown') keyHandler = fn; },
};
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
Object.defineProperty(globalThis, 'location', { value: new URL('https://calculator.example/index.html'), configurable: true });
Object.defineProperty(globalThis, 'navigator', { value: { serviceWorker: { register: () => Promise.resolve() } }, configurable: true });
await import(`./app.js?dom-test=${Date.now()}`);

const key = value => keys.find(button => button.dataset.key === value).click();
const op = value => ops.find(button => button.dataset.op === value).click();
const enter = text => [...text].forEach(key);
const shown = () => el.display.textContent;

enter('100'); op('×'); enter('200'); el.equals.click(); assert.equal(shown(), '20,000');
el.back.click(); assert.equal(shown(), '2,000');
el.back.click(); assert.equal(shown(), '200');
key('5'); assert.equal(shown(), '2,005');
el.clear.click(); enter('1234'); el.back.click(); assert.equal(shown(), '123');
keyHandler({ key: 'Backspace', target: {}, preventDefault() {} }); assert.equal(shown(), '12');
el.clear.click(); el.rate.value = '150.25'; el.rate.emit('input');
assert.equal(values.get('investment-calculator-usdjpy'), '150.25');
assert.equal(saved.textContent, '端末保存済み');
enter('100'); el.toJpy.click(); assert.equal(shown(), '15,025');
el.back.click(); assert.equal(shown(), '1,502');
el.rate.value = '151.5'; el.rate.emit('input');
assert.equal(values.get('investment-calculator-usdjpy'), '151.5');
el.rate.value = 'invalid'; el.rate.emit('input');
assert.equal(values.get('investment-calculator-usdjpy'), '151.5');
assert.equal(saved.textContent, '端末未保存');
el.rate.value = ''; await import(`./app.js?dom-reload-test=${Date.now()}`);
assert.equal(el.rate.value, '151.5');
assert.equal(saved.textContent, '端末保存済み');
console.log('14 DOM click, rate persistence, and keyboard integration tests passed');
