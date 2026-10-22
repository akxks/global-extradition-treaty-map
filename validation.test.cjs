/* Optional data/engine validation. Runtime site has no Node dependency. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};vm.createContext(ctx);
for(const f of ['map-data.js','treaties.js','script.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),ctx);
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
 if(r.active.length){assert.equal(r.state,'verified');pairs++;reached.add(a);reached.add(b);}
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
