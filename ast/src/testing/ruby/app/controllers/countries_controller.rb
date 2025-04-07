class CountriesController < ApplicationController
    def process
        country = Country.new(country_params)
        if country.save
            render json: country, status: :created
          else
            render json: country.errors, status: :unprocessable_entity
          end
        end
    end

    private
    
    def country_params
        params.require(:country).permit(:name, :code)
    end
end