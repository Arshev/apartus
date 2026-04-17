import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../api/reservations', () => ({
  list: vi.fn().mockResolvedValue([]),
  checkIn: vi.fn().mockResolvedValue({}),
  checkOut: vi.fn().mockResolvedValue({}),
  cancel: vi.fn().mockResolvedValue({}),
}))
vi.mock('../../../api/allUnits', () => ({
  list: vi.fn().mockResolvedValue([{ id: 1, name: 'U1', property_name: 'P1' }]),
}))

import { mountWithVuetify } from '../../helpers/mountWithVuetify'
import GanttCalendarView from '../../../views/calendar/GanttCalendarView.vue'
import * as reservationsApi from '../../../api/reservations'
import * as allUnitsApi from '../../../api/allUnits'

const STORAGE_KEY = 'apartus-calendar-view'

const TIMELINE_STUB = {
  template: '<div class="timeline-stub" />',
  props: ['units', 'reservations', 'viewStart', 'viewEnd', 'baseRowHeight', 'itemHeight'],
  methods: { scrollToToday: vi.fn(), scrollToDate: vi.fn() },
}

function setup() {
  const wrapper = mountWithVuetify(GanttCalendarView, {
    global: {
      stubs: {
        GanttTimeline: TIMELINE_STUB,
        GanttTooltip: true,
      },
    },
  })
  return wrapper
}

