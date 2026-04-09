class Branch < ApplicationRecord
  belongs_to :organization
  belongs_to :parent_branch, class_name: "Branch", optional: true
  has_many :children,
           class_name: "Branch",
           foreign_key: :parent_branch_id
  has_many :properties

  normalizes :name, with: ->(v) { v.to_s.strip }

  validates :name,
            presence: true,
            length: { maximum: 100 },
            uniqueness: { case_sensitive: false,
                          scope: [ :organization_id, :parent_branch_id ] }

  validate :parent_branch_must_exist_in_org
  validate :parent_is_not_self
  validate :parent_is_not_descendant, on: :update

  before_destroy :prevent_destroy_if_has_dependents

  private

  def parent_branch_must_exist_in_org
    return if parent_branch_id.blank?
    return if parent_branch.present?

    errors.add(:parent_branch, "must exist")
  end

  def parent_is_not_self
    return if parent_branch_id.blank?
    return if id.blank? || parent_branch_id != id

    errors.add(:parent_branch, "cannot be self")
  end

  def parent_is_not_descendant
    return if parent_branch_id.blank?
    return unless parent_branch

    current = parent_branch
    while current
      if current.id == id
        errors.add(:parent_branch, "cannot be a descendant")
        return
      end
      current = current.parent_branch
    end
  end

  def prevent_destroy_if_has_dependents
    return unless children.exists? || properties.exists?

    errors.add(:base, "Branch has dependents and cannot be deleted")
    throw(:abort)
  end
end
