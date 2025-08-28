# RSpec unit test (model)
RSpec.describe Article, type: :model do
  it "validates basics" do
    expect(Article.new).to respond_to(:title)
  end
end
