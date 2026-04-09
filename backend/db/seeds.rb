# Idempotent demo seed for HW-1 features.
#
# Creates one demo user (demo@apartus.local / Password1!) with a single
# organization ("Demo Hostel Network") containing a full HW-1 data tree:
#   - 2 root branches (HQ, Moscow) + 1 child branch (Tverskaya under Moscow)
#   - 3 amenities (Wi-Fi, Parking, Breakfast)
#   - 2 properties (one linked to HQ, one to Tverskaya)
#   - 4 units spread across the properties
#   - 4 unit ↔ amenity attachments
#
# Re-running this file is safe: it uses find_or_create_by! for every record.
#
# Run: `bin/rails db:seed`

ActiveRecord::Base.transaction do
  puts "Seeding HW-1 demo data..."

  user = User.find_or_initialize_by(email: "demo@apartus.local")
  if user.new_record?
    user.assign_attributes(
      password: "Password1!",
      password_confirmation: "Password1!",
      first_name: "Demo",
      last_name: "User"
    )
    user.save!
    puts "  ✓ Created user demo@apartus.local (Password1!)"
  else
    puts "  • User demo@apartus.local already exists, reusing"
  end

  organization = Organization.find_or_create_by!(name: "Demo Hostel Network")
  puts "  ✓ Organization: #{organization.name} (id=#{organization.id})"

  unless Membership.exists?(user: user, organization: organization)
    Membership.create!(user: user, organization: organization, role_enum: :owner)
    puts "  ✓ Owner membership for #{user.email}"
  end

  # ---- F4: Branches ----
  hq = organization.branches.find_or_create_by!(name: "HQ", parent_branch: nil)
  moscow = organization.branches.find_or_create_by!(name: "Moscow", parent_branch: nil)
  tverskaya = organization.branches.find_or_create_by!(
    name: "Tverskaya", parent_branch: moscow
  )
  puts "  ✓ Branches: HQ, Moscow → Tverskaya"

  # ---- F3: Amenities ----
  wifi = organization.amenities.find_or_create_by!(name: "Wi-Fi")
  parking = organization.amenities.find_or_create_by!(name: "Parking")
  breakfast = organization.amenities.find_or_create_by!(name: "Breakfast")
  puts "  ✓ Amenities: Wi-Fi, Parking, Breakfast"

  # ---- F1: Properties + F5: branch link ----
  apartment = organization.properties.find_or_create_by!(name: "Sea View Apartment") do |p|
    p.address = "1 Beach Rd, Bali"
    p.property_type = :apartment
    p.description = "Cozy seaside apartment"
    p.branch = hq
  end
  hostel = organization.properties.find_or_create_by!(name: "Tverskaya Hostel") do |p|
    p.address = "10 Tverskaya St, Moscow"
    p.property_type = :hostel
    p.description = "Budget-friendly hostel in central Moscow"
    p.branch = tverskaya
  end
  puts "  ✓ Properties: Sea View Apartment (→HQ), Tverskaya Hostel (→Tverskaya)"

  # ---- F2: Units ----
  apt_studio = apartment.units.find_or_create_by!(name: "Main Studio") do |u|
    u.unit_type = :studio
    u.capacity = 2
    u.status = :available
  end
  apartment.units.find_or_create_by!(name: "Sofa bed") do |u|
    u.unit_type = :bed
    u.capacity = 1
    u.status = :available
  end
  hostel_room_a = hostel.units.find_or_create_by!(name: "Dorm 6A") do |u|
    u.unit_type = :room
    u.capacity = 6
    u.status = :available
  end
  hostel.units.find_or_create_by!(name: "Dorm 8B") do |u|
    u.unit_type = :room
    u.capacity = 8
    u.status = :maintenance
  end
  puts "  ✓ Units: Main Studio, Sofa bed, Dorm 6A, Dorm 8B"

  # ---- F3: UnitAmenity attachments ----
  [
    [ apt_studio, wifi ],
    [ apt_studio, parking ],
    [ hostel_room_a, wifi ],
    [ hostel_room_a, breakfast ]
  ].each do |unit, amenity|
    UnitAmenity.find_or_create_by!(unit: unit, amenity: amenity)
  end
  puts "  ✓ UnitAmenity attachments (4 links)"

  puts
  puts "Done. Sign in with:"
  puts "  email:    demo@apartus.local"
  puts "  password: Password1!"
  puts "  X-Organization-Id: #{organization.id}"
end
