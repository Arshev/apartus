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

// jsdom does not implement ResizeObserver, but several Vuetify components
// (VProgressCircular, VOverlay, etc.) call it during setup. Provide a no-op
// shim so component tests don't crash on import.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// Vuetify's VOverlay (used by VMenu, VDatePicker) reads window.visualViewport,
// which jsdom does not implement. Shim to keep tests from crashing on overlay
// composables.
if (typeof globalThis.visualViewport === 'undefined') {
  globalThis.visualViewport = {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    addEventListener() {},
    removeEventListener() {},
  }
}

// Vuetify v4 injects theme CSS using `@layer` cascade rules, which jsdom v25
// cannot parse and surfaces as an unhandled error during HTMLStyleElement
// innerHTML assignment. The injected CSS is irrelevant for component logic
// tests — wrap the HTMLStyleElement innerHTML setter to swallow the parse
// error so vitest exits cleanly.
if (typeof HTMLStyleElement !== 'undefined') {
  const proto = HTMLStyleElement.prototype
  const desc = Object.getOwnPropertyDescriptor(proto, 'innerHTML') ||
    Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')
  if (desc && desc.set) {
    const originalSetter = desc.set
    Object.defineProperty(proto, 'innerHTML', {
      ...desc,
      set(value) {
        try {
          originalSetter.call(this, value)
        } catch (e) {
          if (!String(e?.message || '').includes('Could not parse CSS')) throw e
          // Silently drop CSS parse errors from jsdom — Vuetify @layer rules
          // are not parseable by jsdom v25 but are not needed for tests.
        }
      },
    })
  }
}
