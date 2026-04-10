# Comprehensive demo seed covering ALL features (FT-001..FT-014).
#
# Creates one demo user (demo@apartus.local / Password1!) with a single
# organization containing a full data tree for every feature.
#
# Re-running is safe: uses find_or_create_by! and guard clauses.
#
# Run: `bin/rails db:seed`

ActiveRecord::Base.transaction do
  puts "Seeding comprehensive demo data..."

  # ─── User & Organization ───────────────────────────────────────
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
  puts "  ✓ Organization: #{organization.name} (id=#{organization.id}, slug=#{organization.slug})"

  unless Membership.exists?(user: user, organization: organization)
    Membership.create!(user: user, organization: organization, role_enum: :owner)
  end

  # Second user (manager) for team demo
  manager = User.find_or_initialize_by(email: "manager@apartus.local")
  if manager.new_record?
    manager.assign_attributes(password: "Password1!", password_confirmation: "Password1!",
                              first_name: "Anna", last_name: "Manager")
    manager.save!
  end
  unless Membership.exists?(user: manager, organization: organization)
    Membership.create!(user: manager, organization: organization, role_enum: :manager)
  end
  puts "  ✓ Users: demo (owner) + manager (manager)"

  # ─── Branches ──────────────────────────────────────────────────
  hq = organization.branches.find_or_create_by!(name: "HQ", parent_branch: nil)
  moscow = organization.branches.find_or_create_by!(name: "Moscow", parent_branch: nil)
  tverskaya = organization.branches.find_or_create_by!(name: "Tverskaya", parent_branch: moscow)
  arbat = organization.branches.find_or_create_by!(name: "Arbat", parent_branch: moscow)
  puts "  ✓ Branches: HQ, Moscow → Tverskaya, Arbat"

  # ─── Amenities ─────────────────────────────────────────────────
  wifi = organization.amenities.find_or_create_by!(name: "Wi-Fi")
  parking = organization.amenities.find_or_create_by!(name: "Parking")
  breakfast = organization.amenities.find_or_create_by!(name: "Breakfast")
  pool = organization.amenities.find_or_create_by!(name: "Pool")
  ac = organization.amenities.find_or_create_by!(name: "Air Conditioning")
  puts "  ✓ Amenities: Wi-Fi, Parking, Breakfast, Pool, AC"

  # ─── Owners ────────────────────────────────────────────────────
  owner_ivanov = organization.owners.find_or_create_by!(name: "Сергей Иванов") do |o|
    o.email = "ivanov@example.com"
    o.phone = "+79111234567"
    o.commission_rate = 1500 # 15%
    o.notes = "Владелец апартаментов на Бали"
  end
  owner_petrova = organization.owners.find_or_create_by!(name: "Елена Петрова") do |o|
    o.email = "petrova@example.com"
    o.phone = "+79222345678"
    o.commission_rate = 2000 # 20%
  end
  puts "  ✓ Owners: Иванов (15%), Петрова (20%)"

  # ─── Properties ────────────────────────────────────────────────
  apartment = organization.properties.find_or_create_by!(name: "Sea View Apartment") do |p|
    p.address = "1 Beach Rd, Bali"
    p.property_type = :apartment
    p.description = "Cozy seaside apartment with stunning ocean views"
    p.branch = hq
    p.owner = owner_ivanov
  end
  hostel = organization.properties.find_or_create_by!(name: "Tverskaya Hostel") do |p|
    p.address = "10 Tverskaya St, Moscow"
    p.property_type = :hostel
    p.description = "Budget-friendly hostel in central Moscow"
    p.branch = tverskaya
    p.owner = owner_petrova
  end
  hotel = organization.properties.find_or_create_by!(name: "Arbat Boutique Hotel") do |p|
    p.address = "25 Arbat St, Moscow"
    p.property_type = :hotel
    p.description = "Boutique hotel on famous Arbat street"
    p.branch = arbat
    p.owner = owner_petrova
  end
  puts "  ✓ Properties: Sea View Apartment (→HQ, Иванов), Tverskaya Hostel (→Tverskaya, Петрова), Arbat Hotel (→Arbat, Петрова)"

  # ─── Units + Pricing ───────────────────────────────────────────
  apt_studio = apartment.units.find_or_create_by!(name: "Main Studio") do |u|
    u.unit_type = :studio; u.capacity = 2; u.status = :available; u.base_price_cents = 5000
  end
  apt_sofa = apartment.units.find_or_create_by!(name: "Sofa bed") do |u|
    u.unit_type = :bed; u.capacity = 1; u.status = :available; u.base_price_cents = 2500
  end
  hostel_dorm_a = hostel.units.find_or_create_by!(name: "Dorm 6A") do |u|
    u.unit_type = :room; u.capacity = 6; u.status = :available; u.base_price_cents = 1500
  end
  hostel_dorm_b = hostel.units.find_or_create_by!(name: "Dorm 8B") do |u|
    u.unit_type = :room; u.capacity = 8; u.status = :maintenance; u.base_price_cents = 1200
  end
  hotel_standard = hotel.units.find_or_create_by!(name: "Standard Room 101") do |u|
    u.unit_type = :room; u.capacity = 2; u.status = :available; u.base_price_cents = 8000
  end
  hotel_deluxe = hotel.units.find_or_create_by!(name: "Deluxe Suite 201") do |u|
    u.unit_type = :apartment; u.capacity = 4; u.status = :available; u.base_price_cents = 15000
  end
  puts "  ✓ Units: 6 units across 3 properties (with base prices)"

  # ─── Seasonal Prices ───────────────────────────────────────────
  unless SeasonalPrice.where(unit: apt_studio).exists?
    SeasonalPrice.create!(unit: apt_studio, start_date: "2026-06-01", end_date: "2026-08-31", price_cents: 8000)
    SeasonalPrice.create!(unit: apt_studio, start_date: "2026-12-20", end_date: "2027-01-10", price_cents: 10000)
    SeasonalPrice.create!(unit: hotel_deluxe, start_date: "2026-06-01", end_date: "2026-08-31", price_cents: 25000)
  end
  puts "  ✓ Seasonal prices: summer + NY surcharges"

  # ─── Pricing Rules ─────────────────────────────────────────────
  unless PricingRule.joins(unit: :property).where(properties: { organization_id: organization.id }).exists?
    PricingRule.create!(unit: apt_studio, rule_type: :length_discount, min_nights: 7, discount_percent: 10, active: true)
    PricingRule.create!(unit: hotel_standard, rule_type: :last_minute, days_before: 3, discount_percent: 15, active: true)
    PricingRule.create!(unit: hotel_deluxe, rule_type: :occupancy_markup, occupancy_threshold: 80, markup_percent: 20, active: true)
  end
  puts "  ✓ Pricing rules: length discount, last-minute, occupancy markup"

  # ─── Unit ↔ Amenity attachments ────────────────────────────────
  [
    [apt_studio, wifi], [apt_studio, parking], [apt_studio, ac],
    [apt_sofa, wifi],
    [hostel_dorm_a, wifi], [hostel_dorm_a, breakfast],
    [hotel_standard, wifi], [hotel_standard, ac], [hotel_standard, breakfast],
    [hotel_deluxe, wifi], [hotel_deluxe, ac], [hotel_deluxe, pool], [hotel_deluxe, breakfast], [hotel_deluxe, parking],
  ].each do |unit, amenity|
    UnitAmenity.find_or_create_by!(unit: unit, amenity: amenity)
  end
  puts "  ✓ Unit amenities: 14 attachments"

  # ─── Guests (CRM) ─────────────────────────────────────────────
  ivan = organization.guests.find_or_create_by!(email: "ivan@example.com") do |g|
    g.first_name = "Иван"; g.last_name = "Петров"; g.phone = "+79001112233"
    g.notes = "Постоянный гость, предпочитает верхние этажи"; g.source = "direct"; g.tags = ["vip", "repeat"]
  end
  maria = organization.guests.find_or_create_by!(email: "maria@example.com") do |g|
    g.first_name = "Мария"; g.last_name = "Сидорова"; g.phone = "+79004445566"
    g.source = "booking.com"; g.tags = ["business"]
  end
  alexey = organization.guests.find_or_create_by!(first_name: "Алексей", last_name: "Козлов") do |g|
    g.phone = "+79007778899"; g.source = "airbnb"; g.tags = ["family"]
  end
  olga = organization.guests.find_or_create_by!(email: "olga@example.com") do |g|
    g.first_name = "Ольга"; g.last_name = "Новикова"; g.phone = "+79003334455"
    g.source = "widget"; g.tags = ["new"]
  end
  dmitry = organization.guests.find_or_create_by!(email: "dmitry@example.com") do |g|
    g.first_name = "Дмитрий"; g.last_name = "Волков"; g.phone = "+79006667788"
    g.source = "direct"; g.tags = ["corporate", "repeat"]
  end
  puts "  ✓ Guests: 5 (Иван, Мария, Алексей, Ольга, Дмитрий) with tags + sources"

  # ─── Reservations ──────────────────────────────────────────────
  unless Reservation.joins(unit: :property).where(properties: { organization_id: organization.id }).exists?
    today = Date.current

    # Past reservations (checked_out)
    Reservation.create!(unit: apt_studio, guest: ivan, check_in: today - 20, check_out: today - 15,
                        status: :checked_out, guests_count: 2, total_price_cents: 25_000)
    Reservation.create!(unit: hotel_standard, guest: maria, check_in: today - 10, check_out: today - 7,
                        status: :checked_out, guests_count: 1, total_price_cents: 24_000)

    # Current (checked_in)
    Reservation.create!(unit: hostel_dorm_a, guest: maria, check_in: today - 1, check_out: today + 3,
                        status: :checked_in, guests_count: 1, total_price_cents: 6_000)
    Reservation.create!(unit: hotel_deluxe, guest: dmitry, check_in: today, check_out: today + 5,
                        status: :checked_in, guests_count: 3, total_price_cents: 75_000)

    # Upcoming (confirmed)
    Reservation.create!(unit: apt_studio, guest: ivan, check_in: today + 2, check_out: today + 6,
                        status: :confirmed, guests_count: 2, total_price_cents: 20_000)
    Reservation.create!(unit: hotel_standard, guest: olga, check_in: today + 3, check_out: today + 5,
                        status: :confirmed, guests_count: 2, total_price_cents: 16_000)
    Reservation.create!(unit: apt_sofa, guest: alexey, check_in: today + 5, check_out: today + 8,
                        status: :confirmed, guests_count: 1, total_price_cents: 7_500)

    # Future
    Reservation.create!(unit: hotel_deluxe, guest: ivan, check_in: today + 14, check_out: today + 21,
                        status: :confirmed, guests_count: 4, total_price_cents: 105_000,
                        notes: "Семейный отдых, нужна детская кроватка")

    # Date block (no guest)
    Reservation.create!(unit: hostel_dorm_b, check_in: today + 5, check_out: today + 8,
                        status: :confirmed, guests_count: 1, total_price_cents: 0,
                        notes: "Блокировка: ремонт сантехники")

    # Cancelled
    Reservation.create!(unit: hotel_standard, guest: maria, check_in: today + 7, check_out: today + 10,
                        status: :cancelled, guests_count: 1, total_price_cents: 24_000,
                        notes: "Отменено гостем")
  end
  puts "  ✓ Reservations: 10 (2 past, 2 current, 4 upcoming, 1 block, 1 cancelled)"

  # ─── Expenses ──────────────────────────────────────────────────
  unless Expense.where(organization: organization).exists?
    today = Date.current
    [
      { property: apartment, category: :cleaning, amount_cents: 3_000, description: "Уборка после выезда", expense_date: today - 15 },
      { property: apartment, category: :maintenance, amount_cents: 15_000, description: "Замена кондиционера", expense_date: today - 10 },
      { property: hostel, category: :utilities, amount_cents: 8_500, description: "Коммунальные за месяц", expense_date: today - 5 },
      { property: hostel, category: :cleaning, amount_cents: 5_000, description: "Генеральная уборка", expense_date: today - 3 },
      { property: hotel, category: :supplies, amount_cents: 12_000, description: "Постельное бельё", expense_date: today - 7 },
      { property: hotel, category: :maintenance, amount_cents: 25_000, description: "Ремонт лифта", expense_date: today - 2 },
      { property: nil, category: :other, amount_cents: 50_000, description: "Реклама в Яндекс", expense_date: today - 1 },
    ].each do |attrs|
      organization.expenses.create!(attrs)
    end
  end
  puts "  ✓ Expenses: 7 (cleaning, maintenance, utilities, supplies, advertising)"

  # ─── Tasks ─────────────────────────────────────────────────────
  unless Task.where(organization: organization).exists?
    [
      { title: "Уборка Main Studio", category: :cleaning, priority: :high, status: :pending,
        property: apartment, unit: apt_studio, due_date: Date.current + 1, assigned_to: manager },
      { title: "Проверить кондиционер Deluxe 201", category: :maintenance, priority: :urgent, status: :in_progress,
        property: hotel, unit: hotel_deluxe, assigned_to: manager },
      { title: "Инспекция Dorm 6A", category: :inspection, priority: :medium, status: :pending,
        property: hostel, unit: hostel_dorm_a, due_date: Date.current + 3 },
      { title: "Закупить полотенца", category: :other, priority: :low, status: :completed,
        description: "Нужно 50 полотенец для отеля" },
      { title: "Починить сантехнику Dorm 8B", category: :maintenance, priority: :high, status: :in_progress,
        property: hostel, unit: hostel_dorm_b, due_date: Date.current + 2 },
      { title: "Генеральная уборка отеля", category: :cleaning, priority: :medium, status: :pending,
        property: hotel, due_date: Date.current + 7 },
    ].each do |attrs|
      organization.tasks.create!(attrs)
    end
  end
  puts "  ✓ Tasks: 6 (2 pending, 2 in_progress, 1 completed, mixed priorities)"

  # ─── Channels (iCal) ──────────────────────────────────────────
  unless Channel.joins(unit: :property).where(properties: { organization_id: organization.id }).exists?
    Channel.create!(unit: apt_studio, platform: :airbnb, sync_enabled: true)
    Channel.create!(unit: hotel_standard, platform: :booking_com, sync_enabled: true,
                    ical_import_url: "https://www.booking.com/calendar/export/example.ics")
    Channel.create!(unit: hotel_deluxe, platform: :ostrovok, sync_enabled: false)
  end
  puts "  ✓ Channels: 3 (Airbnb, Booking.com, Островок)"

  puts
  puts "═══════════════════════════════════════════════════"
  puts "  Demo seed complete!"
  puts
  puts "  Sign in:  demo@apartus.local / Password1!"
  puts "  Manager:  manager@apartus.local / Password1!"
  puts "  Org ID:   #{organization.id}"
  puts "  Org slug: #{organization.slug}"
  puts
  puts "  Widget URL: /widget/#{organization.slug}"
  puts "═══════════════════════════════════════════════════"
end
