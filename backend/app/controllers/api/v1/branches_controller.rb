module Api
  module V1
    class BranchesController < BaseController
      def index
        authorize Branch
        branches = Current.organization.branches.order(:id)
        render json: branches.map { |b| branch_json(b) }
      end

      def show
        branch = find_branch
        return if performed?

        authorize branch
        render json: branch_json(branch)
      end

      def create
        authorize Branch

        permitted = params.require(:branch).permit(:name, :parent_branch_id)
        branch = Current.organization.branches.new(name: permitted[:name])

        if permitted.key?(:parent_branch_id)
          parent_or_error = resolve_parent_or_error(permitted[:parent_branch_id])
          if parent_or_error == :not_in_scope
            render json: { error: [ "Parent branch must exist" ] },
                   status: :unprocessable_entity
            return
          end
          branch.parent_branch = parent_or_error
        end

        if branch.save
          render json: branch_json(branch), status: :created
        else
          render json: { error: branch.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        branch = find_branch
        return if performed?

        authorize branch

        permitted = params.require(:branch).permit(:name, :parent_branch_id)
        branch.name = permitted[:name] if permitted.key?(:name)

        if params[:branch].key?(:parent_branch_id)
          parent_or_error = resolve_parent_or_error(permitted[:parent_branch_id])
          if parent_or_error == :not_in_scope
            render json: { error: [ "Parent branch must exist" ] },
                   status: :unprocessable_entity
            return
          end
          branch.parent_branch = parent_or_error
        end

        if branch.save
          render json: branch_json(branch)
        else
          render json: { error: branch.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        branch = find_branch
        return if performed?

        authorize branch

        if branch.destroy
          head :no_content
        else
          render json: { error: branch.errors.full_messages }, status: :conflict
        end
      end

      private

      def find_branch
        branch = Current.organization.branches.find_by(id: params[:id])
        unless branch
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        branch
      end

      # SECURITY: parent MUST be resolved via Current.organization scope.
      # Passing parent_branch_id directly into new/update would let Rails
      # resolve it via global Branch.find, crossing organizations and
      # silently setting parent_branch via belongs_to optional: true.
      # See Spec F4 §5.3 ANTI-PATTERN block.
      #
      # Returns nil (valid root), :not_in_scope (422 signal), or a Branch
      # record resolved within the current organization.
      def resolve_parent_or_error(raw_id)
        return nil if raw_id.blank?

        parent = Current.organization.branches.find_by(id: raw_id)
        parent || :not_in_scope
      end

      def branch_json(branch)
        {
          id: branch.id,
          organization_id: branch.organization_id,
          parent_branch_id: branch.parent_branch_id,
          name: branch.name,
          created_at: branch.created_at,
          updated_at: branch.updated_at
        }
      end
    end
  end
end
