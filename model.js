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
const pairIndex=new Map(),cache=new Map();
for(const t of data.treaties){const cs=codes(t);for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++)if(applies(t,cs[i],cs[j])){const k=key(cs[i],cs[j]);if(!pairIndex.has(k))pairIndex.set(k,[]);pairIndex.get(k).push(t);}}
function relation(a,b){
 const cacheKey=key(a,b);if(cache.has(cacheKey))return cache.get(cacheKey);
 const all=(pairIndex.get(key(a,b))||[]).map(t=>{
  let status=t.status;
  let replacement=null;
  if(activeStatuses.has(status)&&t.effectiveDate&&t.effectiveDate>data.referenceDate)status='not-yet-in-force';
  for(const c of [a,b]){if(t.members?.[c]?.effectiveDate>data.referenceDate)status='not-yet-in-force';if(t.members?.[c]?.status&&!activeStatuses.has(t.members[c].status))status=t.members[c].status;}
  if((t.excludedPairs||[]).some(p=>key(...p)===key(a,b)))status='unverified';
  if(activeStatuses.has(status))for(const rule of t.supersededFor||[])if(matchesRule(rule,a,b)){status='superseded';replacement=rule.by;}
  return {t,status,replacement};
 });
 const active=all.filter(r=>activeStatuses.has(r.status));
 const negative=(data.negatives||[]).find(n=>key(...n.countries)===key(a,b));
 const formal=active.some(r=>['bilateral','multilateral'].includes(r.t.type));
 const result={all,active,negative,state:a===b?'selected':formal?'verified':active.length?'alternative':negative?'no-treaty':'unknown'};
 cache.set(cacheKey,result);return result;
}
const countries=window.MAP_DATA.countries;
const byCode=Object.fromEntries(countries.map(c=>[c.code,c]));
const states=countries.filter(c=>c.un);
const typeNames={bilateral:'Bilateral treaty',multilateral:'Multilateral convention',surrender:'Surrender mechanism',arrangement:'Other arrangement'};
const statusNames={'domestic-basis':'Domestic basis only (one way)','in-force':'In force',applicable:'Applicable',superseded:'Superseded for ordinary requests',suspended:'Suspended',terminated:'Terminated',unverified:'Unverified','not-yet-in-force':'Not yet in force','entry-into-force-unverified':'Entry into force unverified'};
const stateNames={selected:'Selected country',verified:'Verified treaty relationship',alternative:'Separate surrender / other arrangement','no-treaty':'Verified absence of a general treaty / arrangement',unknown:'Insufficient or unverified information'};
const aliases={GB:['UK','Britain','Great Britain'],US:['USA','United States of America','America'],AE:['UAE','Emirates'],CZ:['Czechia'],TR:['Türkiye','Turkey'],VA:['Vatican','Vatican City','Holy See'],KR:['South Korea'],KP:['North Korea'],CI:['Ivory Coast'],SZ:['Swaziland'],CV:['Cape Verde'],MM:['Burma']};
const norm=x=>String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
function search(q){q=norm(q);return countries.filter(c=>norm([c.name,c.code,...(c.aliases||[]),...(aliases[c.code]||[])].join(' ')).includes(q));}
function resolve(q){const n=norm(q);return countries.find(c=>[c.name,c.code,...(c.aliases||[]),...(aliases[c.code]||[])].some(a=>norm(a)===n))?.code||null;}
const networkCache=new Map();
function network(code,sovereignOnly=false){
 const k=code+'-'+sovereignOnly;if(networkCache.has(k))return networkCache.get(k);
 const list=(sovereignOnly?states:countries).filter(c=>c.code!==code);
 const relationships=list.map(c=>({code:c.code,...relation(code,c.code)}));
 const partners=relationships.filter(r=>r.active.length).map(r=>r.code);
 const typePartners={};for(const type of Object.keys(typeNames))typePartners[type]=relationships.filter(r=>r.active.some(x=>x.t.type===type)).map(r=>r.code);
 const treatyPartners=relationships.filter(r=>r.active.some(x=>['bilateral','multilateral'].includes(x.t.type))).map(r=>r.code);
 const unknown=relationships.filter(r=>r.state==='unknown').length;
 const negative=relationships.filter(r=>r.state==='no-treaty').length;
 const result={code,partners,typePartners,treatyPartners,unknown,negative,total:list.length,relationships};networkCache.set(k,result);return result;
}
function statistics(){
 const covered=new Set();let active=0,negative=0,unknown=0,fullyVerified=0,sovereignPairs=0;
 for(let i=0;i<countries.length;i++)for(let j=i+1;j<countries.length;j++){
  const a=countries[i],b=countries[j],r=relation(a.code,b.code);
  if(r.active.length){active++;covered.add(a.code);covered.add(b.code);if(a.un&&b.un)sovereignPairs++;}
  else if(r.negative)negative++;else unknown++;
  if(data.pairReviews?.[key(a.code,b.code)]?.status==='complete')fullyVerified++;
 }
 return {active,negative,unknown,fullyVerified,sovereignPairs,covered:covered.size,jurisdictions:countries.length,states:states.length,total:countries.length*(countries.length-1)/2};
}
function comparison(a,b){
 const left=network(a,true),right=network(b,true),ls=new Set(left.partners),rs=new Set(right.partners);
 // Exclude the two comparison subjects from common/unique third-state lists.
 const third=c=>c!==a&&c!==b;
 return {left,right,shared:left.partners.filter(c=>rs.has(c)&&third(c)),leftOnly:left.partners.filter(c=>!rs.has(c)&&third(c)),rightOnly:right.partners.filter(c=>!ls.has(c)&&third(c)),mutual:relation(a,b)};
}
function rankings(){
 const items=states.map(c=>({country:c,network:network(c.code,true),coverage:data.countryCoverage?.[c.code]||{status:'partial'}}));
 const eligible=items.filter(x=>x.coverage.status==='complete'&&x.coverage.reviewedStates===states.length-1&&x.network.unknown===0);
 const sort=(a,b)=>b.network.partners.length-a.network.partners.length||a.country.name.localeCompare(b.country.name,'en');
 return {definitive:eligible.sort(sort),provisional:items.filter(x=>x.network.partners.length>0).sort(sort),unranked:items.filter(x=>x.network.partners.length===0)};
}
const name=c=>byCode[c]?.name||c;
function csv(code){
 const rows=[['Selected country','Selected ISO','Partner','Partner ISO','Instrument name','Official title transcribed','Type','Signature / adoption date','Instrument entry into force','Selected party effective date','Partner effective date','Status','Scope / qualifications','Official source URLs','Last verified']];
 for(const r of network(code).relationships)for(const x of r.active){const t=x.t;rows.push([name(code),code,name(r.code),r.code,t.name,t.officialTitle===false?'No':'Yes',typeNames[t.type],t.signatureDate||t.adoptionDate||'',t.effectiveDate||'',t.members?.[code]?.effectiveDate||'',t.members?.[r.code]?.effectiveDate||'',statusNames[x.status], [t.description,t.limitedScope,...(t.notes||[])].filter(Boolean).join(' | '),(t.sources||[]).map(id=>data.sources[id]?.url).filter(Boolean).join(' | '),t.verifiedAt||'']);}
 return '\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"').join(',')).join('\r\n');
}
function initialCountry(params,saved,detected){return resolve(params.get('country'))||resolve((params.get('compare')||'').split(',')[0])||resolve(saved)||resolve(detected)||'HU';}
window.TreatyModel={relation,codes,pairIndex,activeStatuses,countries,states,byCode,typeNames,statusNames,stateNames,norm,search,resolve,network,statistics,comparison,rankings,csv,initialCountry,name};
})();
