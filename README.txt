GLOBAL EXTRADITION TREATY MAP — VERSION 3
Legal snapshot: 22 October 2026
Live: https://global-extradition-treaty-map.netlify.app/
Repository: https://github.com/akxks/global-extradition-treaty-map

A static HTML/CSS/vanilla-JavaScript educational reference. No runtime package,
framework, application server, API key, analytics tracker or paid dependency.
Host this directory on Netlify. The existing GitHub-linked deployment publishes
main with publish directory '.' and no build command.

OPEN / DEVELOP
Serve the directory with any static HTTP server, for example:
  python3 -m http.server 8765
The map works on ordinary static hosting. Country detection needs Netlify CDN
Country redirect rules; other hosts return the static null fallback.

FILES
index.html / style.css / theme.js / script.js — interface and preferences
model.js — shared, cached relationship classification, counts, CSV, comparisons
render.js — shared legal-record and summary presentation
map-data.js — Natural Earth 1:50m SVG paths, Equal Earth projection; 242 selectors
treaties.js — sourced instruments, membership, exclusions, status and dates
research.js — nationality profiles and country-publication metadata
countries/ — meaningful, pre-rendered HTML country profiles
methodology/ — sources, scope, counting and privacy
coverage-report.json — calculated coverage statistics
assets/ — real political-map social PNG (1200 x 630), SVG source and favicon
geo/ / country.json / _redirects — country-only static GeoIP routing on Netlify
.github/ISSUE_TEMPLATE/data-correction.yml — evidence-based correction reports

UPDATE DATA
Preserve record IDs and source vintages. Never infer absence from an empty
inventory or participation from organisation membership. Add official sources,
individual effective dates where known, exclusions and legal qualifications.
Do not mark a pair or country complete without an exhaustive documented audit.
Preserve original verification dates unless genuinely re-reviewed.

Optional dependency-free authoring commands (Node is not needed at runtime):
  node tools/build-static.cjs
  node validation.test.cjs
  node tools/check-static.cjs
The generator recalculates profiles, sitemap, metadata, coverage and GeoIP rules.
The social PNG is committed and ready to serve. If replacing its SVG artwork,
render assets/social-map.svg to a 1200 x 630 PNG with a standard SVG renderer,
then inspect the result and rerun the static checks. No image library is loaded
by the website. Version asset query strings after changes to avoid stale caches.

COVERAGE
Version 3 records 1,934 active unordered pairs, 529 instruments (including
inactive/domestic-only records), 242 selectable jurisdictions, and 168
jurisdictions with at least one positive active relationship. There are 115
substantive static country profiles and 13 nationality-law profiles.
27,225 pairs remain unverified; two narrow negative classifications are sourced.
No complete country inventory or fully audited pair review is certified.
The 227 new active pairs preserve all 1,707 previously recorded active pairs.

Rankings include only 193 UN members and two observers as state partners.
Totals deduplicate partners, even when several instruments apply. Definitive
smallest-network rankings are intentionally unavailable while all inventories
are partial. Provisional counts are not claims of real-world network size.
Read /methodology/ for qualifications and source-access limitations.

PRIVACY
Netlify routes a same-origin country endpoint to static JSON. The application
receives only a country code, does not request GPS and stores no IP address.
Normal hosting infrastructure processes connection metadata. Manual country
and appearance preferences are saved locally. Passport choices stay in memory.
Explicit links override detection. No external geolocation vendor is contacted.

MAP LICENCE / TERRITORY
Natural Earth data is public domain. Borders are generalised; enlarged dots
keep small jurisdictions selectable. Disputed borders express no political
position. Territories do not automatically inherit sovereign treaty records.