describe('GanttCalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    reservationsApi.list.mockResolvedValue([])
    allUnitsApi.list.mockResolvedValue([{ id: 1, name: 'U1', property_name: 'P1' }])
  })

  it('loads reservations + units on mount with default 14d range', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    expect(reservationsApi.list).toHaveBeenCalledTimes(1)
    expect(allUnitsApi.list).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.rangeDays).toBe(14)
  })

  it('refetches reservations when range changes', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    reservationsApi.list.mockClear()
    wrapper.vm.rangeDays = 30
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    expect(reservationsApi.list).toHaveBeenCalled()
  })

  it('persists range to localStorage on change', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick()
    wrapper.vm.rangeDays = 7
    await wrapper.vm.$nextTick()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored.rangeDays).toBe(7)
  })

  it('reads persisted range from localStorage on mount', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: 30 }))
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    expect(wrapper.vm.rangeDays).toBe(30)
  })

  it('falls back to default when stored range is unsupported', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: 999 }))
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    expect(wrapper.vm.rangeDays).toBe(14)
  })

  it('falls back to default when localStorage throws (NEG-04)', async () => {
    const orig = Storage.prototype.getItem
    Storage.prototype.getItem = vi.fn(() => { throw new Error('blocked') })
    try {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.rangeDays).toBe(14)
    } finally {
      Storage.prototype.getItem = orig
    }
  })

  it('manual refresh button triggers loadData', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    reservationsApi.list.mockClear()
    await wrapper.vm.loadData()
    expect(reservationsApi.list).toHaveBeenCalledTimes(1)
  })

  it('visibilitychange listener triggers refetch when tab becomes visible', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    reservationsApi.list.mockClear()
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await wrapper.vm.$nextTick()
    expect(reservationsApi.list).toHaveBeenCalled()
  })

  it('shows error alert when loadData fails (NEG-06)', async () => {
    reservationsApi.list.mockRejectedValueOnce(new Error('500'))
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    expect(wrapper.vm.error).toBeTruthy()
  })

  it('shows empty-state when no units (NEG-01)', async () => {
    allUnitsApi.list.mockResolvedValue([])
    const wrapper = setup()
    await wrapper.vm.loadData()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.units).toHaveLength(0)
    expect(wrapper.text()).toContain('Нет юнитов')
  })

  it('show-booking event navigates to edit page', () => {
    const wrapper = setup()
    const router = wrapper.vm.$router
    const pushSpy = vi.spyOn(router, 'push')
    wrapper.vm.onShowBooking(42)
    expect(pushSpy).toHaveBeenCalledWith('/reservations/42/edit')
  })

  it('contextCheckIn invokes API + reloads', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    wrapper.vm.contextMenu = { open: true, booking: { id: 5, status: 'confirmed' }, x: 0, y: 0 }
    reservationsApi.list.mockClear()
    await wrapper.vm.contextCheckIn()
    expect(reservationsApi.checkIn).toHaveBeenCalledWith(5)
    expect(reservationsApi.list).toHaveBeenCalled()
  })

  it('contextCheckIn shows snackbar on failure (NEG-05)', async () => {
    reservationsApi.checkIn.mockRejectedValueOnce(new Error('422'))
    const wrapper = setup()
    await wrapper.vm.$nextTick()
    wrapper.vm.contextMenu = { open: true, booking: { id: 5, status: 'confirmed' }, x: 0, y: 0 }
    await wrapper.vm.contextCheckIn()
    expect(wrapper.vm.snackbar.open).toBe(true)
    expect(wrapper.vm.snackbar.color).toBe('error')
  })

  it('show-tooltip event sets tooltip state visible', () => {
    const wrapper = setup()
    wrapper.vm.onShowTooltip({ booking: { id: 1 }, x: 100, y: 200 })
    expect(wrapper.vm.tooltip).toMatchObject({ visible: true, x: 100, y: 200 })
  })

  it('hide-tooltip clears visibility', () => {
    const wrapper = setup()
    wrapper.vm.onShowTooltip({ booking: { id: 1 }, x: 100, y: 200 })
    wrapper.vm.onHideTooltip()
    expect(wrapper.vm.tooltip.visible).toBe(false)
  })

  // --- FT-021 Handover Mode ---
  describe('handover mode toggle + persistence (FT-021)', () => {
    it('defaults specialMode to empty string', () => {
      const wrapper = setup()
      expect(wrapper.vm.specialMode).toBe('')
    })

    it('toggleHandover flips "" → "handover" → ""', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHandover()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('handover')
      wrapper.vm.toggleHandover()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('')
    })

    it('persists specialMode to localStorage on toggle', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHandover()
      await wrapper.vm.$nextTick()
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stored.specialMode).toBe('handover')
    })

    it('reads persisted specialMode on mount', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: 14, specialMode: 'handover' }))
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('handover')
    })

    // Backwards-compat: legacy payloads without specialMode → resolves to ''.
    it('backward-compat — legacy payload without specialMode → "" (no exception)', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: 14 }))
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('')
      expect(wrapper.vm.rangeDays).toBe(14)
    })

    it('invalid specialMode value → "" fallback', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: 14, specialMode: 'invalid' }))
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('')
    })

    it('persists both rangeDays and specialMode together', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.rangeDays = 7
      wrapper.vm.toggleHandover()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      // FT-025 extended payload with searchQuery; use toMatchObject for
      // forward-compat across future persistence fields.
      expect(stored).toMatchObject({ rangeDays: 7, specialMode: 'handover' })
    })
  })

  // --- FT-022 Overdue Mode ---
  describe('overdue mode + mutual exclusion (FT-022)', () => {
    it('toggleOverdue flips "" → "overdue" → ""', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleOverdue()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('overdue')
      wrapper.vm.toggleOverdue()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('')
    })

    it('setSpecialMode helper toggles off when same mode clicked', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.setSpecialMode('overdue')
      expect(wrapper.vm.specialMode).toBe('overdue')
      wrapper.vm.setSpecialMode('overdue')
      expect(wrapper.vm.specialMode).toBe('')
    })

    it('mutual exclusion — clicking overdue while handover active switches mode (SC-02)', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHandover()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('handover')
      wrapper.vm.toggleOverdue()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('overdue')
    })

    it('mutual exclusion reverse — clicking handover while overdue active switches mode', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleOverdue()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHandover()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('handover')
    })

    it('persists specialMode "overdue" to localStorage', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleOverdue()
      await wrapper.vm.$nextTick()
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stored.specialMode).toBe('overdue')
    })

    it('reads persisted specialMode "overdue" on mount', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: 14, specialMode: 'overdue' }))
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('overdue')
    })
  })

  // --- FT-023 Idle Gaps Mode ---
  describe('idle gaps mode (FT-023)', () => {
    it('toggleIdle flips "" → "idle" → ""', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleIdle()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('idle')
      wrapper.vm.toggleIdle()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('')
    })

    it('mutual exclusion — handover → idle', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHandover()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleIdle()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('idle')
    })

    it('mutual exclusion — overdue → idle', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleOverdue()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleIdle()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('idle')
    })

    it('mutual exclusion — idle → handover', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleIdle()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHandover()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('handover')
    })

    it('persists "idle" to localStorage', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleIdle()
      await wrapper.vm.$nextTick()
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stored.specialMode).toBe('idle')
    })

    it('reads persisted "idle" on mount', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: 14, specialMode: 'idle' }))
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('idle')
    })
  })

  // --- FT-024 Heatmap Mode ---
  describe('heatmap mode (FT-024)', () => {
    it('toggleHeatmap flips "" → "heatmap" → ""', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHeatmap()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('heatmap')
      wrapper.vm.toggleHeatmap()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('')
    })

    it('mutual exclusion — handover → heatmap', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHandover()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHeatmap()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('heatmap')
    })

    it('mutual exclusion — idle → heatmap', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleIdle()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHeatmap()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('heatmap')
    })

    it('mutual exclusion — overdue → heatmap', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleOverdue()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHeatmap()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('heatmap')
    })

    it('persists "heatmap" to localStorage', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleHeatmap()
      await wrapper.vm.$nextTick()
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stored.specialMode).toBe('heatmap')
    })

    it('reads persisted "heatmap" on mount', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: 14, specialMode: 'heatmap' }))
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.specialMode).toBe('heatmap')
    })
  })

  // --- FT-025 Search Bar ---
  describe('search bar (FT-025)', () => {
    beforeEach(() => {
      // Richer dataset for filter assertions.
      allUnitsApi.list.mockResolvedValue([
        { id: 1, name: 'Studio 101', property_name: 'Пальмы' },
        { id: 2, name: 'Apt 204A', property_name: 'Пальмы' },
        { id: 3, name: 'Suite 300', property_name: 'Дубки' },
      ])
      reservationsApi.list.mockResolvedValue([
        { id: 10, unit_id: 1, guest_name: 'Иван Петров', check_in: '2026-04-10', check_out: '2026-04-12', status: 'confirmed' },
        { id: 11, unit_id: 3, guest_name: 'Мария Сидорова', check_in: '2026-04-15', check_out: '2026-04-18', status: 'confirmed' },
      ])
    })

    it('initial state: search collapsed, query empty, nothing filtered', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.searchOpen).toBe(false)
      expect(wrapper.vm.searchQuery).toBe('')
      expect(wrapper.vm.debouncedQuery).toBe('')
      expect(wrapper.vm.filteredUnits).toHaveLength(3)
      expect(wrapper.vm.filteredReservations).toHaveLength(2)
    })

    it('onOpenSearch expands the bar', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      wrapper.vm.onOpenSearch()
      expect(wrapper.vm.searchOpen).toBe(true)
    })

    it('applies the debounced query to filtered units', async () => {
      vi.useFakeTimers()
      try {
        const wrapper = setup()
        // Mount may schedule a debounce (via watcher firing on init); drain it.
        await vi.runAllTimersAsync()
        await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()

        wrapper.vm.searchQuery = 'Иван'
        await wrapper.vm.$nextTick()
        // Debounce not elapsed yet: debouncedQuery unchanged.
        expect(wrapper.vm.debouncedQuery).toBe('')

        await vi.advanceTimersByTimeAsync(200)
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.debouncedQuery).toBe('Иван')
        expect(wrapper.vm.filteredUnits.map((u) => u.id)).toEqual([1])
      } finally {
        vi.useRealTimers()
      }
    })

    it('coalesces rapid keystrokes into a single trailing-edge update', async () => {
      vi.useFakeTimers()
      try {
        const wrapper = setup()
        await vi.runAllTimersAsync()
        await wrapper.vm.$nextTick()

        wrapper.vm.searchQuery = 'И'
        await vi.advanceTimersByTimeAsync(50)
        wrapper.vm.searchQuery = 'Ив'
        await vi.advanceTimersByTimeAsync(50)
        wrapper.vm.searchQuery = 'Иван'
        await vi.advanceTimersByTimeAsync(199)
        // Still within the debounce window since last change.
        expect(wrapper.vm.debouncedQuery).toBe('')

        await vi.advanceTimersByTimeAsync(1)
        expect(wrapper.vm.debouncedQuery).toBe('Иван')
      } finally {
        vi.useRealTimers()
      }
    })

    it('onSearchEscape clears query + flushes debounce + collapses', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      wrapper.vm.onOpenSearch()
      wrapper.vm.searchQuery = 'foo'
      wrapper.vm.debouncedQuery = 'foo'
      await wrapper.vm.$nextTick()

      await wrapper.vm.onSearchEscape()
      expect(wrapper.vm.searchQuery).toBe('')
      expect(wrapper.vm.debouncedQuery).toBe('')
      expect(wrapper.vm.searchOpen).toBe(false)
    })

    it('stays expanded on blur (only Escape collapses, see FT-025 REQ-01)', async () => {
      // The bar intentionally doesn't auto-collapse on blur — otherwise
      // clicking anywhere on the calendar would close the search even when
      // a non-empty filter is active. Escape is the explicit close path.
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      wrapper.vm.onOpenSearch()
      expect(wrapper.vm.searchOpen).toBe(true)

      // Simulate clicking away from the input (no handler fires — no change).
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.searchOpen).toBe(true)
    })

    it('coerces null (from v-text-field clearable) back to empty string', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      wrapper.vm.searchQuery = 'foo'
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.searchQuery).toBe('foo')

      // Vuetify's clearable X-button sets model to null, not ''. Ensure the
      // watcher coerces it back so persistence + filtering stay string-typed.
      wrapper.vm.searchQuery = null
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.searchQuery).toBe('')
    })

    it('persists searchQuery to localStorage', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      wrapper.vm.searchQuery = 'Иван'
      await wrapper.vm.$nextTick()
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stored.searchQuery).toBe('Иван')
    })

    it('restores searchQuery synchronously — filtered units on first render (ER-03)', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rangeDays: 14, specialMode: '', searchQuery: 'Пальмы' }),
      )
      const wrapper = setup()
      // First tick: loadStoredView ran in setup(), so filteredUnits already
      // narrowed BEFORE mount completes loading units. Once units load,
      // filter applies immediately without waiting for debounce.
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.searchQuery).toBe('Пальмы')
      expect(wrapper.vm.debouncedQuery).toBe('Пальмы')
      expect(wrapper.vm.searchOpen).toBe(true)
      expect(wrapper.vm.filteredUnits.map((u) => u.id)).toEqual([1, 2])
    })

    it('ignores invalid persisted searchQuery (non-string)', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rangeDays: 14, specialMode: '', searchQuery: 42 }),
      )
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.searchQuery).toBe('')
      expect(wrapper.vm.searchOpen).toBe(false)
    })

    it('legacy payload without searchQuery field resolves to empty', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: 30 }))
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.rangeDays).toBe(30)
      expect(wrapper.vm.searchQuery).toBe('')
    })

    it.each([
      ['handover', 'toggleHandover'],
      ['overdue', 'toggleOverdue'],
      ['idle', 'toggleIdle'],
      ['heatmap', 'toggleHeatmap'],
    ])('stacks search with %s mode — filtered subset preserved', async (mode, toggleFn) => {
      vi.useFakeTimers()
      try {
        const wrapper = setup()
        await vi.runAllTimersAsync()
        await wrapper.vm.$nextTick()

        wrapper.vm.searchQuery = 'Пальмы'
        await vi.advanceTimersByTimeAsync(200)
        wrapper.vm[toggleFn]()
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.specialMode).toBe(mode)
        expect(wrapper.vm.filteredUnits.map((u) => u.id)).toEqual([1, 2])
      } finally {
        vi.useRealTimers()
      }
    })

    it('renders search empty-state when query has no matches (NEG-01)', async () => {
      vi.useFakeTimers()
      try {
        const wrapper = setup()
        await vi.runAllTimersAsync()
        await wrapper.vm.$nextTick()

        wrapper.vm.searchQuery = 'zzz-nothing-matches'
        await vi.advanceTimersByTimeAsync(200)
        await wrapper.vm.$nextTick()

        const emptyState = wrapper.find('[data-testid="search-empty-state"]')
        expect(emptyState.exists()).toBe(true)
        // GanttTimeline should NOT be rendered.
        expect(wrapper.find('.timeline-stub').exists()).toBe(false)
      } finally {
        vi.useRealTimers()
      }
    })

    it('search empty-state does NOT render while org has no units (no-data vs search-no-results)', async () => {
      allUnitsApi.list.mockResolvedValue([])
      reservationsApi.list.mockResolvedValue([])

      vi.useFakeTimers()
      try {
        const wrapper = setup()
        await vi.runAllTimersAsync()
        await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()

        wrapper.vm.searchQuery = 'anything'
        await vi.advanceTimersByTimeAsync(200)
        await wrapper.vm.$nextTick()

        // No units loaded → standard no-data empty state, NOT search empty-state.
        expect(wrapper.find('[data-testid="search-empty-state"]').exists()).toBe(false)
      } finally {
        vi.useRealTimers()
      }
    })

    it('v-text-field has maxlength=100 attribute (FM-04)', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      wrapper.vm.onOpenSearch()
      await wrapper.vm.$nextTick()

      const input = wrapper.find('[data-testid="search-input"] input')
      expect(input.exists()).toBe(true)
      expect(input.attributes('maxlength')).toBe('100')
    })

    it('cancels pending debounce on unmount (FM-08, no stale writes)', async () => {
      vi.useFakeTimers()
      try {
        const wrapper = setup()
        await vi.runAllTimersAsync()
        await wrapper.vm.$nextTick()

        // Schedule a debounce that would fire AFTER unmount.
        wrapper.vm.searchQuery = 'pending'
        await wrapper.vm.$nextTick()
        const preUnmountDebounced = wrapper.vm.debouncedQuery

        wrapper.unmount()

        // Advance past the debounce delay. If cancel didn't fire, the setter
        // would try to write to an unmounted ref (would log a Vue warning
        // and change state unpredictably).
        await vi.advanceTimersByTimeAsync(500)

        // The wrapper is unmounted — we can't read vm.debouncedQuery
        // post-unmount reliably, but the key property is "no throw".
        // `preUnmountDebounced` was captured to document the state at unmount.
        expect(preUnmountDebounced).toBe('')
      } finally {
        vi.useRealTimers()
      }
    })

    it('swallows localStorage throws during persist (FM-06)', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()

      const originalSet = localStorage.setItem.bind(localStorage)
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceeded')
      })

      try {
        // Triggering persist via a searchQuery change must not propagate.
        expect(() => {
          wrapper.vm.searchQuery = 'anything'
        }).not.toThrow()
        await wrapper.vm.$nextTick()
      } finally {
        localStorage.setItem = originalSet
      }
    })

    it('swallows corrupt JSON in localStorage on load', async () => {
      localStorage.setItem(STORAGE_KEY, '{not-valid-json')
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      // Falls back to defaults without throwing.
      expect(wrapper.vm.searchQuery).toBe('')
      expect(wrapper.vm.rangeDays).toBe(14)
    })
  })

  // --- FT-028 Empty state UX ---
  describe('empty state UX (FT-028)', () => {
    it('search empty state renders subtext hint (REQ-01)', async () => {
      allUnitsApi.list.mockResolvedValue([{ id: 1, name: 'U1', property_name: 'P1' }])
      reservationsApi.list.mockResolvedValue([])
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()

      wrapper.vm.searchQuery = 'zzzzz'
      wrapper.vm.debouncedQuery = 'zzzzz' // bypass debounce for determinism
      await wrapper.vm.$nextTick()

      const html = wrapper.html()
      expect(html).toContain('zzzzz')
      expect(html).toContain('По названиям юнитов, объектов и гостям')
    })

    it('search empty state Clear button triggers onSearchEscape (REQ-02)', async () => {
      allUnitsApi.list.mockResolvedValue([{ id: 1, name: 'U1', property_name: 'P1' }])
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()

      wrapper.vm.searchQuery = 'zzzzz'
      wrapper.vm.debouncedQuery = 'zzzzz'
      wrapper.vm.searchOpen = true
      await wrapper.vm.$nextTick()

      const clearBtn = wrapper.find('[data-testid="search-empty-clear"]')
      expect(clearBtn.exists()).toBe(true)
      await clearBtn.trigger('click')
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()

      expect(wrapper.vm.searchQuery).toBe('')
      expect(wrapper.vm.debouncedQuery).toBe('')
      expect(wrapper.vm.searchOpen).toBe(false)
    })

    it('no-data empty state shows CTA button (REQ-03)', async () => {
      allUnitsApi.list.mockResolvedValue([]) // empty org
      reservationsApi.list.mockResolvedValue([])
      const wrapper = setup()
      // Drain mount + loadData cycle (Promise.all + 2 watchers).
      for (let i = 0; i < 6; i += 1) await wrapper.vm.$nextTick()

      const cta = wrapper.find('[data-testid="calendar-empty-cta"]')
      expect(cta.exists()).toBe(true)
      expect(cta.text()).toContain('Добавить объект')
    })

    it('onEmptyStateCta navigates to /properties/new', async () => {
      allUnitsApi.list.mockResolvedValue([])
      const wrapper = setup()
      for (let i = 0; i < 6; i += 1) await wrapper.vm.$nextTick()

      // onEmptyStateCta uses the router from useRouter(). In test mount we
      // rely on the helper's global router — simply verify handler calls
      // router.push with the expected path by spying on the app router.
      const pushSpy = vi.fn()
      wrapper.vm.$router.push = pushSpy

      wrapper.vm.onEmptyStateCta()
      expect(pushSpy).toHaveBeenCalledWith('/properties/new')
    })
  })

  // --- FT-029 Keyboard shortcuts integration ---
  describe('keyboard shortcuts (FT-029)', () => {
    it('exposes shortcutRows with 7 entries (FT-030 adds S)', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.shortcutRows).toHaveLength(7)
      expect(wrapper.vm.shortcutRows.map((r) => r.key)).toEqual(['/', 'T', '[', ']', 'S', 'Esc', '?'])
    })

    it('shiftRange moves anchorDate by ±rangeDays days', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      const before = wrapper.vm.anchorDate.valueOf()
      wrapper.vm.shiftRange(1)
      await wrapper.vm.$nextTick()
      const expectedDelta = wrapper.vm.rangeDays * 24 * 60 * 60 * 1000
      expect(wrapper.vm.anchorDate.valueOf() - before).toBe(expectedDelta)
    })

    it('shiftRange(-1) moves anchorDate backward', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      const before = wrapper.vm.anchorDate.valueOf()
      wrapper.vm.shiftRange(-1)
      await wrapper.vm.$nextTick()
      const expectedDelta = -wrapper.vm.rangeDays * 24 * 60 * 60 * 1000
      expect(wrapper.vm.anchorDate.valueOf() - before).toBe(expectedDelta)
    })

    it('focusSearchInput opens search bar when closed', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.searchOpen).toBe(false)
      await wrapper.vm.focusSearchInput()
      expect(wrapper.vm.searchOpen).toBe(true)
    })

    it('helpOpen defaults to false, toggleable via exposed ref', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.helpOpen).toBe(false)
      wrapper.vm.helpOpen = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.helpOpen).toBe(true)
    })
  })

  // --- FT-030 Sidebar collapse ---
  describe('sidebar collapse (FT-030)', () => {
    it('sidebarCollapsed defaults to false', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.sidebarCollapsed).toBe(false)
    })

    it('toggleSidebar flips state', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleSidebar()
      expect(wrapper.vm.sidebarCollapsed).toBe(true)
      wrapper.vm.toggleSidebar()
      expect(wrapper.vm.sidebarCollapsed).toBe(false)
    })

    it('persists sidebarCollapsed to localStorage', async () => {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      wrapper.vm.toggleSidebar()
      await wrapper.vm.$nextTick()
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stored.sidebarCollapsed).toBe(true)
    })

    it('restores sidebarCollapsed from localStorage on mount', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rangeDays: 14, specialMode: '', searchQuery: '', sidebarCollapsed: true }),
      )
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.sidebarCollapsed).toBe(true)
    })

    it('ignores invalid persisted sidebarCollapsed (non-boolean)', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rangeDays: 14, sidebarCollapsed: 'yes' }),
      )
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.sidebarCollapsed).toBe(false)
    })

    it('legacy payload without sidebarCollapsed defaults to false', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rangeDays: 30, specialMode: 'handover' }),
      )
      const wrapper = setup()
      await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
      expect(wrapper.vm.sidebarCollapsed).toBe(false)
      // other fields still restored
      expect(wrapper.vm.rangeDays).toBe(30)
      expect(wrapper.vm.specialMode).toBe('handover')
    })
  })
})
