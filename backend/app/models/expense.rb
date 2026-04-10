class Expense < ApplicationRecord
  belongs_to :organization
  belongs_to :property, optional: true

  enum :category, { maintenance: 0, utilities: 1, cleaning: 2, supplies: 3, other: 4 }, validate: true

  validates :amount_cents, presence: true, numericality: { greater_than: 0, only_integer: true }
  validates :expense_date, presence: true
end
