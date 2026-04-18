import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useGanttShortcuts } from '../../composables/useGanttShortcuts.js'

// Test harness — mounts a trivial component that wires up the composable
// so lifecycle hooks (onMounted / onBeforeUnmount) actually fire.
function mountWithShortcuts(overrides = {}) {
  const state = {
    focusSearchInput: vi.fn(),
    goToday: vi.fn(),
    shiftRange: vi.fn(),
    onSearchEscape: vi.fn(),
    helpOpen: ref(false),
    searchQuery: ref(''),
    searchOpen: ref(false),
    ...overrides,
  }
  const wrapper = mount({
    template: '<div />',
    setup() {
      useGanttShortcuts(state)
      return {}
    },
  })
  mountedWrappers.push(wrapper)
  return { wrapper, state }
}

function press(code, opts = {}) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
  })
  // JSDOM's KeyboardEvent init dictionary historically does not populate
  // `code` / `key` / `shiftKey` reliably — force them via defineProperty.
  Object.defineProperty(event, 'code', { value: code, configurable: true })
  Object.defineProperty(event, 'key', { value: opts.key ?? '', configurable: true })
  Object.defineProperty(event, 'shiftKey', { value: opts.shiftKey ?? false, configurable: true })
  window.dispatchEvent(event)
  return event
}

// Track mounted wrappers so we can unmount them between tests — otherwise
// previous tests' handlers keep firing on window and interfere with assertions
// (they consume `preventDefault` before the current test's handler sees it).
const mountedWrappers = []

describe('useGanttShortcuts', () => {
  afterEach(() => {
    while (mountedWrappers.length) mountedWrappers.pop().unmount()
    document.querySelectorAll('.v-overlay--active').forEach((el) => el.remove())
  })

  describe('guards', () => {
    it('ignores key when target is an input', () => {
      const { state } = mountWithShortcuts()
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()
      const event = new KeyboardEvent('keydown', { code: 'KeyT', bubbles: true })
      input.dispatchEvent(event)
      expect(state.goToday).not.toHaveBeenCalled()
      input.remove()
    })

    it('ignores key when target is contenteditable', () => {
      const { state } = mountWithShortcuts()
      const div = document.createElement('div')
      div.setAttribute('contenteditable', 'true')
      document.body.appendChild(div)
      div.focus()
      const event = new KeyboardEvent('keydown', { code: 'KeyT', bubbles: true })
      div.dispatchEvent(event)
      expect(state.goToday).not.toHaveBeenCalled()
      div.remove()
    })

    it('ignores key when a Vuetify overlay is active', () => {
      const { state } = mountWithShortcuts()
      const overlay = document.createElement('div')
      overlay.className = 'v-overlay--active'
      document.body.appendChild(overlay)
      press('KeyT')
      expect(state.goToday).not.toHaveBeenCalled()
    })

    it('ignores when defaultPrevented is already true', () => {
      const { state } = mountWithShortcuts()
      const event = new KeyboardEvent('keydown', { code: 'KeyT', bubbles: true, cancelable: true })
      event.preventDefault()
      window.dispatchEvent(event)
      expect(state.goToday).not.toHaveBeenCalled()
    })
  })

  describe('shortcut dispatch', () => {
    it('/ focuses search and prevents default', () => {
      const { state } = mountWithShortcuts()
      const event = press('Slash')
      expect(state.focusSearchInput).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
    })

    it('T calls goToday', () => {
      const { state } = mountWithShortcuts()
      press('KeyT')
      expect(state.goToday).toHaveBeenCalledTimes(1)
    })

    it('[ pans range backward (shift -1)', () => {
      const { state } = mountWithShortcuts()
      press('BracketLeft')
      expect(state.shiftRange).toHaveBeenCalledWith(-1)
    })

    it('] pans range forward (shift +1)', () => {
      const { state } = mountWithShortcuts()
      press('BracketRight')
      expect(state.shiftRange).toHaveBeenCalledWith(1)
    })

    it('S calls toggleSidebar (FT-030)', () => {
      const toggleSidebar = vi.fn()
      const { state } = mountWithShortcuts({ toggleSidebar })
      press('KeyS')
      expect(toggleSidebar).toHaveBeenCalledTimes(1)
    })

    it('S is a no-op when toggleSidebar handler is missing (backward-compat)', () => {
      // Default mountWithShortcuts doesn't include toggleSidebar. Older
      // callers should still mount without error.
      mountWithShortcuts()
      expect(() => press('KeyS')).not.toThrow()
    })

    it('D calls toggleDensity (FT-033)', () => {
      const toggleDensity = vi.fn()
      mountWithShortcuts({ toggleDensity })
      press('KeyD')
      expect(toggleDensity).toHaveBeenCalledTimes(1)
    })

    it('D is a no-op when toggleDensity handler is missing (backward-compat)', () => {
      mountWithShortcuts()
      expect(() => press('KeyD')).not.toThrow()
    })
  })

  describe('? — help dialog', () => {
    it('Shift+/ (US layout) opens help', () => {
      const { state } = mountWithShortcuts()
      press('Slash', { shiftKey: true })
      expect(state.helpOpen.value).toBe(true)
    })

    it('key === "?" (covers RU layout Shift+7 producing ?) opens help', () => {
      const { state } = mountWithShortcuts()
      press('Digit7', { shiftKey: true, key: '?' })
      expect(state.helpOpen.value).toBe(true)
    })

    it('Escape closes help dialog and blocks other cascades', () => {
      const { state } = mountWithShortcuts()
      state.helpOpen.value = true
      state.searchOpen.value = true
      state.searchQuery.value = 'foo'
      press('Escape')
      expect(state.helpOpen.value).toBe(false)
      // While help was open, search cascade must NOT fire.
      expect(state.onSearchEscape).not.toHaveBeenCalled()
    })

    it('While help open, other keys are swallowed', () => {
      const { state } = mountWithShortcuts()
      state.helpOpen.value = true
      press('KeyT')
      expect(state.goToday).not.toHaveBeenCalled()
    })
  })

  describe('Escape cascade', () => {
    it('Escape clears search when query is non-empty', () => {
      const { state } = mountWithShortcuts()
      state.searchOpen.value = true
      state.searchQuery.value = 'abc'
      press('Escape')
      expect(state.onSearchEscape).toHaveBeenCalledTimes(1)
    })

    it('Escape collapses empty search without calling onSearchEscape', () => {
      const { state } = mountWithShortcuts()
      state.searchOpen.value = true
      state.searchQuery.value = ''
      press('Escape')
      expect(state.searchOpen.value).toBe(false)
      expect(state.onSearchEscape).not.toHaveBeenCalled()
    })

    it('Escape is a no-op when search is closed and help is closed', () => {
      const { state } = mountWithShortcuts()
      press('Escape')
      expect(state.onSearchEscape).not.toHaveBeenCalled()
      expect(state.helpOpen.value).toBe(false)
    })
  })

  describe('unmount cleanup', () => {
    it('removes keydown listener on unmount', () => {
      const { wrapper, state } = mountWithShortcuts()
      wrapper.unmount()
      press('KeyT')
      expect(state.goToday).not.toHaveBeenCalled()
    })
  })
})
