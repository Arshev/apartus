// Shared date-urgency bucketing + humanized labels for list/table views.
//
// Output pattern: "Сегодня" / "Завтра" / "18 апр" across the app.
// Consumers use `urgency` to drive styling tiers (today = primary accent,
// tomorrow = strong, later = muted).

import { useI18n } from 'vue-i18n'
import { parseIsoDate, startOfDay, formatShortDate } from '../utils/date'

export function useRelativeDate() {
  const { t, locale } = useI18n()

  /**
   * Bucket an ISO date (YYYY-MM-DD) into an urgency tier.
   * @returns {'today' | 'tomorrow' | 'later' | 'past'}
   */
  function urgency(iso) {
    if (!iso) return 'later'
    const d = parseIsoDate(iso)
    const today = startOfDay(new Date())
    const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000)
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'tomorrow'
    if (diffDays < 0) return 'past'
    return 'later'
  }

  /**
   * Human-readable short label for an ISO date.
   * today/tomorrow become localized words; everything else uses the
   * locale-aware `18 апр` / `18 Apr` formatter.
   */
  function relativeDate(iso) {
    if (!iso) return ''
    const u = urgency(iso)
    if (u === 'today') return t('common.today')
    if (u === 'tomorrow') return t('common.tomorrow')
    return formatShortDate(parseIsoDate(iso), locale.value)
  }

  return { urgency, relativeDate }
}
