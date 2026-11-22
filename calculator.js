const PRECISION = 12;

export function normalize(input) {
  let s = String(input).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) throw new Error('Invalid number');
  let sign = '';
  if (s[0] === '-' || s[0] === '+') { sign = s[0] === '-' ? '-' : ''; s = s.slice(1); }
  let [i, f = ''] = s.split('.'); i = i.replace(/^0+(?=\d)/, '') || '0'; f = f.replace(/0+$/, '');
  return sign && !(i === '0' && !f) ? `${sign}${i}${f ? `.${f}` : ''}` : `${i}${f ? `.${f}` : ''}`;
}
function parts(x) { const s = normalize(x); const neg = s[0] === '-'; const [i, f = ''] = (neg ? s.slice(1) : s).split('.'); return { neg, n: BigInt(i + f), scale: f.length }; }
function show(n, scale) { const neg = n < 0n; let v = (neg ? -n : n).toString().padStart(scale + 1, '0'); const s = scale ? `${v.slice(0, -scale)}.${v.slice(-scale)}` : v; return normalize(`${neg ? '-' : ''}${s}`); }
export function add(a,b) { const x=parts(a), y=parts(b), s=Math.max(x.scale,y.scale); return show((x.neg?-x.n:x.n)*10n**BigInt(s-x.scale)+(y.neg?-y.n:y.n)*10n**BigInt(s-y.scale),s); }
export function subtract(a,b) { return add(a, normalize(b).startsWith('-') ? normalize(b).slice(1) : `-${normalize(b)}`); }
export function multiply(a,b) { const x=parts(a),y=parts(b); return show((x.neg?-x.n:x.n)*(y.neg?-y.n:y.n),x.scale+y.scale); }
export function divide(a,b) { const x=parts(a),y=parts(b); if (y.n===0n) throw new Error('Cannot divide by zero'); const sign=x.neg===y.neg?1n:-1n; const q=sign*x.n*10n**BigInt(PRECISION+y.scale)/ (y.n*10n**BigInt(x.scale)); return show(q,PRECISION); }
export function percent(a) { return divide(a,'100'); }
export function calculate(a, op, b) { return ({'+':add,'−':subtract,'×':multiply,'÷':divide})[op](a,b); }
export function format(value) { const [i,f] = normalize(value).split('.'); const neg=i.startsWith('-'); const digits=(neg?i.slice(1):i).replace(/\B(?=(\d{3})+(?!\d))/g, ','); return `${neg?'-':''}${digits}${f ? `.${f}` : ''}`; }
