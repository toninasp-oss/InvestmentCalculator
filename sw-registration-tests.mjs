import assert from 'node:assert/strict';
import { configureServiceWorker, isDevelopmentHost } from './sw-registration.js';

assert.equal(isDevelopmentHost('127.0.0.1'), true);
assert.equal(isDevelopmentHost('localhost'), true);
assert.equal(isDevelopmentHost('example.test'), false);

let registered = '';
await configureServiceWorker({
  navigatorRef: { serviceWorker: { register: async url => { registered = url; } } },
  locationRef: new URL('https://calculator.example/app/index.html'),
  cacheStorage: null,
});
assert.equal(registered, './sw.js');

let removedCurrentScope = 0;
let removedOtherScope = 0;
const deleted = [];
await configureServiceWorker({
  navigatorRef: { serviceWorker: { getRegistrations: async () => [
    { scope: 'http://127.0.0.1:8080/', unregister: async () => { removedCurrentScope++; } },
    { scope: 'http://127.0.0.1:8080/other/', unregister: async () => { removedOtherScope++; } },
  ] } },
  locationRef: new URL('http://127.0.0.1:8080/index.html'),
  cacheStorage: {
    keys: async () => ['investment-calculator-v11', 'investment-calculator-v12', 'unrelated-cache'],
    delete: async name => { deleted.push(name); },
  },
});
assert.equal(removedCurrentScope, 1);
assert.equal(removedOtherScope, 0);
assert.deepEqual(deleted.sort(), ['investment-calculator-v11', 'investment-calculator-v12']);
console.log('8 Service Worker registration isolation tests passed');
