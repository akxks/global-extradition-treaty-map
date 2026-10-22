/* Static, dependency-free relationship engine and user interface. */
(function () {
'use strict';
const data=window.TREATY_DATA;
const key=(a,b)=>[a,b].sort().join('|');
const activeStatuses=new Set(['in-force','applicable']);
function codes(t){return t.countries||Object.keys(t.members||{});}
function matchesRule(r,a,b){return r.bothIn ? r.bothIn.includes(a)&&r.bothIn.includes(b) : r.oneIn&&r.otherIn&&((r.oneIn.includes(a)&&r.otherIn.includes(b))||(r.oneIn.includes(b)&&r.otherIn.includes(a)));}
function applies(t,a,b){
 if(a===b||!codes(t).includes(a)||!codes(t).includes(b))return false;
 if(t.pairMode==='cross-groups'&&!((t.groups[0].includes(a)&&t.groups[1].includes(b))||(t.groups[0].includes(b)&&t.groups[1].includes(a))))return false;
 return true;
}
const pairIndex=new Map();
for(const t of data.treaties){const cs=codes(t);for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++)if(applies(t,cs[i],cs[j])){const k=key(cs[i],cs[j]);if(!pairIndex.has(k))pairIndex.set(k,[]);pairIndex.get(k).push(t);}}
function relation(a,b){
 const all=(pairIndex.get(key(a,b))||[]).map(t=>{
  let status=t.status;
  let replacement=null;
  if(activeStatuses.has(status)&&t.effectiveDate&&t.effectiveDate>data.referenceDate)status='not-yet-in-force';
  for(const c of [a,b])if(t.members?.[c]?.effectiveDate>data.referenceDate)status='not-yet-in-force';
  if((t.excludedPairs||[]).some(p=>key(...p)===key(a,b)))status='unverified';
  if(activeStatuses.has(status))for(const rule of t.supersededFor||[])if(matchesRule(rule,a,b)){status='superseded';replacement=rule.by;}
  return {t,status,replacement};
 });
 const active=all.filter(r=>activeStatuses.has(r.status));
 const negative=(data.negatives||[]).find(n=>key(...n.countries)===key(a,b));
 return {all,active,negative,state:a===b?'selected':active.length?'verified':negative?'no-treaty':'unknown'};
}
window.TreatyModel={relation,codes,pairIndex};
if(typeof document==='undefined')return;
const countries=window.MAP_DATA.countries;
const byCode=Object.fromEntries(countries.map(c=>[c.code,c]));
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=x=>x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const typeNames={bilateral:'Bilateral treaty',multilateral:'Multilateral convention',surrender:'Surrender mechanism',arrangement:'Other arrangement'};
const statusNames={'domestic-basis':'Domestic basis only (one way)','in-force':'In force',applicable:'Applicable','superseded':'Superseded for ordinary requests',suspended:'Suspended',terminated:'Terminated','unverified':'Unverified','not-yet-in-force':'Not yet in force','entry-into-force-unverified':'Entry into force unverified'};
const stateNames={selected:'Selected country',verified:'Verified legal basis','no-treaty':'No general treaty / arrangement verified',unknown:'Unverified relationship'};
const fmt=v=>!v?'Not verified in this dataset':/^\d{4}-\d{2}-\d{2}$/.test(v)?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(v+'T00:00:00Z')):v;
const name=c=>byCode[c]?.name||c;
const options=cs=>cs.map(c=>`<option value="${esc(c.code)}">${esc(c.name)}</option>`).join('');
const sourceLink=s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title||'Official source')}</a>`;
let selected=byCode[new URLSearchParams(location.search).get('country')]?.code||'HU';
let partner=null,rows=[];
function fillSelector(query=''){
 const q=norm(query.trim());const result=countries.filter(c=>!q||norm([c.name,c.code,...c.aliases].join(' ')).includes(q));
 $('country-selector').innerHTML=options(result);$('country-selector').value=selected;
 if(result.length&&!result.some(c=>c.code===selected))$('country-selector').selectedIndex=0;
 $('search-status').textContent=q?`${result.length} matching countries. Choose one or press Enter.`:'';
 return result;
}
function selectCountry(code){
 if(!byCode[code])return;
 selected=code;partner=null;fillSelector();$('country-search').value='';$('table-search').value='';
 const url=new URL(location.href);url.searchParams.set('country',selected);history.replaceState(null,'',url);
 const relations=new Map(countries.map(c=>[c.code,relation(selected,c.code)]));
 document.querySelectorAll('#world-map [data-code]').forEach(el=>{const c=el.dataset.code,s=relations.get(c)?.state||'unknown';el.setAttribute('class',s);el.setAttribute('aria-label',`${name(c)} — ${stateNames[s]}`);el.querySelector('title').textContent=`${name(c)} — ${stateNames[s]}`;});
 $('map-title').textContent=`Treaty relationships of ${name(selected)}`;
 $('summary-title').textContent=`Extradition treaties of ${name(selected)}`;
 rows=[];for(const c of countries)for(const r of relations.get(c.code).active)rows.push({code:c.code,...r});
 const partners=new Set(rows.map(r=>r.code));const treatyPartners=new Set(rows.filter(r=>['bilateral','multilateral'].includes(r.t.type)).map(r=>r.code));
 const countType=type=>new Set(rows.filter(r=>r.t.type===type).map(r=>type==='bilateral'?r.t.id:r.code)).size;
 const summary=[['Country',name(selected)],['Verified treaty partners',treatyPartners.size],['All verified partners',partners.size],['Bilateral treaties',countType('bilateral')],['Multilateral treaty relationships',countType('multilateral')],['Surrender mechanism partners',countType('surrender')],['Other arrangement partners',countType('arrangement')],['Unverified relationships',countries.filter(c=>c.code!==selected&&relations.get(c.code).state==='unknown').length],['Last researched','22 October 2026']];
 $('summary').innerHTML=summary.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
 $('country-note').textContent=(data.countryNotes?.[selected]||'This is a partial inventory. A country absent from the verified table has not been established to have no treaty. Check the official sources before relying on an individual relationship.');
 renderTable();renderRelationship();
}
function renderTable(){
 const q=norm($('table-search').value.trim());const filtered=rows.filter(r=>norm(name(r.code)+' '+r.t.name+' '+(r.t.displayName||'')+' '+typeNames[r.t.type]).includes(q));
 filtered.sort((a,b)=>name(a.code).localeCompare(name(b.code),'en')||a.t.name.localeCompare(b.t.name,'en'));
 $('treaty-rows').innerHTML=filtered.map(r=>`<tr><td><button class="text-link" data-partner="${esc(r.code)}">${esc(name(r.code))}</button></td><td>${esc(r.t.displayName||r.t.name)}${r.t.officialTitle===false?'<span class="status-note">Descriptive label; official title not transcribed.</span>':''}${r.t.limitedScope?'<span class="status-note">Limited scope — see details.</span>':''}</td><td>${esc(typeNames[r.t.type]||r.t.type)}</td><td>${esc(statusNames[r.status]||r.status)}</td></tr>`).join('');
 $('empty-table').hidden=filtered.length>0;$('table-count').textContent=`${new Set(filtered.map(r=>r.code)).size} partners · ${filtered.length} agreement relationships shown`;
}
function detailsMarkup(r){
 const t=r.t;const sources=(t.sources||[]).map(id=>data.sources[id]).filter(Boolean);
 const members=[selected,partner].map(c=>t.members?.[c]?`<dt>${esc(name(c))}: applicable dates</dt><dd>${esc(t.members[c].effectiveDate?fmt(t.members[c].effectiveDate):'See implementation dates and source')}${t.members[c].nationalLegislationDates?'<br>National legislation: '+t.members[c].nationalLegislationDates.map(fmt).map(esc).join('; '):''}${t.members[c].signatureDate?'<br>Signature: '+esc(fmt(t.members[c].signatureDate)):''}</dd>`:'').join('');
 const notes=(t.notes||[]).filter(Boolean);
 const catalogue=(t.catalogueInstruments||[]).length>1?'<details><summary>Additional entries in the official treaty catalogue</summary><p class="subtle">The source lists these instruments and dates. Supplements and historical entries are not independently counted as current treaties.</p><ul>'+t.catalogueInstruments.map(c=>'<li>'+esc(c.citation||'Citation not recorded')+' — signed: '+esc(c.signedAsListed||'not recorded')+'; entered into force as listed: '+esc(c.effectiveAsListed||'not recorded')+'</li>').join('')+'</ul></details>':'';
 return `<article class="agreement"><h3>${esc(t.displayName||t.name)}</h3><dl><dt>${t.officialTitle===false?'Title verification':'Official treaty / instrument name'}</dt><dd>${t.officialTitle===false?'The official source confirms the relationship; the complete instrument title has not been transcribed.':esc(t.name)}</dd><dt>Type</dt><dd>${esc(typeNames[t.type]||t.type)}</dd><dt>Signed${t.adoptionDate?' / adopted':''}</dt><dd>${esc(fmt(t.signatureDate||t.adoptionDate))}${t.adoptionDate?' (adoption)':''}</dd><dt>Entered into force</dt><dd>${esc(fmt(t.effectiveDate))}${t.type==='multilateral'||t.type==='surrender'?' (instrument; see country dates below)':''}</dd>${t.provisionalApplicationDate?`<dt>Provisionally applied</dt><dd>${esc(fmt(t.provisionalApplicationDate))}</dd>`:''}${members}<dt>Current status</dt><dd>${esc(statusNames[r.status]||r.status)}${r.replacement?' — see '+esc(data.treaties.find(x=>x.id===r.replacement)?.name||r.replacement):''}</dd><dt>Legal basis</dt><dd>${esc(t.description)}</dd>${t.limitedScope?`<dt>Scope</dt><dd>${esc(t.limitedScope)}</dd>`:''}<dt>Official source${sources.length>1?'s':''}</dt><dd>${sources.map(sourceLink).join('<br>')}</dd><dt>Source vintage</dt><dd>${esc(t.sourceDate||sources.map(s=>s.statusDate||s.published).filter(Boolean).join('; ')||'Not dated by publisher; source accessed on research date')}</dd><dt>Last researched</dt><dd>${esc(fmt(t.verifiedAt))}</dd></dl>${notes.map(n=>`<p class="subtle">${esc(n)}</p>`).join('')}${catalogue}</article>`;
}
function renderRelationship(){
 $('relationship-title').textContent=partner?`Extradition relationship: ${name(selected)} — ${name(partner)}`:'Relationship details';
 let html=`<form id="pair-form"><label for="partner-selector">Inspect any relationship </label><select id="partner-selector"><option value="">Choose a partner</option>${options(countries.filter(c=>c.code!==selected))}</select> <button type="submit">View relationship</button></form>`;
 if(!partner)html+='<p>Select a blue country or a partner in the table to inspect the legal basis and official sources.</p>';
 else {
  const rel=relation(selected,partner);
  html+=`<p><button class="text-link" data-select="${esc(partner)}">Select ${esc(name(partner))} as the main country</button></p>`;
  if(rel.negative&&!rel.active.length)html+=`<p class="note"><strong>No general treaty / arrangement verified.</strong> ${esc(rel.negative.description)} This does not rule out case-specific extradition or offence-specific conventions. ${sourceLink(data.sources[rel.negative.source])}</p>`;
  if(!rel.active.length&&!rel.negative)html+='<p class="note"><strong>Unverified relationship.</strong> This dataset does not establish a currently applicable legal basis for this pair. This is a research gap, not a finding that no treaty exists.</p>';
  if(rel.active.length)html+='<p>These records establish a legal basis within the stated scope. Individual requests remain subject to applicable safeguards, reservations and domestic law.</p>';
  html+=rel.active.map(detailsMarkup).join('');
  const inactive=rel.all.filter(r=>!activeStatuses.has(r.status));
  if(inactive.length)html+='<h3>Other recorded instruments</h3><p class="subtle">Excluded from the active table and partner counts.</p>'+inactive.map(detailsMarkup).join('');
 }
 $('relationship-content').innerHTML=html;$('partner-selector').value=partner||'';
 $('pair-form').addEventListener('submit',e=>{e.preventDefault();if($('partner-selector').value)showPartner($('partner-selector').value,false);});
}
function showPartner(code,scroll=true){partner=code;renderRelationship();if(scroll){$('relationship').scrollIntoView({behavior:'instant',block:'start'});$('relationship').focus({preventScroll:true});}}
function mapClick(code){if(code===selected)return;if(relation(selected,code).active.length)showPartner(code);else selectCountry(code);}
const svg=$('world-map'),ns='http://www.w3.org/2000/svg';
for(const s of window.MAP_DATA.shapes){const el=document.createElementNS(ns,'path');el.setAttribute('d',s.d);el.dataset.code=s.code;el.setAttribute('tabindex','0');el.setAttribute('role','button');el.append(document.createElementNS(ns,'title'));$('countries').append(el);}
for(const c of countries.filter(c=>c.small&&c.center)){const el=document.createElementNS(ns,'circle');el.dataset.code=c.code;el.setAttribute('cx',c.center[0]);el.setAttribute('cy',c.center[1]);el.setAttribute('r','2.8');el.setAttribute('tabindex','0');el.setAttribute('role','button');el.append(document.createElementNS(ns,'title'));$('small-countries').append(el);}
let box=[0,0,1200,570];let drag=null,dragged=false;
function setBox(v){box=v;svg.setAttribute('viewBox',v.join(' '));}
function zoom(f){const w=Math.max(100,Math.min(1800,box[2]*f)),h=box[3]*(w/box[2]);setBox([box[0]+(box[2]-w)/2,box[1]+(box[3]-h)/2,w,h]);}
const regions={world:[0,0,1200,570],europe:[538,36,235,155],caribbean:[302,183,210,135],africa:[445,155,360,280],asia:[705,55,475,340],pacific:[900,250,300,220],americas:[70,65,510,460]};
$('region').addEventListener('change',e=>setBox(regions[e.target.value].slice()));$('reset-map').addEventListener('click',()=>{$('region').value='world';setBox(regions.world.slice());});$('zoom-in').addEventListener('click',()=>zoom(.7));$('zoom-out').addEventListener('click',()=>zoom(1/.7));
svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,box:box.slice()};dragged=false;svg.setPointerCapture(e.pointerId);$('map-tooltip').hidden=true;});
svg.addEventListener('pointermove',e=>{
 if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5){dragged=true;const rect=svg.getBoundingClientRect();const scale=Math.max(box[2]/rect.width,box[3]/rect.height);setBox([drag.box[0]-dx*scale,drag.box[1]-dy*scale,box[2],box[3]]);$('map-tooltip').hidden=true;}}
 else {const hit=e.target.closest('[data-code]');if(hit){const c=hit.dataset.code;const rect=$('map-container').getBoundingClientRect();const tip=$('map-tooltip');tip.textContent=`${name(c)} — ${stateNames[relation(selected,c).state]}`;tip.hidden=false;tip.style.left=Math.min(e.clientX-rect.left+12,Math.max(0,rect.width-260))+'px';tip.style.top=Math.max(0,e.clientY-rect.top-38)+'px';}else $('map-tooltip').hidden=true;}
});
svg.addEventListener('pointerup',e=>{if(drag&&!dragged){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('#world-map [data-code]');if(target)mapClick(target.dataset.code);}drag=null;});svg.addEventListener('pointercancel',()=>{drag=null;});svg.addEventListener('pointerleave',()=>{$('map-tooltip').hidden=true;});
svg.addEventListener('keydown',e=>{const hit=e.target.closest('[data-code]');if(hit&&['Enter',' '].includes(e.key)){e.preventDefault();mapClick(hit.dataset.code);}});
$('country-selector').addEventListener('change',e=>selectCountry(e.target.value));$('country-search').addEventListener('input',e=>{const results=fillSelector(e.target.value);const exact=results.find(c=>norm(c.name)===norm(e.target.value));if(exact)selectCountry(exact.code);});$('country-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const results=fillSelector(e.target.value);if(results.length){const exact=results.find(c=>c.code.toLowerCase()===e.target.value.trim().toLowerCase());selectCountry(exact?.code||$('country-selector').value||results[0].code);}}});$('clear-search').addEventListener('click',()=>{$('country-search').value='';fillSelector();$('country-search').focus();});$('table-search').addEventListener('input',renderTable);
document.addEventListener('click',e=>{const p=e.target.closest('[data-partner]');if(p)showPartner(p.dataset.partner);const s=e.target.closest('[data-select]');if(s){selectCountry(s.dataset.select);$('country-selector').scrollIntoView({behavior:'instant'});}});
const covered=new Set(),uniquePairs=new Set();for(const [k] of pairIndex){const [a,b]=k.split('|');if(relation(a,b).active.length){covered.add(a);covered.add(b);uniquePairs.add(k);}}
$('coverage').textContent=`${uniquePairs.size.toLocaleString('en-GB')} verified country pairs in this dataset.`;
$('global-statistics').textContent=`${countries.length} countries and jurisdictions are selectable, including all 195 UN member and observer states. ${covered.size} have at least one verified relationship; ${uniquePairs.size.toLocaleString('en-GB')} unique pairs have a recorded active basis. No country's complete treaty network is certified. Yellow pairs have not received a conclusive exhaustive legal review.`;
$('research-gaps').innerHTML=data.gaps.map(x=>`<li>${esc(x)}</li>`).join('');
$('coverage-index').innerHTML=countries.map(c=>`<div><button class="text-link" data-select="${esc(c.code)}">${esc(c.name)}</button>: ${covered.has(c.code)?'records found; partial':'no active records; incomplete'}</div>`).join('');
$('source-list').innerHTML=Object.values(data.sources).filter(s=>s.featured).map(s=>`<li>${sourceLink(s)}${s.statusDate||s.published?' — '+esc(s.statusDate||s.published):''}</li>`).join('');
selectCountry(selected);
})();
