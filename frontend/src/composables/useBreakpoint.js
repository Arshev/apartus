// FT-036 P5: Minimal useBreakpoint replacing Vuetify useDisplay.
// Only exposes what Gantt needs (lgAndUp at 1280px per Vuetify 4 convention).
import { ref, onMounted, onUnmounted } from 'vue'

export function useBreakpoint() {
  const lgAndUp = ref(false)

  let mql = null

  function update() {
    lgAndUp.value = mql ? mql.matches : false
  }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia('(min-width: 1280px)')
    update()
    if (mql.addEventListener) mql.addEventListener('change', update)
    else mql.addListener(update)
  })

  onUnmounted(() => {
    if (!mql) return
    if (mql.removeEventListener) mql.removeEventListener('change', update)
    else mql.removeListener(update)
  })

  return { lgAndUp }
}
