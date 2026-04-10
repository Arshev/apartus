class Owner < ApplicationRecord
  belongs_to :organization
  has_many :properties

  validates :name, presence: true, length: { maximum: 255 }
  validates :commission_rate, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 10000, only_integer: true }
end
