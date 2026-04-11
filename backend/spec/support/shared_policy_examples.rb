RSpec.shared_examples "standard CRUD policy" do |view_perm:, manage_perm:, actions: %i[index show create update destroy]|
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }

  context "as owner" do
    let(:membership) { create(:membership, :owner, user: user, organization: organization) }
    before { stub_membership(membership) }

    actions.each do |action|
      it { expect(subject.public_send(:"#{action}?")).to be true }
    end
  end

  context "as member with view permission" do
    let(:role) { create(:role, organization: organization, permissions: [ view_perm ]) }
    let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
    before { stub_membership(membership) }

    view_actions = actions & %i[index show]
    manage_actions = actions - view_actions

    view_actions.each do |action|
      it { expect(subject.public_send(:"#{action}?")).to be true }
    end

    manage_actions.each do |action|
      it { expect(subject.public_send(:"#{action}?")).to be false }
    end
  end

  context "as member with manage permission" do
    let(:role) { create(:role, organization: organization, permissions: [ manage_perm ]) }
    let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
    before { stub_membership(membership) }

    manage_actions = actions & %i[create update destroy]
    manage_actions.each do |action|
      it { expect(subject.public_send(:"#{action}?")).to be true }
    end
  end

  context "as member without permissions" do
    let(:membership) { create(:membership, user: user, organization: organization, role_enum: :member) }
    before { stub_membership(membership) }

    actions.each do |action|
      it { expect(subject.public_send(:"#{action}?")).to be false }
    end
  end

  context "without membership" do
    before { stub_no_membership }

    actions.each do |action|
      it { expect(subject.public_send(:"#{action}?")).to be_falsey }
    end
  end
end
