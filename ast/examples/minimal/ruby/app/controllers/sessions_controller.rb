class SessionsController < ApplicationController
    skip_before_action :verify_authenticity_token
  
    def logout
      destroy_stak_session
  
      redirect_to workers_index_path
    end
  end
  