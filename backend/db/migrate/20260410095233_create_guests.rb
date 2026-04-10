class CreateGuests < ActiveRecord::Migration[8.1]
  def change
    create_table :guests do |t|
      t.references :organization, null: false, foreign_key: { on_delete: :cascade }
      t.string :first_name, null: false, limit: 255
      t.string :last_name, null: false, limit: 255
      t.string :email, limit: 255
      t.string :phone, limit: 50
      t.text :notes

      t.timestamps
    end

    add_index :guests, "organization_id, LOWER(email)",
              unique: true,
              where: "email IS NOT NULL AND email != ''",
              name: "index_guests_on_org_lower_email"
  end
end
