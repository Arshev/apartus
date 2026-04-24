#!/usr/bin/env bash
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"

grep -q "Conversion (FT-037)" "$REPO_ROOT/memory-bank/domain/money-and-currency.md" \
  || { echo "FAIL: money-and-currency.md missing 'Conversion (FT-037)' section"; exit 1; }

if grep -q "## No FX / No Multi-Currency" "$REPO_ROOT/memory-bank/domain/money-and-currency.md"; then
  echo "FAIL: money-and-currency.md still declares 'No FX / No Multi-Currency'"; exit 1;
fi

grep -q "ExchangeRate (FT-037)" "$REPO_ROOT/memory-bank/domain/schema.md" \
  || { echo "FAIL: schema.md missing ExchangeRate entry"; exit 1; }

grep -q "currency_rates.manage" "$REPO_ROOT/memory-bank/domain/permissions.md" \
  || { echo "FAIL: permissions.md missing currency_rates.manage"; exit 1; }

grep -q "/exchange_rates" "$REPO_ROOT/memory-bank/domain/api-reference.md" \
  || { echo "FAIL: api-reference.md missing /exchange_rates endpoint"; exit 1; }

test -f "$REPO_ROOT/memory-bank/use-cases/UC-006-daily-fx-fetch.md" \
  || { echo "FAIL: UC-006 not found"; exit 1; }

test -f "$REPO_ROOT/memory-bank/adr/ADR-016-db-check-enforces-exchange-rate-invariant.md" \
  || { echo "FAIL: ADR-016 not found"; exit 1; }

grep -q "decision_status: accepted" "$REPO_ROOT/memory-bank/adr/ADR-016-db-check-enforces-exchange-rate-invariant.md" \
  || { echo "FAIL: ADR-016 not accepted"; exit 1; }

echo "CHK-06 OK"
