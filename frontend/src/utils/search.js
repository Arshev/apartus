// Client-side search filter for the Gantt view (FT-025).
//
// Pure function. Accepts full units + reservations arrays and a query string,
// returns a filtered subset preserving input order. Empty/whitespace query
// returns the inputs as-is (identity — no new allocations for the "no filter"
// path).
//
// Matching semantics (see feature FT-025 REQ-03, CTR-02):
//   - A unit is kept iff it matches any of:
//       (a) unit.name contains query (case-insensitive)
//       (b) unit.property_name contains query (case-insensitive)
//       (c) at least one reservation on that unit has guest_name containing
//           query (case-insensitive, null-safe)
//   - Each field is matched INDEPENDENTLY against the full query — fields are
//     never concatenated. So "Ivan Petrov" matches guest_name "Ivan Petrov"
//     but does not match unit.name "Studio 204" even if Ivan stayed there.
//   - All reservations on a kept unit are returned (not just matching ones) —
//     users see full occupancy context for matched units.
//
// Trim applies only to leading/trailing whitespace (FM-09) — internal spaces
// in the query are part of the substring match.
export function filterUnitsAndReservations(units, reservations, query) {
  // Defensive: null/undefined inputs (e.g. API returns null, not-yet-loaded
  // state) would throw cryptic TypeError deep in the filter pipeline. Return
  // empty arrays so the template falls back to the empty-state branch cleanly.
  const safeUnits = Array.isArray(units) ? units : []
  const safeReservations = Array.isArray(reservations) ? reservations : []
  const needle = typeof query === 'string' ? query.trim().toLowerCase() : ''

  if (needle === '') {
    return { units: safeUnits, reservations: safeReservations }
  }

  const matchingUnitIds = new Set()

  for (const unit of safeUnits) {
    const name = (unit.name || '').toLowerCase()
    const propertyName = (unit.property_name || '').toLowerCase()
    if (name.includes(needle) || propertyName.includes(needle)) {
      matchingUnitIds.add(unit.id)
    }
  }

  for (const reservation of safeReservations) {
    if (matchingUnitIds.has(reservation.unit_id)) continue
    const guestName = (reservation.guest_name || '').toLowerCase()
    if (guestName.includes(needle)) {
      matchingUnitIds.add(reservation.unit_id)
    }
  }

  const filteredUnits = safeUnits.filter((u) => matchingUnitIds.has(u.id))
  const filteredReservations = safeReservations.filter((r) => matchingUnitIds.has(r.unit_id))

  return { units: filteredUnits, reservations: filteredReservations }
}
