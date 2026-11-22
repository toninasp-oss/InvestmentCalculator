const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const CACHE_PREFIX = 'investment-calculator-';

export function isDevelopmentHost(hostname) {
  return LOCAL_HOSTS.has(hostname);
}

export async function configureServiceWorker({
  navigatorRef = navigator,
  locationRef = location,
  cacheStorage = globalThis.caches,
} = {}) {
  const serviceWorker = navigatorRef?.serviceWorker;
  if (!serviceWorker) return 'unsupported';

  if (!isDevelopmentHost(locationRef.hostname)) {
    await serviceWorker.register('./sw.js');
    return 'registered';
  }

  const scope = new URL('./', locationRef.href).href;
  const registrations = await serviceWorker.getRegistrations();
  await Promise.all(registrations
    .filter(registration => registration.scope === scope)
    .map(registration => registration.unregister()));

  if (cacheStorage) {
    const names = await cacheStorage.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX))
      .map(name => cacheStorage.delete(name)));
  }
  return 'development-cleanup';
}
