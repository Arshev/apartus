class ExchangeRate < ApplicationRecord
  SOURCES = %w[api manual].freeze

  belongs_to :organization, optional: true

  validates :base_currency, :quote_currency, presence: true, inclusion: { in: CurrencyConfig.codes }
  validates :rate_x1e10, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :effective_date, presence: true
  validates :source, presence: true, inclusion: { in: SOURCES }
  validate :base_differs_from_quote
  validate :source_and_organization_consistency
  validate :effective_date_not_too_future

  scope :global, -> { where(organization_id: nil) }
  scope :for_organization, ->(org) { where(organization: org) }
  scope :effective_on, ->(date) { where(effective_date: ..date).order(effective_date: :desc) }
  scope :by_pair, ->(base, quote) { where(base_currency: base, quote_currency: quote) }
  scope :manual, -> { where(source: "manual") }
  scope :api, -> { where(source: "api") }

  def api?
    source == "api"
  end

  def manual?
    source == "manual"
  end

  private

  def base_differs_from_quote
    return if base_currency.blank? || quote_currency.blank?
    errors.add(:quote_currency, :must_differ_from_base) if base_currency == quote_currency
  end

  def source_and_organization_consistency
    if api? && organization_id.present?
      errors.add(:organization_id, :must_be_blank_for_api_source)
    elsif manual? && organization_id.blank?
      errors.add(:organization_id, :required_for_manual_source)
    end
  end

  def effective_date_not_too_future
    return if effective_date.blank?
    if effective_date > Date.current + 30
      errors.add(:effective_date, :too_far_in_future)
    elsif effective_date > Date.current + 7
      Rails.logger.warn("[ExchangeRate] effective_date #{effective_date} is >7 days in the future (FM-09 warning)")
    end
  end
end
