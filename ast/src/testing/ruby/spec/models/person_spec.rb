RSpec.describe Person, type: :model do
  it "has email validation" do
    expect(Person.new).to respond_to(:email)
  end
end
