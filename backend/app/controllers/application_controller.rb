class ApplicationController < ActionController::API
  include Pundit::Authorization

  private

  def current_user
    return @current_user if defined?(@current_user)

    @current_user = nil
    token = extract_token_from_header
    return unless token

    decoded = JsonWebToken.decode(token)
    return unless decoded
    return unless decoded[:type].nil? || decoded[:type] == "access"

    @current_user = User.find_by(id: decoded[:user_id])
  end

  def authenticate_user!
    render json: { error: "Unauthorized" }, status: :unauthorized unless current_user
  end

  def set_current_organization
    org_id = request.headers["X-Organization-Id"]
    unless org_id.present?
      render json: { error: "Organization not selected" }, status: :unprocessable_entity
      return
    end

    organization = Organization.find_by(id: org_id)
    unless organization
      render json: { error: "Organization not found" }, status: :not_found
      return
    end

    membership = current_user.membership_for(organization)
    unless membership
      render json: { error: "Not a member of this organization" }, status: :forbidden
      return
    end

    Current.user = current_user
    Current.organization = organization
    Current.membership = membership
  end

  def extract_token_from_header
    header = request.headers["Authorization"]
    return unless header

    header.split(" ").last
  end
end
