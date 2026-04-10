module Api
  module V1
    class ExpensesController < BaseController
      def index
        authorize Expense
        scope = Current.organization.expenses.order(expense_date: :desc)
        scope = scope.where(property_id: params[:property_id]) if params[:property_id].present?
        scope = scope.where(category: params[:category]) if params[:category].present?
        scope = scope.where("expense_date >= ?", params[:from]) if params[:from].present?
        scope = scope.where("expense_date <= ?", params[:to]) if params[:to].present?
        render json: scope.map { |e| expense_json(e) }
      end

      def create
        authorize Expense
        expense = Current.organization.expenses.new(expense_params)
        if expense.save
          render json: expense_json(expense), status: :created
        else
          render json: { error: expense.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        expense = find_expense
        return if performed?
        authorize expense
        if expense.update(expense_params)
          render json: expense_json(expense)
        else
          render json: { error: expense.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        expense = find_expense
        return if performed?
        authorize expense
        expense.destroy!
        render json: { message: "Deleted" }
      end

      private

      def find_expense
        expense = Current.organization.expenses.find_by(id: params[:id])
        unless expense
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        expense
      end

      def expense_params
        params.require(:expense).permit(:property_id, :category, :amount_cents, :description, :expense_date)
      end

      def expense_json(e)
        {
          id: e.id,
          organization_id: e.organization_id,
          property_id: e.property_id,
          category: e.category,
          amount_cents: e.amount_cents,
          description: e.description,
          expense_date: e.expense_date,
          created_at: e.created_at,
          updated_at: e.updated_at
        }
      end
    end
  end
end
