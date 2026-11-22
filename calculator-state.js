import { calculate, divide, format, multiply, normalize, percent } from './calculator.js';

export const RATE_STORAGE_KEY = 'investment-calculator-usdjpy';

export function createState() {
  return {
    current: '0',
    stored: null,
    op: null,
    phase: 'entering',
    constant: null,
    unit: '',
    history: [],
    error: null,
  };
}

function copy(state, changes) {
  return { ...state, ...changes };
}

function entryDisplay(value) {
  if (value.endsWith('.')) return `${format(value.slice(0, -1))}.`;
  return format(value);
}

function addHistory(state, line) {
  return [line, ...state.history].slice(0, 8);
}

function clearForEntry(state, keepConstant = false) {
  return copy(state, {
    current: '0',
    stored: null,
    op: null,
    phase: 'entering',
    constant: keepConstant ? state.constant : null,
    unit: '',
    error: null,
  });
}

function fail(state, error) {
  return copy(state, {
    current: '0',
    stored: null,
    op: null,
    phase: 'error',
    constant: null,
    unit: '',
    error: error.message,
  });
}

function completeNormal(state) {
  if (state.stored === null || state.op === null || state.phase === 'operatorPending') return state;
  const before = state.current;
  try {
    const result = calculate(state.stored, state.op, before);
    return copy(state, {
      current: result,
      stored: null,
      op: null,
      phase: 'result',
      constant: null,
      unit: '',
      history: addHistory(state, `${format(state.stored)} ${state.op} ${format(before)} = ${format(result)}`),
      error: null,
    });
  } catch (error) {
    return fail(state, error);
  }
}

function completeConstant(state) {
  if (!state.constant || !['entering', 'constant'].includes(state.phase)) return state;
  try {
    const left = state.current;
    const right = state.constant.value;
    const result = calculate(left, state.constant.op, right);
    return copy(state, {
      current: result,
      phase: 'constant',
      unit: '',
      history: addHistory(state, `${format(left)} ${state.constant.op} ${format(right)} = ${format(result)}`),
      error: null,
    });
  } catch (error) {
    return fail(state, error);
  }
}

export function input(state, digit) {
  const hasConstant = Boolean(state.constant);
  const base = ['result', 'conversion', 'error', 'constant', 'constantPending'].includes(state.phase)
    ? clearForEntry(state, Boolean(hasConstant))
    : state;
  const zeroKey = digit === '0' || digit === '00';
  let current = base.current === '0' && digit !== '.' ? (zeroKey ? '0' : digit) : `${base.current}${digit}`;
  if (digit === '.' && current.split('.').length > 2) current = current.slice(0, -1);
  return copy(base, { current, phase: 'entering', unit: '', error: null });
}

export function backspace(state) {
  if (state.phase === 'error') return createState();
  if (['result', 'conversion', 'constant', 'constantPending'].includes(state.phase)) {
    const current = state.current.length > 1 ? state.current.slice(0, -1) : '0';
    return copy(state, {
      current: current === '-' ? '0' : current,
      stored: null,
      op: null,
      phase: 'entering',
      constant: null,
      unit: '',
      error: null,
    });
  }
  const current = state.current.length > 1 ? state.current.slice(0, -1) : '0';
  return copy(state, { current: current === '-' ? '0' : current });
}

export function clear(state) {
  return copy(createState(), { history: state.history });
}

export function toggleSign(state) {
  if (state.phase === 'error') return state;
  const base = ['result', 'conversion', 'constant', 'constantPending'].includes(state.phase) ? clearForEntry(state) : state;
  const current = base.current === '0' ? '0' : base.current.startsWith('-') ? base.current.slice(1) : `-${base.current}`;
  return copy(base, { current, phase: 'entering', unit: '', error: null });
}

