// Node 25+ provides a native `localStorage` that shadows jsdom's implementation.
// The native version is incomplete (missing clear/removeItem/key/length),
// which breaks tests. Replace it with a proper in-memory implementation.
if (typeof globalThis.localStorage === 'undefined' ||
    typeof globalThis.localStorage.clear !== 'function' ||
    typeof globalThis.localStorage.removeItem !== 'function') {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size },
    key: (index) => [...store.keys()][index] ?? null,
  }
}
