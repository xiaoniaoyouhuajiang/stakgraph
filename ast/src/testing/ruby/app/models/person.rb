class Person < ApplicationRecord
  has_many :articles, dependent: :destroy
  
  validates :name, presence: true
  validates :email, presence: true, uniqueness: true
end