# Integration (request)
RSpec.describe "Articles API", type: :request do
  it "lists articles" do
    get "/articles"
    expect(response.status).to eq(200)
  end
end
