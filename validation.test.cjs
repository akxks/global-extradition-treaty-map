/* Optional data/engine validation. Runtime site has no Node dependency. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};vm.createContext(ctx);
for(const f of ['map-data.js','treaties.js','research.js','model.js','render.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),ctx);
const {MAP_DATA:map,TREATY_DATA:data,TreatyModel:model}=ctx.window;
const countries=new Set(map.countries.map(c=>c.code));
assert.equal(map.countries.filter(c=>c.un).length,195);
assert.equal(countries.size,map.countries.length);
const ids=new Set();let dateFields=0;
for(const t of data.treaties){
 assert(!ids.has(t.id),'Duplicate instrument ID: '+t.id);ids.add(t.id);
 assert(t.name&&t.description&&t.type&&t.status&&t.verifiedAt,'Missing fields: '+t.id);
 assert(t.sources?.length,'Unsourced instrument: '+t.id);
 for(const s of t.sources)assert(data.sources[s]?.url?.startsWith('https://'),'Invalid source: '+t.id+' '+s);
 for(const c of model.codes(t))assert(countries.has(c),'Country not selectable: '+c);
 for(const k of ['signatureDate','effectiveDate','verifiedAt'])if(t[k]){assert(/^\d{4}-\d{2}-\d{2}$/.test(t[k]),'Invalid date '+t.id+' '+k);assert(!isNaN(new Date(t[k])));dateFields++;}
}
for(const s of map.shapes){assert(countries.has(s.code));assert(s.d.startsWith('M')&&s.d.endsWith('Z'));assert(!/NaN|undefined|Infinity/.test(s.d));}
for(const c of map.countries)assert(map.shapes.some(s=>s.code===c.code)||c.center,'No selectable geometry/marker: '+c.code);
let pairs=0;const reached=new Set();
for(let i=0;i<map.countries.length;i++)for(let j=i+1;j<map.countries.length;j++){
 const a=map.countries[i].code,b=map.countries[j].code,r=model.relation(a,b),reverse=model.relation(b,a);
 assert.equal(r.state,reverse.state,'Asymmetric classification');
 assert.equal(r.active.length,reverse.active.length);
 if(r.active.length){assert(['verified','alternative'].includes(r.state));pairs++;reached.add(a);reached.add(b);}
 else if(!r.negative)assert.equal(r.state,'unknown');
 for(const item of r.active)assert(['in-force','applicable'].includes(item.status));
}
const active=(a,b)=>Array.from(model.relation(a,b).active,r=>r.t.id);
assert(active('HU','DE').includes('european-arrest-warrant'));
assert(!active('HU','DE').includes('european-convention-extradition'));
assert(active('HU','GB').includes('eu-uk-surrender'));
assert(!active('HU','GB').includes('european-arrest-warrant'));
assert(active('NO','SE').includes('nordic-arrest-warrant'));
assert(!active('NO','IS').includes('eu-iceland-norway-surrender'));
assert.equal(model.relation('HU','CN').state,'unknown','Signed-only China–Hungary must remain yellow');
assert.equal(model.relation('AU','HK').state,'unknown','Suspended AU–HK must not be blue');
assert.equal(model.relation('AU','KH').state,'unknown','One-way Australian domestic legislation is not a treaty');
assert.equal(model.relation('US','KZ').state,'unknown','US multilateral-only applicability is unverified');
assert(!active('BR','PT').includes('br-pt'));
assert(active('BR','PT').includes('cplp-extradition'));
assert.equal(model.relation('GB','HK').state,'no-treaty');
assert.equal(model.relation('GB','ZW').state,'no-treaty');
assert.equal(model.relation('VA','NR').state,'unknown');
for(const c of ['HU','US','GB','FR','DE','RU','CN','IN','BR','AU','AD','SM','VA','NR','TV','PS']){assert(countries.has(c));assert.equal(model.relation(c,c).state,'selected');}
console.log(JSON.stringify({result:'PASS',selectable: countries.size,unMembersAndObservers:195,shapes:map.shapes.length,instruments:data.treaties.length,checkedDates:dateFields,uniqueActivePairs:pairs,jurisdictionsWithRecords:reached.size,sources:Object.keys(data.sources).length},null,2));

// V3 invariants: distinct partner counts, classifications, coverage and ranking eligibility.
const stats=model.statistics();assert.equal(stats.active,pairs);assert.equal(stats.active+stats.negative+stats.unknown,stats.total);assert.equal(stats.total,29161);assert.equal(stats.fullyVerified,0);
assert.equal(model.relation('HU','DE').state,'alternative');assert.equal(model.relation('HU','US').state,'verified');
assert(active('CA','HU').includes('ca-101282'));assert.equal(model.relation('CA','HK').state,'unknown');
assert(!model.relation('CA','BR').active.some(x=>x.t.id==='ca-105075'),'Signed-only Canada–Brazil excluded');
assert(active('ZA','BW').includes('sadc-extradition-protocol-2002'));assert(!active('ZA','MZ').includes('sadc-extradition-protocol-2002'),'Unverified SADC party not inferred');
assert(active('SA','AE').includes('riyadh-arab-judicial-cooperation-1983'));assert(!active('SA','KW').includes('riyadh-arab-judicial-cooperation-1983'),'Arab League membership not sufficient');
const ranks=model.rankings();assert.equal(ranks.definitive.length,0);assert(ranks.unranked.length>0);
for(let i=1;i<ranks.provisional.length;i++)assert(ranks.provisional[i-1].network.partners.length>=ranks.provisional[i].network.partners.length);
for(const c of map.countries){const n=model.network(c.code),s=model.network(c.code,true);assert.equal(n.partners.length,new Set(n.partners).size);assert.equal(n.partners.length+n.unknown+n.negative,n.total);assert(s.partners.every(x=>map.countries.find(c=>c.code===x).un));for(const ps of Object.values(n.typePartners))assert(ps.every(p=>n.partners.includes(p)));}
const comp=model.comparison('HU','GB');assert(comp.shared.every(c=>comp.left.partners.includes(c)&&comp.right.partners.includes(c)));assert(comp.leftOnly.every(c=>!comp.right.partners.includes(c)));assert(!comp.shared.includes('HU')&&!comp.shared.includes('GB'));
for(const [q,code] of [['UK','GB'],['USA','US'],['UAE','AE'],['Turkey','TR'],['Vatican','VA'],['Ivory Coast','CI']])assert.equal(model.resolve(q),code);
assert.equal(model.initialCountry(new URLSearchParams('country=HU'),'US','GB'),'HU');assert.equal(model.initialCountry(new URLSearchParams('compare=FR,DE'),'US','GB'),'FR');assert.equal(model.initialCountry(new URLSearchParams(''),'US','GB'),'US');assert.equal(model.initialCountry(new URLSearchParams(''),null,'GB'),'GB');assert.equal(model.initialCountry(new URLSearchParams(''),null,null),'HU');
const csv=model.csv('HU');assert(csv.includes('Last verified'));assert(csv.includes('ca-')===false);assert(csv.includes('https://'));assert(csv.includes('Canada'));assert(csv.startsWith('\ufeff'));
assert.equal(Object.keys(ctx.window.RESEARCH_DATA.nationality).length,13);
for(const p of Object.values(ctx.window.RESEARCH_DATA.nationality)){assert(p.summary&&p.verifiedAt&&p.sources.length);assert(p.sources.every(s=>/^https:\/\//.test(s.url)));}
if(process.env.QA_EXPECTATIONS_PATH)fs.writeFileSync(process.env.QA_EXPECTATIONS_PATH,JSON.stringify(map.countries.map(c=>({code:c.code,name:c.name,partners:[...model.network(c.code).partners].sort(),stateByCode:Object.fromEntries(map.countries.map(b=>[b.code,model.relation(c.code,b.code).state]))}))));
console.log('PASS: V3 counts, classification, rankings, comparisons, aliases, selection precedence, CSV and nationality source invariants.');
