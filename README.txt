GLOBAL EXTRADITION TREATY MAP — 22 OCTOBER 2026

Open index.html in a modern browser, or publish this directory on any static host.
No build command, package manager, API keys, server, framework or external runtime dependency is required.

FILES
index.html — reference page
style.css — responsive, traditional styling
script.js — relationship engine, SVG rendering and controls
treaties.js — editable structured treaty data, sources and explicit research gaps
map-data.js — preprojected Natural Earth 1:50m political boundaries (public domain)
netlify.toml — static hosting configuration
validation.test.cjs — optional offline integrity checks (run with Node.js)

DATA COVERAGE
All 193 UN member states and both UN observers are supported, together with separately mapped jurisdictions. This is a partial research edition, not a definitive worldwide treaty register. Country-by-country coverage and gaps are displayed in the page. Research date records source access, not a certification of every legal change through that date. Older source vintages are disclosed per record.

Types: bilateral treaty; multilateral convention; surrender mechanism; other arrangement.
Blue: a recorded active basis. Yellow: unverified relationship. Grey: positive, narrowly scoped evidence of no general standing treaty/arrangement. Green: selected country.
Domestic one-way regulations alone do not generate blue. Signed-only and suspended records do not generate blue. Special mechanisms supersede older conventional provisions for ordinary requests, with older records retained in details.

NOT A PREDICTION OF EXTRADITION
Domestic law, reciprocity and offence-specific conventions can permit extradition without a general treaty. Nationality, human rights, reservations and procedural safeguards can prevent it despite a treaty. Practical operation, reservations, amendments, transitional cases and territorial extensions are not exhaustively researched. Each pair must be checked against its official sources for a real matter.

EDITING
Edit window.TREATY_DATA in treaties.js. Unknown dates are null; do not substitute signature, ratification, publication or access dates for entry into force. Official full titles not transcribed must have officialTitle:false. A missing record means unknown, never a verified negative. Multilateral members are stored once. cross-groups instruments apply only between groups. supersededFor rules identify the current ordinary route. negatives require a source and explicit scope.

MAP
Natural Earth public-domain boundaries:
https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson
Equal Earth projection is applied during preparation, with no mapping library at runtime.
Small states use enlarged point markers; Gibraltar is represented by an approximate location marker because no polygon is present in this map scale.
ISO alpha-2 codes link geography to data. Kosovo uses XK; unresolved geographical features have X-prefixed internal IDs. No sovereign treaty is automatically extended to separately identified territories. Generalised borders are not a statement on sovereignty.

HOSTING
Netlify: publish directory '.', leave build command empty. No functions, forms, databases or paid add-ons are used. Hosting/account limits remain those of the selected Netlify plan.
GitHub: repository contains the complete static site. No secrets are needed or included.
