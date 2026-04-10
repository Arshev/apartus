module Api
  module V1
    class PricingRulesController < BaseController
      def index
        authorize :pricing_rule, :index?
        rules = PricingRule.joins(unit: :property)
          .where(properties: { organization_id: Current.organization.id })
          .includes(unit: :property)
          .order("properties.name", "units.name")
        render json: rules.map { |r| rule_json(r) }
      end

      def create
        authorize :pricing_rule, :create?
        unit = Current.organization.units.find_by(id: params.dig(:pricing_rule, :unit_id))
        unless unit
          render json: { error: "Unit not found" }, status: :not_found
          return
        end

        rule = unit.pricing_rules.new(rule_params.except(:unit_id))
        if rule.save
          render json: rule_json(rule), status: :created
        else
          render json: { error: rule.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        rule = find_rule
        return if performed?
        authorize :pricing_rule, :update?
        if rule.update(rule_params.except(:unit_id))
          render json: rule_json(rule)
        else
          render json: { error: rule.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        rule = find_rule
        return if performed?
        authorize :pricing_rule, :destroy?
        rule.destroy!
        render json: { message: "Deleted" }
      end

      private

      def find_rule
        rule = PricingRule.joins(unit: :property)
          .where(properties: { organization_id: Current.organization.id })
          .find_by(id: params[:id])
        unless rule
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        rule
      end

      def rule_params
        params.require(:pricing_rule).permit(
          :unit_id, :rule_type, :min_nights, :discount_percent,
          :days_before, :occupancy_threshold, :markup_percent, :active
        )
      end

      def rule_json(r)
        {
          id: r.id,
          unit_id: r.unit_id,
          unit_name: r.unit.name,
          property_name: r.unit.property.name,
          rule_type: r.rule_type,
          min_nights: r.min_nights,
          discount_percent: r.discount_percent,
          days_before: r.days_before,
          occupancy_threshold: r.occupancy_threshold,
          markup_percent: r.markup_percent,
          active: r.active,
          created_at: r.created_at
        }
      end
    end
  end
end
