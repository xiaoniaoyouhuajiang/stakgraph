class PeopleController < ApplicationController
  def get_person
    person = PersonService.get_person_by_id(params[:id])
    
    if person
      render json: person, status: :ok
    else
      render json: { error: "Person not found" }, status: :not_found
    end
  end

  def create_person
    person = PersonService.new_person(person_params)
    
    if person.persisted?
      render json: person, status: :created
    else
      render json: { errors: person.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    deleted_person = PersonService.delete(params[:id])

    if deleted_person.destroyed?
      render json: { message: 'Person deleted successfully' }, status: :ok
    else
      render json: { error: "Person not found" }, status: :not_found
    end
  end

  def articles
    articles = Article.all
    render json: articles, status: :ok
  end

  private

  def person_params
    params.require(:person).permit(:name, :email)
  end
end