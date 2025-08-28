# Feature (E2E)
RSpec.describe "Country management", type: :feature do
  scenario "creates country" do
    visit "/countries/new"
    fill_in "Name", with: "USA"
    click_button "Create"
    expect(page).to have_content("USA")
  end
end
