require "rails_helper"

RSpec.describe ExchangeRate, type: :model do
  describe "validations" do
    it { is_expected.to validate_presence_of(:base_currency) }
    it { is_expected.to validate_presence_of(:quote_currency) }
    it { is_expected.to validate_presence_of(:rate_x1e10) }
    it { is_expected.to validate_presence_of(:effective_date) }
    it { is_expected.to validate_presence_of(:source) }
    it { is_expected.to validate_inclusion_of(:source).in_array(%w[api manual]) }
    it { is_expected.to validate_inclusion_of(:base_currency).in_array(CurrencyConfig.codes) }
    it { is_expected.to validate_inclusion_of(:quote_currency).in_array(CurrencyConfig.codes) }

    it "rejects non-positive rate" do
      rate = build(:exchange_rate, rate_x1e10: 0)
      expect(rate).not_to be_valid
    end

    it "rejects base == quote (FM-08)" do
      rate = build(:exchange_rate, base_currency: "USD", quote_currency: "USD")
      expect(rate).not_to be_valid
      expect(rate.errors[:quote_currency]).to be_present
    end

    it "rejects effective_date > 30 days in the future (FM-09)" do
      rate = build(:exchange_rate, effective_date: Date.current + 45)
      expect(rate).not_to be_valid
    end

    context "source and organization consistency" do
      it "api source requires organization_id to be nil" do
        org = create(:organization)
        rate = build(:exchange_rate, source: "api", organization: org)
        expect(rate).not_to be_valid
      end

      it "manual source requires organization_id" do
        rate = build(:exchange_rate, :manual, organization: nil)
        expect(rate).not_to be_valid
      end
    end
  end

  describe "scopes" do
    let(:org_a) { create(:organization) }
    let(:org_b) { create(:organization) }
    let!(:api_rate)     { create(:exchange_rate, source: "api",    organization_id: nil, effective_date: Date.current) }
    let!(:manual_a)     { create(:exchange_rate, :manual, organization: org_a, effective_date: Date.current) }
    let!(:manual_b)     { create(:exchange_rate, :manual, organization: org_b, effective_date: Date.current - 1) }

    it ".global returns only organization_id IS NULL rows" do
      expect(described_class.global.to_a).to eq([ api_rate ])
    end

    it ".for_organization filters by organization" do
      expect(described_class.for_organization(org_a).to_a).to eq([ manual_a ])
    end

    it ".effective_on <= date, ordered desc" do
      future = create(:exchange_rate, :manual, organization: org_a, effective_date: Date.current, base_currency: "USD", quote_currency: "EUR")
      result = described_class.for_organization(org_a).by_pair("USD", "RUB").effective_on(Date.current)
      expect(result.first.effective_date).to eq(Date.current)
      _ = future
    end
  end

  describe "DB CHECK constraints (ADR-016, NEG-11)" do
    # CHECK violation aborts current transaction. Use savepoints so outer
    # transactional fixture rollback still works.
    def expect_db_violation(sql, expected_pattern)
      ActiveRecord::Base.connection.execute("SAVEPOINT check_violation_test")
      expect { ActiveRecord::Base.connection.execute(sql) }
        .to raise_error(ActiveRecord::StatementInvalid, expected_pattern)
    ensure
      ActiveRecord::Base.connection.execute("ROLLBACK TO SAVEPOINT check_violation_test")
    end

    it "rejects raw insert with source=api AND organization_id != NULL" do
      org = create(:organization)
      expect_db_violation(<<~SQL, /exchange_rates_source_tenancy_invariant/)
        INSERT INTO exchange_rates
          (base_currency, quote_currency, rate_x1e10, effective_date, source, organization_id, created_at, updated_at)
        VALUES
          ('USD','RUB',955000000000,'#{Date.current}','api',#{org.id},NOW(),NOW())
      SQL
    end

    it "rejects raw insert with source=manual AND organization_id IS NULL" do
      expect_db_violation(<<~SQL, /exchange_rates_source_tenancy_invariant/)
        INSERT INTO exchange_rates
          (base_currency, quote_currency, rate_x1e10, effective_date, source, organization_id, created_at, updated_at)
        VALUES
          ('USD','RUB',955000000000,'#{Date.current}','manual',NULL,NOW(),NOW())
      SQL
    end

    it "rejects rate_x1e10 <= 0 at DB level" do
      expect_db_violation(<<~SQL, /exchange_rates_rate_positive/)
        INSERT INTO exchange_rates
          (base_currency, quote_currency, rate_x1e10, effective_date, source, organization_id, created_at, updated_at)
        VALUES
          ('USD','RUB',0,'#{Date.current}','api',NULL,NOW(),NOW())
      SQL
    end
  end

  describe "unique constraint" do
    it "prevents duplicate (base, quote, date, source, org) rows" do
      attrs_sql = "('USD','RUB',955000000000,'#{Date.current}','api',NULL,NOW(),NOW())"
      cols_sql  = "(base_currency, quote_currency, rate_x1e10, effective_date, source, organization_id, created_at, updated_at)"

      ActiveRecord::Base.connection.execute("INSERT INTO exchange_rates #{cols_sql} VALUES #{attrs_sql}")

      ActiveRecord::Base.connection.execute("SAVEPOINT uniq_test")
      begin
        expect {
          ActiveRecord::Base.connection.execute("INSERT INTO exchange_rates #{cols_sql} VALUES #{attrs_sql}")
        }.to raise_error(ActiveRecord::RecordNotUnique)
      ensure
        ActiveRecord::Base.connection.execute("ROLLBACK TO SAVEPOINT uniq_test")
      end
    end
  end

  describe "FK on_delete: :cascade (PG metadata)" do
    it "exchange_rates → organizations FK has ON DELETE CASCADE" do
      row = ActiveRecord::Base.connection.select_one(<<~SQL)
        SELECT confdeltype FROM pg_constraint
        WHERE conrelid = 'exchange_rates'::regclass
          AND confrelid = 'organizations'::regclass
          AND contype = 'f'
        LIMIT 1
      SQL
      # 'c' = CASCADE, 'a' = NO ACTION (default), 'r' = RESTRICT
      expect(row).to be_present
      expect(row["confdeltype"]).to eq("c")
    end

    it "destroying organization removes its manual overrides (AR dependent: :destroy)" do
      org = create(:organization)
      rate = create(:exchange_rate, :manual, organization: org,
                    base_currency: "USD", quote_currency: "RUB",
                    effective_date: Date.current)
      org.destroy
      expect(ExchangeRate.where(id: rate.id)).to be_empty
    end
  end
end
