import { describe, it, expect } from 'vitest'
import { filterUnitsAndReservations } from '../../utils/search.js'

// Fixtures shared across scenarios.
const units = [
  { id: 1, name: 'Studio 101', property_name: 'Пальмы' },
  { id: 2, name: 'Apt 204A', property_name: 'Пальмы' },
  { id: 3, name: 'Suite 300', property_name: 'Дубки' },
  { id: 4, name: 'Room 404', property_name: 'Сосны' },
]

const reservations = [
  { id: 10, unit_id: 1, guest_name: 'Иван Петров' },
  { id: 11, unit_id: 1, guest_name: 'Мария Сидорова' },
  { id: 12, unit_id: 2, guest_name: 'Ivan Ivanov' },
  { id: 13, unit_id: 3, guest_name: 'Петр Волков' },
  { id: 14, unit_id: 4, guest_name: null }, // blocking reservation
]

describe('utils/search.filterUnitsAndReservations', () => {
  describe('defensive null/undefined inputs', () => {
    it('returns empty arrays when units is null', () => {
      const result = filterUnitsAndReservations(null, reservations, 'Arbat')
      expect(result.units).toEqual([])
      expect(result.reservations).toEqual([])
    })

    it('returns empty arrays when reservations is null (non-empty query)', () => {
      const result = filterUnitsAndReservations(units, null, 'Volkov')
      // Query matches no unit.name/property → no guest fallback → 0 results.
      expect(result.units).toEqual([])
      expect(result.reservations).toEqual([])
    })

    it('returns empty arrays when both inputs are undefined', () => {
      const result = filterUnitsAndReservations(undefined, undefined, '')
      expect(result.units).toEqual([])
      expect(result.reservations).toEqual([])
    })
  })

  describe('empty/identity query', () => {
    it('returns inputs unchanged for empty string', () => {
      const result = filterUnitsAndReservations(units, reservations, '')
      expect(result.units).toBe(units)
      expect(result.reservations).toBe(reservations)
    })

    it('returns inputs unchanged for whitespace-only query', () => {
      const result = filterUnitsAndReservations(units, reservations, '   ')
      expect(result.units).toBe(units)
      expect(result.reservations).toBe(reservations)
    })

    it('returns inputs unchanged for non-string query (null/undefined)', () => {
      expect(filterUnitsAndReservations(units, reservations, null).units).toBe(units)
      expect(filterUnitsAndReservations(units, reservations, undefined).units).toBe(units)
    })
  })

  describe('unit name match', () => {
    it('matches exact substring in unit.name', () => {
      const { units: u } = filterUnitsAndReservations(units, reservations, '204')
      expect(u).toHaveLength(1)
      expect(u[0].id).toBe(2)
    })

    it('case-insensitive matching on unit.name', () => {
      const { units: u } = filterUnitsAndReservations(units, reservations, 'STUDIO')
      expect(u.map((x) => x.id)).toEqual([1])
    })
  })

  describe('property name match', () => {
    it('matches substring in property_name (includes all units of that property)', () => {
      const { units: u } = filterUnitsAndReservations(units, reservations, 'Пальмы')
      expect(u.map((x) => x.id)).toEqual([1, 2])
    })

    it('case-insensitive on property_name', () => {
      const { units: u } = filterUnitsAndReservations(units, reservations, 'пальмы')
      expect(u.map((x) => x.id)).toEqual([1, 2])
    })
  })

  describe('guest name match (propagates to unit)', () => {
    it('includes unit when a reservation on it matches guest_name', () => {
      const { units: u } = filterUnitsAndReservations(units, reservations, 'Волков')
      expect(u.map((x) => x.id)).toEqual([3])
    })

    it('includes ALL reservations for matched unit (not only the matching one)', () => {
      const { units: u, reservations: r } = filterUnitsAndReservations(
        units,
        reservations,
        'Иван Петров',
      )
      // Unit 1 is matched via guest "Иван Петров".
      expect(u.map((x) => x.id)).toEqual([1])
      // Both reservations on unit 1 are kept (Иван Петров AND Мария Сидорова).
      expect(r.map((x) => x.id).sort()).toEqual([10, 11])
    })

    it('is null-safe for guest_name=null (blocking)', () => {
      // "404" matches unit.name "Room 404" — the null guest_name must not throw.
      const { units: u } = filterUnitsAndReservations(units, reservations, '404')
      expect(u.map((x) => x.id)).toEqual([4])
    })

    it('case-insensitive on guest_name (Cyrillic)', () => {
      const { units: u } = filterUnitsAndReservations(units, reservations, 'ИВАН')
      // Only Cyrillic "Иван Петров" matches — Latin "Ivan Ivanov" is a different script.
      expect(u.map((x) => x.id)).toEqual([1])
    })

    it('case-insensitive on guest_name (Latin)', () => {
      const { units: u } = filterUnitsAndReservations(units, reservations, 'IVAN')
      // Only Latin "Ivan Ivanov" matches — Cyrillic "Иван Петров" is a different script.
      expect(u.map((x) => x.id)).toEqual([2])
    })
  })

  describe('no match', () => {
    it('returns empty arrays when nothing matches', () => {
      const result = filterUnitsAndReservations(units, reservations, 'xyznotexist')
      expect(result.units).toEqual([])
      expect(result.reservations).toEqual([])
    })
  })

  describe('ordering preservation', () => {
    it('preserves input unit order', () => {
      // Swap unit order in input — output must mirror it.
      const reordered = [units[2], units[0], units[3], units[1]]
      const { units: u } = filterUnitsAndReservations(reordered, reservations, 'Пальмы')
      // Unit 1 (Studio 101) is at index 1 in `reordered`, unit 2 at index 3.
      // Output must contain unit 1 then unit 2 in that order.
      expect(u.map((x) => x.id)).toEqual([1, 2])
    })

    it('preserves input reservation order for matched unit', () => {
      // Swap reservation order on the same unit.
      const reordered = [reservations[1], reservations[0], reservations[2], reservations[3], reservations[4]]
      const { reservations: r } = filterUnitsAndReservations(units, reordered, 'Мария')
      // On unit 1: Мария Сидорова (id 11) comes first in `reordered`, then Иван Петров (id 10).
      expect(r.map((x) => x.id)).toEqual([11, 10])
    })
  })

  describe('independent field match (NEG-04)', () => {
    it('does NOT concatenate fields — query spanning multiple fields does not match', () => {
      // "Studio 204" would NOT span unit.name "Studio 101" + "Apt 204A".
      const { units: u } = filterUnitsAndReservations(units, reservations, 'Studio 204')
      expect(u).toEqual([])
    })

    it('matches whole query against single field even with internal space', () => {
      // "Иван Петров" matches guest_name "Иван Петров" as a single string.
      const { units: u } = filterUnitsAndReservations(units, reservations, 'Иван Петров')
      expect(u.map((x) => x.id)).toEqual([1])
    })
  })

  describe('internal spaces (FM-09)', () => {
    it('preserves internal spaces and only trims leading/trailing', () => {
      const { units: u } = filterUnitsAndReservations(
        units,
        reservations,
        '  Иван Петров  ',
      )
      // Internal space kept → matches "Иван Петров".
      expect(u.map((x) => x.id)).toEqual([1])
    })
  })

  describe('regex special chars (NEG-02)', () => {
    it('treats regex metacharacters as literals', () => {
      const withDot = { ...units[0], name: 'A.B.C' }
      const result = filterUnitsAndReservations([withDot, units[1]], [], '.B.')
      // If treated as regex, ".B." matches "xBy" style. As literal substring,
      // it matches "A.B.C" only.
      expect(result.units.map((x) => x.id)).toEqual([withDot.id])
    })
  })
})
