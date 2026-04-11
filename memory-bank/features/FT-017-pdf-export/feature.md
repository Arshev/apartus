---
title: "FT-017: PDF Export"
doc_kind: feature
doc_function: canonical
purpose: "PDF export for financial reports and owner statements."
derived_from:
  - ../../domain/problem.md
  - ../../domain/architecture.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-017: PDF Export

## Scope

**Backend:**
- `REQ-01` Prawn-based PDF generation: `Pdf::BasePdf`, `Pdf::FinancialReportPdf`, `Pdf::OwnerStatementPdf`.
- `REQ-02` `Pdf::BasePdf` — registers Arial TTF font (Cyrillic), provides `fmt(cents)` and `header(title)`.
- `REQ-03` `GET /api/v1/reports/financial/pdf` — financial report PDF attachment.
- `REQ-04` `GET /api/v1/owners/:id/statement?format=pdf` — owner statement PDF attachment.
- `REQ-05` Financial PDF: KPI table, revenue by property, expenses by category.
- `REQ-06` Owner PDF: owner name, commission, summary, per-property breakdown.

**Frontend:**
- `REQ-07` Reports: "Скачать PDF" button → `downloadFinancialReport()`.
- `REQ-08` Owner Statement: "PDF" button → `downloadOwnerStatement(ownerId)`.

### Non-Scope
- `NS-01` Custom PDF templates or branding.
- `NS-02` PDF preview in browser.

## Design

- `DEC-01` Prawn gem — lightweight, no external dependencies.
- `DEC-02` `include Prawn::View` for DSL. Arial TTF for Cyrillic.
- `DEC-03` `BasePdf#fmt(cents)` mirrors `CurrencyConfig` formatting.
- `DEC-04` PDF endpoints reuse controller data-building methods.
- `DEC-05` Fonts in `app/assets/fonts/`. Fallback to Prawn default if missing.

## Verify

- `SC-01` Financial PDF: valid %PDF binary, correct content-type.
- `SC-02` Owner statement PDF: valid %PDF, attachment disposition.
- `SC-03` Renders for all currencies (RUB after, USD before, UZS zero-decimal).
- `SC-04` Empty data renders without error.
- `CHK-01` Only `finances.view` users can download.
- `EVID-01` `spec/services/pdf/financial_report_pdf_spec.rb`
- `EVID-02` `spec/services/pdf/owner_statement_pdf_spec.rb`
- `EVID-03` `spec/requests/api/v1/reports_spec.rb` (PDF endpoint)
- `EVID-04` `spec/requests/api/v1/owners_spec.rb` (format=pdf)
