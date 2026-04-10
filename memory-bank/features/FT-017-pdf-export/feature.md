---
title: "FT-017: PDF Export"
doc_kind: feature
doc_function: canonical
purpose: "PDF export for financial reports and owner statements."
derived_from:
  - ../../domain/problem.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-017: PDF Export

## Scope
- `REQ-01` Prawn-based PDF generation for financial reports + owner statements.
- `REQ-02` GET /reports/financial/pdf — downloadable PDF.
- `REQ-03` GET /owners/:id/statement?format=pdf — owner statement PDF.
- `REQ-04` Frontend: "Скачать PDF" buttons on Reports + Owner Statement pages.
