import { actionForKey, createState, loadRate, reduce, saveRate, view } from './calculator-state.js';
import { configureServiceWorker } from './sw-registration.js';

const $ = s => document.querySelector(s);
let state = createState();
const display = $('#display'), expr = $('#expression'), unitEl = $('#unit'), historyEl = $('#history'), rateEl = $('#rate'), rateStatus = $('.saved');

function draw() {
  const screen = view(state);
  display.textContent = screen.display;
  expr.textContent = screen.expression;
  unitEl.textContent = screen.unit;
  historyEl.innerHTML = state.history.map(x => `<li>${x}</li>`).join('');
}

function dispatch(action) {
  state = reduce(state, action);
  draw();
}

function convert(kind) {
  dispatch({ type: 'convert', kind, rate: rateEl.value });
}

document.querySelectorAll('[data-key]').forEach(b => b.onclick = () => dispatch({ type: 'input', value: b.dataset.key }));
document.querySelectorAll('[data-op]').forEach(b => b.onclick = () => dispatch({ type: 'operate', value: b.dataset.op }));
$('#equals').onclick = () => dispatch({ type: 'equals' });
$('#clear').onclick = () => dispatch({ type: 'clear' });
$('#back').addEventListener('click', () => dispatch({ type: 'backspace' }));
$('#pct').onclick = () => dispatch({ type: 'percent' });
$('#toJpy').onclick = () => convert('JPY');
$('#toUsd').onclick = () => convert('USD');
rateEl.value = loadRate(localStorage);
function saveRateFromInput({ normalizeField = false } = {}) {
  try {
    const rate = saveRate(localStorage, rateEl.value);
    if (normalizeField) rateEl.value = rate;
    rateStatus.textContent = '端末保存済み';
  } catch (error) {
    rateStatus.textContent = '端末未保存';
  }
}
rateStatus.textContent = rateEl.value ? '端末保存済み' : '端末未保存';
rateEl.addEventListener('input', () => saveRateFromInput());
rateEl.addEventListener('change', () => saveRateFromInput({ normalizeField: true }));
document.addEventListener('keydown', event => {
  if (event.target === rateEl) return;
  const action = actionForKey(event.key);
  if (!action) return;
  event.preventDefault();
  dispatch(action);
});
draw();
configureServiceWorker().catch(() => {});
