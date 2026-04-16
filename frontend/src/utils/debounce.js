// Trailing-edge debounce factory.
// Returns a wrapped function that defers invoking `fn` until `ms` milliseconds
// have elapsed since the last call. The wrapped function exposes `cancel()` to
// abort a pending call (e.g. on component unmount per FT-025 FM-08).
//
// Usage:
//   const debounced = debounce(setQuery, 200)
//   debounced('hi')          // schedules
//   debounced('hi there')    // resets timer
//   debounced.cancel()       // clears pending call
//
// Minimal: no leading-edge, no maxWait. Sufficient for search input debouncing.
export function debounce(fn, ms) {
  let timer = null

  function wrapped(...args) {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, ms)
  }

  wrapped.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return wrapped
}
