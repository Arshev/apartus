---
title: "FT-004: Photos"
doc_kind: feature
doc_function: canonical
purpose: "Property/Unit photo upload via Active Storage. Full-stack."
derived_from:
  - ../../domain/problem.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-004: Photos

## Scope

- `REQ-01` Property has_many_attached :photos. Upload via `POST /properties/:id/photos`, list via JSON including photo URLs, delete via `DELETE /properties/:id/photos/:photo_id`.
- `REQ-02` Unit has_many_attached :photos. Same pattern.
- `REQ-03` Frontend: photo gallery on property/unit edit forms with upload + delete.
- `REQ-04` Specs.

## Non-Scope

- `NS-01` Image variants/thumbnails (post-MVP).
- `NS-02` Drag-and-drop reordering.

## Constraints

- `CON-01` Active Storage with local disk storage (dev). S3 for production (later).
- `CON-02` No new gems needed — image_processing already in Gemfile.
