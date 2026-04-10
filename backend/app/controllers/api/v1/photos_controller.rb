module Api
  module V1
    class PhotosController < BaseController
      ALLOWED_TYPES = %w[image/jpeg image/png image/webp image/gif].freeze
      MAX_SIZE = 10.megabytes

      def index
        record = find_record
        return if performed?

        authorize :photo, :index?
        render json: record.photos.map { |p| photo_json(p) }
      end

      def create
        record = find_record
        return if performed?

        authorize :photo, :create?

        files = params[:photos] || [ params[:photo] ].compact
        if files.empty?
          render json: { error: "No files provided" }, status: :unprocessable_entity
          return
        end

        files.each do |file|
          unless ALLOWED_TYPES.include?(file.content_type)
            render json: { error: "Invalid file type: #{file.content_type}. Allowed: #{ALLOWED_TYPES.join(', ')}" },
                   status: :unprocessable_entity
            return
          end
          if file.size > MAX_SIZE
            render json: { error: "File too large (max #{MAX_SIZE / 1.megabyte}MB)" },
                   status: :unprocessable_entity
            return
          end
        end

        record.photos.attach(files)
        render json: record.photos.map { |p| photo_json(p) }, status: :created
      rescue ActiveStorage::IntegrityError, ActiveStorage::Error => e
        render json: { error: "Upload failed: #{e.message}" }, status: :unprocessable_entity
      end

      def destroy
        record = find_record
        return if performed?

        authorize :photo, :destroy?

        photo = record.photos.find_by(id: params[:id])
        unless photo
          render json: { error: "Not found" }, status: :not_found
          return
        end

        photo.purge
        head :no_content
      end

      private

      def find_record
        if params[:property_id]
          record = Current.organization.properties.find_by(id: params[:property_id])
        elsif params[:unit_id]
          record = Current.organization.units.find_by(id: params[:unit_id])
        end

        unless record
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        record
      end

      def photo_json(photo)
        {
          id: photo.id,
          filename: photo.filename.to_s,
          content_type: photo.content_type,
          byte_size: photo.byte_size,
          url: rails_blob_url(photo, only_path: true)
        }
      end
    end
  end
end
