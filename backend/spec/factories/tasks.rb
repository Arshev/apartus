FactoryBot.define do
  factory :task do
    organization
    title { "Test task" }
    status { :pending }
    priority { :medium }
    category { :cleaning }
  end
end
