# Bulk Import Format

Two ways to bring many properties in at once from `/dashboard/import`. Pick whichever is easier to prepare.

## Option 1 — ZIP folder import

Upload a single `.zip` with one folder per property:

```
properties-import.zip
  villa-example-one/
    metadata.json        (preferred — see example-metadata.json)
    listing.md            (fallback, used only if metadata.json is missing)
    images/
      01.jpg
      02.jpg
      03.jpg
  penthouse-example-two/
    metadata.json
    images/
      01.jpg
      02.jpg
```

Notes:
- If a folder has both `metadata.json` and `listing.md`, `metadata.json` is used and `listing.md` is ignored.
- Images **must** be inside an `images/` subfolder — image files placed directly in the property folder are not picked up.
- Images are numbered/ordered alphabetically; the first one becomes the cover photo.
- Accepted image types: jpg, jpeg, png, webp.
- The folder name becomes the property's URL slug (via the property name if available, otherwise the folder name itself).

See `example-metadata.json` and `example-listing.md` for the exact fields/format expected.

## Option 2 — CSV + images ZIP

Upload two files together:

1. `properties.csv` — one row per property. See `properties-template.csv` for the exact columns.
2. `images.zip` — containing one folder per property, matching the `image_folder` column in the CSV:

```
images.zip
  villa-example-one/
    01.jpg
    02.jpg
  penthouse-example-two/
    01.jpg
    02.jpg
```

CSV column notes:
- `features` — comma-separated within the cell, e.g. `"Pool,Sea view,Garage"` (quote the cell since it contains commas).
- `image_folder` — must exactly match a folder name inside `images.zip`.
- Leave optional columns blank if unknown; do not guess or invent values.

## What happens after upload

- The dashboard shows a **preview table** before anything is saved — nothing is imported until you confirm.
- Each row is checked and marked **valid**, **warning** (imported, but missing some optional details), **error** (missing something required — not imported), or **duplicate** (a property with that slug already exists — skipped, not overwritten).
- Required for a row to import: name, price label, location, a description (short or long), and at least one image.
- All imported properties are created **unpublished** and **not featured** — review and publish them from the main dashboard once you've checked they look right.
