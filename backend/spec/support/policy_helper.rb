module PolicyHelper
  def stub_membership(membership)
    allow(Current).to receive(:membership).and_return(membership)
  end

  def stub_no_membership
    allow(Current).to receive(:membership).and_return(nil)
  end
end

RSpec.configure do |config|
  config.include PolicyHelper, type: :policy
end
