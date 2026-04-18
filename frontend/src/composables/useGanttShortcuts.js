// FT-029 Gantt keyboard shortcuts.
//
// Attaches a single `window.keydown` listener during component mount and
// detaches on unmount. Dispatches on `event.code` for layout-independence
// (RU and EN users press the same physical key).
//
// Accepted shortcuts:
//   /        — focus search (code: Slash, NO shiftKey)
//   T        — jump to today (code: KeyT)
//   [        — pan one range window earlier (code: BracketLeft)
//   ]        — pan one range window later (code: BracketRight)
//   S        — toggle sidebar collapse (FT-030, code: KeyS)
//   D        — toggle density comfortable/compact (FT-033, code: KeyD)
//   Escape   — close overlay / clear search (code: Escape)
//   ?        — open help dialog
//              (code: Slash + shiftKey, OR key === '?' to cover layouts
//              like RU where Shift+7 produces '?')
//
// Guards — handler is a no-op when:
//   - target is an input-like element (INPUT, TEXTAREA, contenteditable)
//   - a Vuetify overlay is active (`.v-overlay--active` in DOM) — lets
//     dialogs / menus / date pickers handle their own Esc and key input
//   - the event was already handled (defaultPrevented)
import { onMounted, onBeforeUnmount } from 'vue'

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA'])

function isTypingTarget(target) {
  if (!target) return false
  if (INPUT_TAGS.has(target.tagName)) return true
  // `isContentEditable` is a computed boolean on HTMLElement in browsers but
  // not universally available in jsdom — fall back to the attribute check so
  // the guard behaves the same in tests and prod.
  if (target.isContentEditable === true) return true
  if (target.getAttribute && target.getAttribute('contenteditable') === 'true') return true
  return false
}

function hasActiveOverlay() {
  // FT-036 P5: support both Vuetify (hybrid phases) and PrimeVue (post-P7).
  // Vuetify: `.v-overlay--active` while dialog/menu/date-picker/tooltip visible.
  // PrimeVue: `.p-overlay-mask` while Dialog modal open; `.p-menu` / `.p-popover`
  // для popups.
  return !!document.querySelector(
    '.v-overlay--active, .p-overlay-mask, .p-menu-overlay, .p-popover',
  )
}

export function useGanttShortcuts({
  focusSearchInput,
  goToday,
  shiftRange,
  toggleSidebar,
  toggleDensity,
  onSearchEscape,
  helpOpen,
  searchQuery,
  searchOpen,
}) {
  function handler(event) {
    if (event.defaultPrevented) return
    if (isTypingTarget(event.target)) return

    // Help dialog open — let its own Esc close it; ignore every other key.
    if (helpOpen.value) {
      if (event.code === 'Escape') {
        helpOpen.value = false
        event.preventDefault()
      }
      return
    }

    if (hasActiveOverlay()) return

    // `?` — open help. Layout-safe: code + shift OR key === '?'.
    if ((event.code === 'Slash' && event.shiftKey) || event.key === '?') {
      helpOpen.value = true
      event.preventDefault()
      return
    }

    // `/` — focus search (no shift).
    if (event.code === 'Slash' && !event.shiftKey) {
      focusSearchInput()
      event.preventDefault()
      return
    }

    // `T` — today.
    if (event.code === 'KeyT') {
      goToday()
      event.preventDefault()
      return
    }

    // `S` — toggle sidebar collapse (FT-030). Handler optional: only fires if
    // CalendarView wired it (keeps composable backward-compat with tests).
    if (event.code === 'KeyS') {
      if (typeof toggleSidebar === 'function') {
        toggleSidebar()
        event.preventDefault()
      }
      return
    }

    // `D` — toggle Gantt density (FT-033). Handler optional (same pattern as S).
    if (event.code === 'KeyD') {
      if (typeof toggleDensity === 'function') {
        toggleDensity()
        event.preventDefault()
      }
      return
    }

    // `[` / `]` — pan range.
    if (event.code === 'BracketLeft') {
      shiftRange(-1)
      event.preventDefault()
      return
    }
    if (event.code === 'BracketRight') {
      shiftRange(1)
      event.preventDefault()
      return
    }

    // Escape — cascade: (1) active search with query → clear; (2) search open
    // empty → just collapse. No-op for the rest (native Esc handlers take over
    // once overlays are active, guarded above).
    if (event.code === 'Escape') {
      if (searchOpen.value) {
        if (searchQuery.value) {
          onSearchEscape()
        } else {
          searchOpen.value = false
        }
        event.preventDefault()
      }
      return
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handler)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handler)
  })

  return { handler }
}
