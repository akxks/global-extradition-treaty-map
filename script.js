/* Dependency-free application. All legal classifications come from model.js. */
(function(){
'use strict';
const M=window.TreatyModel,R=window.TreatyRender,D=window.TREATY_DATA,N=window.RESEARCH_DATA;
const {relation,countries,byCode,typeNames,statusNames,stateNames,norm,name}=M;
const {esc,fmt,sourceLink}=R;
const $=id=>document.getElementById(id);
const options=cs=>cs.map(c=>`<option value="${esc(c.code)}">${esc(c.name)}</option>`).join('');
const storage={get(k){try{return localStorage.getItem(k);}catch(_){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(_){}},remove(k){try{localStorage.removeItem(k);}catch(_){}}};
const params=new URLSearchParams(location.search),saved=storage.get('extradition-country');
let selected=M.initialCountry(params,saved,null),partner=null,rows=[],selectionVersion=0,legalReady=false;
function fillSelector(query=''){
 const result=M.search(query);$('country-selector').innerHTML=options(result);$('country-selector').value=selected;
 if(result.length&&!result.some(c=>c.code===selected))$('country-selector').selectedIndex=0;
 $('search-status').textContent=query?`${result.length} matching countries. Choose one or press Enter.`:'';return result;
}
function updateUrl(){const url=new URL(location.href);url.searchParams.set('country',selected);if(partner)url.searchParams.set('partner',partner);else url.searchParams.delete('partner');history.replaceState(null,'',url);}
function selectCountry(code,manual=true){
 if(!byCode[code])return;selectionVersion++;selected=code;partner=null;
 if(manual){storage.set('extradition-country',code);$('location-status').textContent='Your selected country is remembered on this device. Use “Use my detected country” to reset it.';}
 fillSelector();$('country-search').value='';$('table-search').value='';$('legal-search').value='';legalReady=false;
 const n=M.network(selected),relations=new Map(n.relationships.map(r=>[r.code,r]));
 document.querySelectorAll('#world-map [data-code]').forEach(el=>{const c=el.dataset.code,s=c===selected?'selected':relations.get(c)?.state||'unknown';el.setAttribute('class',s);el.setAttribute('aria-label',`${name(c)} — ${stateNames[s]}`);el.querySelector('title').textContent=`${name(c)} — ${stateNames[s]}`;});
 $('map-title').textContent=`Treaty relationships of ${name(selected)}`;$('summary-title').textContent=`${name(selected)} — Extradition Treaty Overview`;
 $('quick-overview').innerHTML='<strong>'+esc(name(selected))+'</strong>: '+n.partners.length+' verified partners · '+n.unknown+' unverified relationships. <a href="#country-summary">Read the simple overview</a>';
 $('summary').innerHTML=R.summary(selected);$('overview-text').textContent=R.overview(selected);
 $('country-note').textContent=D.countryNotes?.[selected]||'This is a partial inventory. Countries missing from the verified list have not been established to have no treaty. Consult the official sources and qualifications.';
 $('profile-link').hidden=!N.profiles[selected];$('profile-link').href='/countries/'+R.slug(selected)+'/';
 rows=[];for(const r of n.relationships)for(const x of r.active)rows.push({code:r.code,...x});
 updateUrl();renderTable();renderRelationship();if($('country-legal').open)renderLegal();else $('country-legal-records').replaceChildren();
}
function renderTable(){
 const q=norm($('table-search').value);const filtered=rows.filter(r=>norm(name(r.code)+' '+r.t.name+' '+(r.t.displayName||'')+' '+typeNames[r.t.type]).includes(q));
 filtered.sort((a,b)=>name(a.code).localeCompare(name(b.code),'en')||a.t.name.localeCompare(b.t.name,'en'));
 $('treaty-rows').innerHTML=filtered.map(r=>`<tr data-table-partner="${esc(r.code)}"><td><button class="text-link" data-partner="${esc(r.code)}">${esc(name(r.code))}</button></td><td>${esc(r.t.displayName||r.t.name)}${r.t.officialTitle===false?'<span class="status-note">Incomplete: official title not transcribed.</span>':''}${r.t.limitedScope?'<span class="status-note">Scope qualification — inspect details.</span>':''}</td><td>${esc(typeNames[r.t.type])}</td><td>${esc(statusNames[r.status])}</td></tr>`).join('');
 $('empty-table').hidden=filtered.length>0;$('table-count').textContent=`${new Set(filtered.map(r=>r.code)).size} partners · ${filtered.length} applicable instrument relationships shown`;
}
function renderLegal(){
 const q=norm($('legal-search').value),groups=new Map();
 for(const r of M.network(selected).relationships)for(const x of r.all){if(!groups.has(x.t.id))groups.set(x.t.id,{record:x,activePartners:[]});if(M.activeStatuses.has(x.status)){groups.get(x.t.id).record=x;groups.get(x.t.id).activePartners.push(r.code);}}
 const filtered=[...groups.values()].filter(g=>norm(JSON.stringify(g.record.t)).includes(q));
 $('country-legal-records').innerHTML=filtered.map(g=>`<div><p class="subtle">${g.activePartners.length?'Applicable in this dataset with: '+g.activePartners.map(c=>`<button class="text-link" data-partner="${esc(c)}">${esc(name(c))}</button>`).join(', '):'Excluded from active partner counts.'} Status may differ by partner; inspect a relationship for replacement rules.</p>${R.instrument(g.record,selected,null).replace('id="record-','id="country-record-')}</div>`).join('')||'<p>No legal records match this search.</p>';
 $('legal-count').textContent=`${filtered.length} instrument records shown, including inactive and incomplete records.`;legalReady=true;
}
function renderRelationship(){
 $('relationship-title').textContent=partner?`Extradition relationship: ${name(selected)} — ${name(partner)}`:'Relationship details';
 let html=`<form id="pair-form"><label for="partner-selector">Inspect any relationship </label><select id="partner-selector"><option value="">Choose a partner</option>${options(countries.filter(c=>c.code!==selected))}</select> <button type="submit">View relationship</button></form>`;
 if(!partner)html+='<p>Select a blue or purple country, or a partner in the table, to see the legal basis and official sources.</p>';
 else{const rel=relation(selected,partner);html+=`<p><button class="text-link" data-select="${esc(partner)}">Select ${esc(name(partner))} as the main country</button></p>`;
 if(rel.negative&&!rel.active.length)html+=`<p class="note"><strong>Verified absence of a general treaty / arrangement.</strong> ${esc(rel.negative.description)} This does not rule out case-specific extradition or offence-specific conventions. ${sourceLink(D.sources[rel.negative.source])}</p>`;
 if(!rel.active.length&&!rel.negative)html+='<p class="note"><strong>Unverified relationship.</strong> No currently applicable basis is established in this dataset for this pair. This is a research gap, not a finding that no treaty exists.</p>';
 if(rel.active.length)html+='<p>These records establish a legal basis within the stated scope. Safeguards, reservations, nationality rules and domestic law can still restrict an individual request.</p>';
 html+=rel.active.map(r=>R.instrument(r,selected,partner).replace('id="record-','id="pair-record-')).join('');
 const inactive=rel.all.filter(r=>!M.activeStatuses.has(r.status));if(inactive.length)html+='<h3>Other recorded instruments</h3><p class="subtle">Excluded from active partner counts.</p>'+inactive.map(r=>R.instrument(r,selected,partner).replace('id="record-','id="pair-record-')).join('');}
 $('relationship-content').innerHTML=html;$('partner-selector').value=partner||'';$('pair-form').addEventListener('submit',e=>{e.preventDefault();if($('partner-selector').value)showPartner($('partner-selector').value,false);});
}
function showPartner(code,scroll=true){if(code===selected||!byCode[code])return;partner=code;renderRelationship();updateUrl();if(scroll){$('relationship').scrollIntoView({behavior:'instant',block:'start'});$('relationship').focus({preventScroll:true});}}
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
$('country-selector').addEventListener('change',e=>selectCountry(e.target.value));
$('country-search').addEventListener('input',e=>{const q=e.target.value;fillSelector(q);const exact=countries.find(c=>norm(c.name)===norm(q));if(exact)selectCountry(exact.code);});
$('country-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const result=fillSelector(e.target.value);const exact=M.resolve(e.target.value);if(exact||result.length)selectCountry(exact||$('country-selector').value||result[0].code);}});
$('clear-search').addEventListener('click',()=>{$('country-search').value='';fillSelector();$('country-search').focus();});$('table-search').addEventListener('input',renderTable);
$('country-legal').addEventListener('toggle',()=>{if($('country-legal').open&&!legalReady)renderLegal();});$('legal-search').addEventListener('input',renderLegal);
document.addEventListener('click',e=>{const p=e.target.closest('[data-partner]');if(p)showPartner(p.dataset.partner);const s=e.target.closest('[data-select]');if(s){selectCountry(s.dataset.select);$('country-selector').scrollIntoView({behavior:'instant'});}});
function renderSources(){const q=norm($('source-search').value);$('source-list').innerHTML=Object.values(D.sources).filter(s=>norm(s.title+' '+s.url).includes(q)).map(s=>`<li>${sourceLink(s)}${s.statusDate||s.published?' — source dated '+esc(s.statusDate||s.published):''}</li>`).join('');}
$('source-search').addEventListener('input',renderSources);renderSources();
$('coverage-index').innerHTML=countries.map(c=>`<div><button class="text-link" data-select="${esc(c.code)}">${esc(c.name)}</button>: ${M.network(c.code).partners.length||'no'} documented partners; partial</div>`).join('');
const ranking=M.rankings();$('largest-ranking').innerHTML=R.rankingTable(ranking.provisional);$('smallest-ranking').innerHTML=R.rankingTable(ranking.definitive,10,true);$('provisional-smallest').innerHTML=R.rankingTable(ranking.provisional,10,true);
async function copyLink(url,status){try{await navigator.clipboard.writeText(url);$(status).textContent='Link copied.';}catch(_){$(status).innerHTML=`Copy this link: <a href="${esc(url)}">${esc(url)}</a>`;}}
$('share-country').addEventListener('click',()=>copyLink(location.origin+'/?country='+selected+ (partner?'&partner='+partner:''),'share-status'));
$('export-csv').addEventListener('click',()=>{const blob=new Blob([M.csv(selected)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`extradition-${selected}-${D.referenceDate}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
// Comparisons count only UN member and observer states, not dependent territories.
for(const id of ['compare-a','compare-b','passport-selector'])$(id).innerHTML=options(id==='passport-selector'?M.states:countries);
const comparisonParams=(params.get('compare')||'').split(',');$('compare-a').value=M.resolve(comparisonParams[0])||selected;$('compare-b').value=M.resolve(comparisonParams[1])||($('compare-a').value==='GB'?'US':'GB');
function comparisonSources(a,b,cs){return cs.map(c=>{const record=relation(a,c).active;return `<li>${R.countryLink(c)}<br><span class="subtle">${record.map(x=>esc(typeNames[x.t.type])+': '+esc(x.t.displayName||x.t.name)+' — '+(x.t.sources||[]).map(id=>sourceLink(D.sources[id])).join('; ')).join('<br>')}${b?'<br>'+esc(name(b))+': '+relation(b,c).active.map(x=>esc(typeNames[x.t.type])+': '+esc(x.t.displayName||x.t.name)+' — '+(x.t.sources||[]).map(id=>sourceLink(D.sources[id])).join('; ')).join('<br>'):''}</span></li>`;}).join('');}
function renderComparison(update=true){
 const a=$('compare-a').value,b=$('compare-b').value;
 if(a===b){$('comparison-result').innerHTML='<p class="note">Choose two different countries to compare.</p>';return;}
 const c=M.comparison(a,b),metrics=[['Verified state partners',c.left.partners.length,c.right.partners.length],['Bilateral treaty partners',c.left.typePartners.bilateral.length,c.right.typePartners.bilateral.length],['Multilateral treaty partners',c.left.typePartners.multilateral.length,c.right.typePartners.multilateral.length],['Surrender mechanism partners',c.left.typePartners.surrender.length,c.right.typePartners.surrender.length],['Other arrangement partners',c.left.typePartners.arrangement.length,c.right.typePartners.arrangement.length],['Unverified state relationships',c.left.unknown,c.right.unknown]];
 $('comparison-result').innerHTML=`<h3>${esc(name(a))} and ${esc(name(b))}</h3><div class="table-scroll"><table><thead><tr><th>Documented network</th><th>${esc(name(a))}</th><th>${esc(name(b))}</th></tr></thead><tbody>${metrics.map(r=>'<tr>'+r.map((v,i)=>i?'<td>'+esc(v)+'</td>':'<th scope="row">'+esc(v)+'</th>').join('')+'</tr>').join('')}</tbody></table></div><p><strong>${c.shared.length} shared third-state partners</strong> · ${c.leftOnly.length} only documented for ${esc(name(a))} · ${c.rightOnly.length} only documented for ${esc(name(b))}.</p><p class="subtle">Both inventories are partial. The two selected subjects are excluded from shared/unique third-state lists. A mutual relationship, where verified, is still included in each total.</p>${[[`Shared partners (${c.shared.length})`,c.shared,a,b],[`Only documented for ${name(a)} (${c.leftOnly.length})`,c.leftOnly,a,null],[`Only documented for ${name(b)} (${c.rightOnly.length})`,c.rightOnly,b,null]].map(([title,cs,x,y])=>`<details><summary>${esc(title)} — agreements and sources</summary><ul class="source-list">${comparisonSources(x,y,cs)||'<li>No documented partners in this category.</li>'}</ul></details>`).join('')}`;
 if(update){const url=new URL(location.href);url.searchParams.set('compare',a+','+b);url.hash='comparison';history.replaceState(null,'',url);}
}
$('comparison-form').addEventListener('submit',e=>{e.preventDefault();renderComparison();});$('share-comparison').addEventListener('click',()=>{if($('compare-a').value===$('compare-b').value){$('comparison-status').textContent='Choose two different countries first.';return;}renderComparison();copyLink(location.origin+'/?country='+$('compare-a').value+'&compare='+$('compare-a').value+','+$('compare-b').value+'#comparison','comparison-status');});renderComparison(false);
const passports=new Set();
function renderPassports(){
 $('passport-list').innerHTML=[...passports].map(c=>`<li>${esc(name(c))} <button type="button" data-remove-passport="${esc(c)}" aria-label="Remove ${esc(name(c))} nationality">Remove</button></li>`).join('');
 $('passport-results').innerHTML=[...passports].map(c=>{const p=N.nationality[c];return `<article class="agreement"><h3>${esc(name(c))}: nationality rules</h3>${p?`<p>${esc(p.summary)}</p><p class="note">${esc(p.context||'This rule concerns a request made to this state. Nationality is not a guarantee against extradition from another jurisdiction.')}</p><details><summary>Legal rules, exceptions and official sources</summary>${(p.rules||[]).map(x=>'<p>'+esc(typeof x==='string'?x:x.rule||JSON.stringify(x))+'</p>').join('')}<p>${esc(R.text(p.exceptions))}</p><p>${esc(R.text(p.qualifications))}</p><p>${esc(p.legalBasis||'See the cited provisions.')}</p><ul class="source-list">${(p.sources||[]).map(s=>'<li>'+sourceLink(typeof s==='string'?{url:s,title:'Official law / government source'}:s)+'</li>').join('')}</ul><p class="subtle">Last verification recorded: ${esc(fmt(p.verifiedAt))}. Changes and the facts of a case can affect the result.</p></details>`:'<p class="note">Unverified: nationality restrictions and exceptions for this jurisdiction have not yet been researched in this feature. No conclusion about protection from extradition can be drawn.</p>'}</article>`;}).join('');
}
$('passport-form').addEventListener('submit',e=>{e.preventDefault();passports.add($('passport-selector').value);renderPassports();});$('passport-list').addEventListener('click',e=>{const b=e.target.closest('[data-remove-passport]');if(b){passports.delete(b.dataset.removePassport);renderPassports();}});
async function detectCountry(force=false){
 if(force){storage.remove('extradition-country');selectionVersion++;}const version=selectionVersion;
 $('location-status').textContent='Detecting an approximate country through this website’s host…';const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
 try{const response=await fetch('/country.json',{cache:'no-store',credentials:'omit',signal:controller.signal});if(!response.ok)throw new Error('unavailable');const result=await response.json();const code=M.resolve(result.country);
 if(version!==selectionVersion)return;
 if(!code){$('location-status').textContent='Country detection is unavailable. Choose a country above; the map is fully functional.';return;}
 selectCountry(code,false);$('location-status').textContent=`Approximate detected country: ${name(code)}. This may reflect a VPN or network location. You can change it above.`;
 }catch(_){if(version===selectionVersion)$('location-status').textContent='Country detection could not complete. Choose a country above; no location permission is needed.';}finally{clearTimeout(timer);}
}
$('detect-country').addEventListener('click',()=>detectCountry(true));
selectCountry(selected,false);const initialPartner=M.resolve(params.get('partner'));if(initialPartner)showPartner(initialPartner,false);
if(M.resolve(params.get('country'))||M.resolve(comparisonParams[0]))$('location-status').textContent='Country chosen by this shared link. IP detection will not override it.';
else if(M.resolve(saved))$('location-status').textContent='Using your saved country preference. IP detection will not override it.';
else detectCountry();
})();
