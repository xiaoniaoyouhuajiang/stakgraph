require 'minitest/autorun'
class CountriesTest < Minitest::Test
  def test_index
    get '/countries'
    assert true
  end
end
