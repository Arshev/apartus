class JsonWebToken
  SECRET_KEY = Rails.application.secret_key_base
  ACCESS_TOKEN_EXPIRY = 15.minutes
  REFRESH_TOKEN_EXPIRY = 30.days

  class << self
    def encode(user_id)
      payload = {
        user_id: user_id,
        type: "access",
        jti: SecureRandom.uuid,
        exp: ACCESS_TOKEN_EXPIRY.from_now.to_i
      }
      JWT.encode(payload, SECRET_KEY, "HS256")
    end

    def encode_refresh(user_id)
      payload = {
        user_id: user_id,
        type: "refresh",
        jti: SecureRandom.uuid,
        exp: REFRESH_TOKEN_EXPIRY.from_now.to_i
      }
      JWT.encode(payload, SECRET_KEY, "HS256")
    end

    def encode_pair(user_id)
      {
        access_token: encode(user_id),
        refresh_token: encode_refresh(user_id)
      }
    end

    def decode(token)
      decoded = JWT.decode(token, SECRET_KEY, true, { algorithm: "HS256" })
      body = decoded.first.symbolize_keys

      return nil if JwtDenylist.exists?(jti: body[:jti])

      body
    rescue JWT::DecodeError, JWT::ExpiredSignature
      nil
    end

    def revoke(token)
      decoded = JWT.decode(token, SECRET_KEY, true, { algorithm: "HS256" })
      body = decoded.first
      return unless body["jti"].present?

      JwtDenylist.create!(jti: body["jti"], exp: Time.at(body["exp"]))
    rescue JWT::DecodeError, JWT::ExpiredSignature
      nil
    end
  end
end
