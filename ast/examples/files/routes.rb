require 'sidekiq/web'

require 'sidekiq-status/web'

JS_APP_ROUTE = 'home#index'.freeze unless defined?(JS_APP_ROUTE)

Rails.application.routes.draw do
    mount RailsEventStore::Browser => "/res" if Rails.env.development?

    mount ActionCable.server => '/cable'

	put 'request_center/:id', to: 'request_center#update'
        
    resources :candidate_notes, only: %i[create update destroy]

    resources :profiles do
        collection do
            post :enrich_profile
            put :bulk_actions
        end
        member do
            post :upload_documents
            delete 'delete_document/:upload_uuid', action: :delete_document
        end
    end

    namespace :api, defaults: { format: 'json' } do
        resources :investor_companies do
            resources :intro_requests do
                post :create_from_public_page
                get :hello
            end
        end
    end

end
