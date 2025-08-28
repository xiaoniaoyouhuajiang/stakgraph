# E2E/system (Capybara)
RSpec.describe "User login", type: :system, js: true do
  it "logs in" do
    visit "/login"
    fill_in "Email", with: "a@b.com"
    click_button "Login"
    expect(page).to have_content("Dashboard")
  end
end
