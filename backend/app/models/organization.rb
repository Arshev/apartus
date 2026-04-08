class Organization < ApplicationRecord
  has_many :memberships, dependent: :destroy
  has_many :users, through: :memberships
  has_many :roles, dependent: :destroy
  has_many :properties, dependent: :destroy
  has_many :units, through: :properties
  has_many :amenities, dependent: :destroy

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true

  normalizes :name, with: ->(name) { name.strip }

  before_validation :generate_slug, on: :create
  after_create :create_preset_roles

  private

  def generate_slug
    return if slug.present?

    base_slug = name.parameterize
    self.slug = base_slug

    counter = 1
    while Organization.exists?(slug: self.slug)
      self.slug = "#{base_slug}-#{counter}"
      counter += 1
    end
  end

  def create_preset_roles
    Permissions::PRESET_ROLES.each do |code, config|
      roles.create!(
        name: config[:name],
        code: code.to_s,
        permissions: config[:permissions],
        is_system: true
      )
    end
  end
end
