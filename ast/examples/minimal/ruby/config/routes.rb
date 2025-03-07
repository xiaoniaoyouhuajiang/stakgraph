require "sidekiq/web"
require 'sidekiq/cron/web'

Rails.application.routes.draw do

  mount ActionCable.server, at: '/cable'

  get "up" => "healthcheck#show"

  get '/logout', to: 'sessions#logout'
  
  namespace :admin do
    
    #Wizard
    resources :wizard, only: [:index, :new, :create]

    #Payments
    get '/lnd_payments/request', to: 'lnd_payments#request_payment'
    get '/lnd_payments/check', to: 'lnd_payments#check'
    
  end
end
