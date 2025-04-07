class ArticlesController < ApplicationController
    def index
        articles = Article.all()
        render json: articles, status: :ok
    end
    

    private

    def article_params
        params.require(:article).permit(:title, :body)
      end
end