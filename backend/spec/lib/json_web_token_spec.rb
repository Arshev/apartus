require "rails_helper"

RSpec.describe JsonWebToken do
  let(:user) { create(:user) }

  describe ".encode" do
    it "returns a JWT string" do
      token = described_class.encode(user.id)
      expect(token).to be_a(String)
      expect(token.split(".").length).to eq(3) # header.payload.signature
    end

    it "encodes user_id and type=access" do
      token = described_class.encode(user.id)
      decoded = described_class.decode(token)
      expect(decoded[:user_id]).to eq(user.id)
      expect(decoded[:type]).to eq("access")
    end

    it "includes jti for revocation" do
      token = described_class.encode(user.id)
      decoded = described_class.decode(token)
      expect(decoded[:jti]).to be_present
    end

    it "includes expiration" do
      token = described_class.encode(user.id)
      decoded = described_class.decode(token)
      expect(decoded[:exp]).to be > Time.current.to_i
    end
  end

  describe ".encode_refresh" do
    it "returns token with type=refresh" do
      token = described_class.encode_refresh(user.id)
      decoded = JWT.decode(token, Rails.application.secret_key_base, true, algorithm: "HS256")
      expect(decoded.first["type"]).to eq("refresh")
    end

    it "has longer expiry than access token" do
      access = described_class.encode(user.id)
      refresh = described_class.encode_refresh(user.id)
      access_exp = JWT.decode(access, Rails.application.secret_key_base, true, algorithm: "HS256").first["exp"]
      refresh_exp = JWT.decode(refresh, Rails.application.secret_key_base, true, algorithm: "HS256").first["exp"]
      expect(refresh_exp).to be > access_exp
    end
  end

  describe ".encode_pair" do
    it "returns both access and refresh tokens" do
      pair = described_class.encode_pair(user.id)
      expect(pair[:access_token]).to be_a(String)
      expect(pair[:refresh_token]).to be_a(String)
      expect(pair[:access_token]).not_to eq(pair[:refresh_token])
    end
  end

  describe ".decode" do
    it "returns payload for valid token" do
      token = described_class.encode(user.id)
      decoded = described_class.decode(token)
      expect(decoded[:user_id]).to eq(user.id)
    end

    it "returns nil for invalid token" do
      expect(described_class.decode("garbage")).to be_nil
    end

    it "returns nil for expired token" do
      payload = { user_id: user.id, type: "access", jti: SecureRandom.uuid, exp: 1.hour.ago.to_i }
      expired = JWT.encode(payload, Rails.application.secret_key_base, "HS256")
      expect(described_class.decode(expired)).to be_nil
    end

    it "returns nil for revoked token" do
      token = described_class.encode(user.id)
      described_class.revoke(token)
      expect(described_class.decode(token)).to be_nil
    end

    it "returns nil for wrong secret" do
      payload = { user_id: user.id, exp: 1.hour.from_now.to_i }
      bad_token = JWT.encode(payload, "wrong-secret", "HS256")
      expect(described_class.decode(bad_token)).to be_nil
    end
  end

  describe ".revoke" do
    it "adds jti to denylist" do
      token = described_class.encode(user.id)
      expect { described_class.revoke(token) }.to change(JwtDenylist, :count).by(1)
    end

    it "stores correct jti and exp" do
      token = described_class.encode(user.id)
      decoded = JWT.decode(token, Rails.application.secret_key_base, true, algorithm: "HS256").first
      described_class.revoke(token)
      entry = JwtDenylist.last
      expect(entry.jti).to eq(decoded["jti"])
      expect(entry.exp.to_i).to eq(decoded["exp"])
    end

    it "returns nil for invalid token" do
      expect(described_class.revoke("garbage")).to be_nil
    end
  end
end
