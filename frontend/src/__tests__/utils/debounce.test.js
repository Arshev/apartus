import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from '../../utils/debounce.js'

describe('utils/debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays the call until ms has elapsed', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    debounced('a')
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(199)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('coalesces rapid successive calls into a single trailing-edge invocation', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    debounced('a')
    vi.advanceTimersByTime(50)
    debounced('b')
    vi.advanceTimersByTime(50)
    debounced('c')
    vi.advanceTimersByTime(50)
    debounced('d')

    expect(fn).not.toHaveBeenCalled()

    // Full 200ms must elapse since the LAST call (d).
    vi.advanceTimersByTime(199)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    // Only the last argument set is delivered.
    expect(fn).toHaveBeenCalledWith('d')
  })

  it('allows a second invocation after the first trailing fire', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)

    debounced('second')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(2, 'second')
  })

  it('cancel() prevents a pending trailing-edge fire', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    debounced('pending')
    debounced.cancel()

    vi.advanceTimersByTime(1000)
    expect(fn).not.toHaveBeenCalled()
  })

  it('cancel() is safe to call when no timer is pending', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    // No scheduled call — cancel must not throw.
    expect(() => debounced.cancel()).not.toThrow()

    // After a fire, cancel is still a no-op.
    debounced('x')
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)

    expect(() => debounced.cancel()).not.toThrow()
  })

  it('forwards all arguments to fn', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a', 1, { k: 'v' })
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('a', 1, { k: 'v' })
  })
})
