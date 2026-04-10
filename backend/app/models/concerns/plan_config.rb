module PlanConfig
  PLANS = {
    "starter" => {
      name: "Starter",
      max_units: 3,
      max_users: 1,
      channel_manager: false,
      max_channels: 0,
      booking_widget: false,
      automation: false,
      pdf_export: false,
    },
    "professional" => {
      name: "Professional",
      max_units: 50,
      max_users: 3,
      channel_manager: true,
      max_channels: 3,
      booking_widget: true,
      automation: false,
      pdf_export: true,
    },
    "business" => {
      name: "Business",
      max_units: 200,
      max_users: 10,
      channel_manager: true,
      max_channels: -1, # unlimited
      booking_widget: true,
      automation: true,
      pdf_export: true,
    },
    "enterprise" => {
      name: "Enterprise",
      max_units: -1, # unlimited
      max_users: -1,
      channel_manager: true,
      max_channels: -1,
      booking_widget: true,
      automation: true,
      pdf_export: true,
    },
  }.freeze

  def self.codes
    PLANS.keys
  end

  def self.config_for(plan)
    PLANS[plan] || PLANS["starter"]
  end

  def self.within_limit?(current_count, max)
    max == -1 || current_count < max
  end
end
