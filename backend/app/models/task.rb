class Task < ApplicationRecord
  belongs_to :organization
  belongs_to :property, optional: true
  belongs_to :unit, optional: true
  belongs_to :assigned_to, class_name: "User", optional: true

  enum :status, { pending: 0, in_progress: 1, completed: 2 }, validate: true
  enum :priority, { low: 0, medium: 1, high: 2, urgent: 3 }, validate: true
  enum :category, { cleaning: 0, maintenance: 1, inspection: 2, other: 3 }, validate: true

  validates :title, presence: true, length: { maximum: 255 }
end
