RSpec.describe "JS modal", type: :system, js: true do
  it "opens modal" do
    visit "/modal"
    click_button "Open"
    expect(page).to have_content("Modal")
  end
end
