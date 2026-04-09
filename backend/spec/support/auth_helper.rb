module AuthHelper
  def auth_headers(user, organization = nil)
    token = JsonWebToken.encode(user.id)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Organization-Id"] = organization.id.to_s if organization
    headers
  end
end

RSpec.configure do |config|
  config.include AuthHelper
end
