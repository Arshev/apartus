module Api
  module V1
    class OwnersController < BaseController
      def index
        authorize Owner
        render json: Current.organization.owners.order(:name).map { |o| owner_json(o) }
      end

      def show
        owner = find_owner
        return if performed?
        authorize owner
        render json: owner_json(owner)
      end

      def create
        authorize Owner
        owner = Current.organization.owners.new(owner_params)
        if owner.save
          render json: owner_json(owner), status: :created
        else
          render json: { error: owner.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        owner = find_owner
        return if performed?
        authorize owner
        if owner.update(owner_params)
          render json: owner_json(owner)
        else
          render json: { error: owner.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        owner = find_owner
        return if performed?
        authorize owner
        owner.destroy!
        render json: { message: "Deleted" }
      end

      def statement
        owner = find_owner
        return if performed?
        authorize owner

        from = parse_date(params[:from], Date.current.beginning_of_month)
        to = parse_date(params[:to], Date.current.end_of_month)

        properties = owner.properties.where(organization_id: Current.organization.id)
        property_ids = properties.pluck(:id)

        revenue = Reservation.joins(unit: :property)
          .where(properties: { id: property_ids })
          .where(status: [ :confirmed, :checked_in, :checked_out ])
          .where("check_in <= ? AND check_out >= ?", to, from)
          .sum(:total_price_cents)

        expenses = Expense.where(property_id: property_ids, expense_date: from..to).sum(:amount_cents)

        commission = (revenue * owner.commission_rate / 10_000.0).round
        net_payout = revenue - commission - expenses

        per_property = properties.map do |p|
          p_revenue = Reservation.joins(unit: :property)
            .where(properties: { id: p.id })
            .where(status: [ :confirmed, :checked_in, :checked_out ])
            .where("check_in <= ? AND check_out >= ?", to, from)
            .sum(:total_price_cents)
          p_expenses = Expense.where(property_id: p.id, expense_date: from..to).sum(:amount_cents)
          p_commission = (p_revenue * owner.commission_rate / 10_000.0).round
          { property_name: p.name, revenue: p_revenue, expenses: p_expenses, commission: p_commission, payout: p_revenue - p_commission - p_expenses }
        end

        data = {
          owner_name: owner.name, from: from, to: to,
          commission_rate: owner.commission_rate,
          total_revenue: revenue, total_expenses: expenses,
          commission: commission, net_payout: net_payout,
          properties: per_property
        }

        if params[:format] == "pdf"
          pdf = Pdf::OwnerStatementPdf.new(Current.organization, data).render_pdf
          send_data pdf, filename: "statement_#{owner.name.parameterize}_#{from}_#{to}.pdf",
                         type: "application/pdf", disposition: "attachment"
        else
          render json: data
        end
      end

      private

      def find_owner
        owner = Current.organization.owners.find_by(id: params[:id])
        unless owner
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        owner
      end

      def owner_params
        params.require(:owner).permit(:name, :email, :phone, :commission_rate, :notes)
      end

      def owner_json(o)
        {
          id: o.id,
          organization_id: o.organization_id,
          name: o.name,
          email: o.email,
          phone: o.phone,
          commission_rate: o.commission_rate,
          properties_count: o.properties.count,
          notes: o.notes,
          created_at: o.created_at
        }
      end

      def parse_date(param, default)
        return default if param.blank?
        Date.parse(param)
      rescue Date::Error, ArgumentError
        default
      end
    end
  end
end
