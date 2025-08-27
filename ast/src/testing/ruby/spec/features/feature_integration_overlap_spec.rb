RSpec.describe "Feature integration overlap", type: :feature do
  it "network + ui" do
    visit "/items"
    get "/items"
    expect(page).to have_content("Items")
  end
end
