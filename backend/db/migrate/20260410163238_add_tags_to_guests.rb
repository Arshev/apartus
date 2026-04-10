class AddTagsToGuests < ActiveRecord::Migration[8.1]
  def change
    add_column :guests, :tags, :text, array: true, default: []
    add_column :guests, :source, :string, limit: 50
  end
end
