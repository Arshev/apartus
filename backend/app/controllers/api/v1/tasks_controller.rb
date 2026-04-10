module Api
  module V1
    class TasksController < BaseController
      def index
        authorize Task
        scope = Current.organization.tasks.order(priority: :desc, due_date: :asc)
        scope = scope.where(status: params[:status]) if params[:status].present?
        scope = scope.where(priority: params[:priority]) if params[:priority].present?
        scope = scope.where(property_id: params[:property_id]) if params[:property_id].present?
        scope = scope.where(assigned_to_id: params[:assigned_to_id]) if params[:assigned_to_id].present?
        render json: scope.map { |t| task_json(t) }
      end

      def create
        authorize Task
        task = Current.organization.tasks.new(task_params)
        if task.save
          render json: task_json(task), status: :created
        else
          render json: { error: task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        task = find_task
        return if performed?
        authorize task
        if task.update(task_params)
          render json: task_json(task)
        else
          render json: { error: task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        task = find_task
        return if performed?
        authorize task
        task.destroy!
        render json: { message: "Deleted" }
      end

      private

      def find_task
        task = Current.organization.tasks.find_by(id: params[:id])
        unless task
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        task
      end

      def task_params
        params.require(:task).permit(
          :property_id, :unit_id, :assigned_to_id,
          :title, :description, :status, :priority, :due_date, :category
        )
      end

      def task_json(t)
        {
          id: t.id,
          organization_id: t.organization_id,
          property_id: t.property_id,
          unit_id: t.unit_id,
          assigned_to_id: t.assigned_to_id,
          assigned_to_name: t.assigned_to&.full_name,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          category: t.category,
          created_at: t.created_at,
          updated_at: t.updated_at
        }
      end
    end
  end
end
