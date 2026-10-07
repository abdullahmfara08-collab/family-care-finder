# Family Care Finder

_Made by Clear Week._

A mobile-first website that helps lower-income families find free and
low-cost health care near them, and check whether they may qualify for
Medicaid or CHIP. English and Spanish. No sign-up; nothing typed leaves the
phone.

## Run it

```
npm install
npm run dev      # local dev server
npm test         # unit tests (coverage math, distance)
npm run build    # static site in dist/, deployable to any static host
```

## Data

- `public/data/zips/` maps ZIP codes to locations. Rebuild with
  `node scripts/build-zips.mjs` (uses the `zipcodes` npm package).
- `public/data/clinics/` holds health center sites in 1-degree map tiles.
  Until it is built, the app runs on clearly labeled sample clinics
  (`public/data/meta.json` has `"demo": true`).

To load real clinics, download "Health Center Service Delivery and
Look-Alike Sites" (CSV) from https://data.hrsa.gov/data/download, then:

```
node scripts/build-clinics.mjs path/to/the.csv
```

That writes the tiles and sets `meta.json` to the source and today's date,
which the app shows on every result. Re-run it monthly.

## Build settings (all optional)

- `VITE_CONTACT_EMAIL`: shown on the privacy and terms pages. Set before launch.
- `VITE_REPORT_EMAIL`: shows a "Something wrong here?" link on each clinic page.
- `VITE_METRICS_URL`: turns on privacy-friendly usage counts. The app sends
  only an event name from a fixed list (`src/lib/metrics.ts`) and the date.

## Brand

Clear Week woodland palette, Plus Jakarta Sans (self-hosted via
@fontsource), Clear Week mark in `public/clear-week-icon.png`. Product name
first; "made by Clear Week" only in the footer, as Focus Perch does.

## Usage counts (impact)

`worker/index.ts` serves the site and two endpoints: `POST /api/count` (an
event name from `src/lib/metrics-events.ts`) and `GET /api/stats` (totals,
shown on the `#impact` page). Counts live in a Cloudflare D1 database bound
as `DB`, one row per day and event; nothing about visitors is stored. Setup
steps are in `wrangler.jsonc`.

## Coverage check

`src/lib/coverage.ts` uses the 2026 HHS poverty guidelines and each state's
Medicaid expansion status (KFF, October 2026). Update both each January. Results are worded as "may qualify" and link to the official
application.
