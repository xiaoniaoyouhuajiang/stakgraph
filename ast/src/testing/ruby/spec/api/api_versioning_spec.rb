# API integration
RSpec.describe "API versioning", type: :request do
  it "pings v1" do
    get "/api/v1/ping"
    expect(response.status).to eq(200)
  end
end
