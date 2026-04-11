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

## Design

- `DEC-01` Active Storage with local disk (dev), S3 planned for production.
- `DEC-02` PhotosController handles both Property and Unit photos via `find_record` dispatching on `property_id` or `unit_id` param.
- `DEC-03` Content-type validation: only image/jpeg, image/png, image/webp, image/gif allowed. Max size 10MB.
- `DEC-04` Photo JSON includes: id, filename, content_type, byte_size, url (via rails_blob_url).

## Verify

- `SC-01` Upload valid image returns 201 with photo JSON.
- `SC-02` Invalid content type rejected with 422 listing allowed types.
- `SC-03` File > 10MB rejected with "too large" error.
- `SC-04` Delete photo returns 204.
- `SC-05` Cross-org property returns 404 for photos endpoint.
- `EVID-01` `spec/requests/api/v1/photos_spec.rb`
