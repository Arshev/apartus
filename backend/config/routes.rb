Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      namespace :auth do
        post "sign_up", to: "registrations#create"
        post "sign_in", to: "sessions#create"
        post "refresh", to: "sessions#refresh"
        delete "sign_out", to: "sessions#destroy"
        get "me", to: "sessions#show"
      end

      resources :organizations, only: [ :index ]
      resource :organization, only: [ :show, :update ]
      resources :members, only: [ :index, :create, :update, :destroy ]
      resources :roles, only: [ :index, :create, :update, :destroy ]
      resources :properties, only: [ :index, :show, :create, :update, :destroy ] do
        resources :units, only: [ :index, :show, :create, :update, :destroy ]
        resources :photos, only: [ :index, :create, :destroy ], controller: "photos"
      end

      resources :amenities, only: [ :index, :show, :create, :update, :destroy ]

      resources :units, only: [] do
        resources :amenities, only: [ :index, :create, :destroy ],
                  controller: "unit_amenities"
        resources :seasonal_prices, only: [ :index, :create, :update, :destroy ]
        resources :photos, only: [ :index, :create, :destroy ], controller: "photos"
      end

      resources :branches, only: [ :index, :show, :create, :update, :destroy ]
      resources :guests, only: [ :index, :show, :create, :update, :destroy ]
      resources :reservations, only: [ :index, :show, :create, :update, :destroy ] do
        member do
          patch :check_in
          patch :check_out
          patch :cancel
        end
      end

      resources :expenses, only: [ :index, :create, :update, :destroy ]
      resources :tasks, only: [ :index, :create, :update, :destroy ]
      get "reports/financial", to: "reports#financial"
      get "dashboard", to: "dashboard#show"
      get "health", to: "health#show"
    end
  end
end