export function operate(state, next) {
  if (state.phase === 'error') return state;
  if (state.phase === 'operatorPending') {
    if (state.op === next) {
      return copy(state, {
        stored: null,
        op: null,
        phase: 'constantPending',
        constant: { value: state.stored, op: next },
      });
    }
    return copy(state, { op: next });
  }
  if (state.phase === 'constantPending') {
    return copy(state, {
      stored: state.constant.value,
      op: next,
      phase: 'operatorPending',
      constant: null,
      current: '0',
    });
  }

  const base = state.phase === 'entering' && state.stored !== null && state.op !== null ? completeNormal(state) : state;
  if (base.phase === 'error') return base;
  return copy(base, {
    stored: base.current,
    op: next,
    phase: 'operatorPending',
    constant: null,
    current: '0',
    unit: '',
    error: null,
  });
}

export function equals(state) {
  if (state.phase === 'error') return state;
  if (state.constant) return completeConstant(state);
  if (state.stored !== null && state.op !== null) return completeNormal(state);
  return state;
}

export function applyPercent(state) {
  if (state.phase === 'error') return state;
  const base = ['result', 'conversion', 'constant', 'constantPending'].includes(state.phase) ? clearForEntry(state) : state;
  try {
    const fraction = percent(base.current);
    const current = base.stored !== null && ['+', '−'].includes(base.op)
      ? multiply(base.stored, fraction)
      : fraction;
    return copy(base, { current, phase: 'entering', unit: '', error: null });
  } catch (error) {
    return fail(base, error);
  }
}

export function convert(state, kind, rawRate) {
  if (state.phase === 'error') return state;
  try {
    const rate = normalize(rawRate);
    if (!(Number(rate) > 0)) throw new Error('有効な USD/JPY レートを入力してください');
    const before = state.current;
    const current = kind === 'JPY' ? multiply(before, rate) : divide(before, rate);
    return copy(state, {
      current,
      stored: null,
      op: null,
      phase: 'conversion',
      constant: null,
      unit: kind,
      history: addHistory(state, `${format(before)} ${kind === 'JPY' ? 'USD ×' : 'JPY ÷'} ${format(rate)} = ${format(current)} ${kind}`),
      error: null,
    });
  } catch (error) {
    return fail(state, error);
  }
}

export function view(state) {
  const displayValue = state.phase === 'operatorPending'
    ? state.stored
    : state.phase === 'constantPending'
      ? state.constant.value
      : state.current;
  return {
    display: state.phase === 'error' ? 'E' : entryDisplay(displayValue),
    expression: state.phase === 'operatorPending' ? `${format(state.stored)} ${state.op}` : state.constant ? `K ${state.constant.op} ${format(state.constant.value)}` : '',
    unit: state.phase === 'error' ? state.error : state.unit || '—',
  };
}

export function actionForKey(key) {
  if (/^\d$/.test(key)) return { type: 'input', value: key };
  if (key === '.') return { type: 'input', value: '.' };
  if ({ '+': '+', '-': '−', '*': '×', '/': '÷' }[key]) return { type: 'operate', value: { '+': '+', '-': '−', '*': '×', '/': '÷' }[key] };
  if (key === '%' ) return { type: 'percent' };
  if (key === 'Enter' || key === '=') return { type: 'equals' };
  if (key === 'Backspace') return { type: 'backspace' };
  if (key === 'Escape') return { type: 'clear' };
  return null;
}

export function reduce(state, action) {
  switch (action.type) {
    case 'input': return input(state, action.value);
    case 'operate': return operate(state, action.value);
    case 'equals': return equals(state);
    case 'percent': return applyPercent(state);
    case 'backspace': return backspace(state);
    case 'clear': return clear(state);
    case 'sign': return toggleSign(state);
    case 'convert': return convert(state, action.kind, action.rate);
    default: return state;
  }
}

export function loadRate(storage) {
  return storage.getItem(RATE_STORAGE_KEY) || '';
}

export function saveRate(storage, value) {
  const rate = normalize(value);
  if (!(Number(rate) > 0)) throw new Error('有効な USD/JPY レートを入力してください');
  storage.setItem(RATE_STORAGE_KEY, rate);
  return rate;
}
