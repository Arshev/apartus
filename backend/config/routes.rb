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

      get "health", to: "health#show"
    end
  end
end
