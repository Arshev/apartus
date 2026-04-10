module Api
  module V1
    class PhotosController < BaseController
      def index
        record = find_record
        return if performed?

        render json: record.photos.map { |p| photo_json(p) }
      end

      def create
        record = find_record
        return if performed?

        files = params[:photos] || [ params[:photo] ].compact
        if files.empty?
          render json: { error: "No files provided" }, status: :unprocessable_entity
          return
        end

        record.photos.attach(files)
        render json: record.photos.map { |p| photo_json(p) }, status: :created
      end

      def destroy
        record = find_record
        return if performed?

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
