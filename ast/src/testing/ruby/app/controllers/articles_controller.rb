class ArticlesController < ApplicationController
    private
    def article_params
        params.require(:article).permit(:title, :body)
      end
end