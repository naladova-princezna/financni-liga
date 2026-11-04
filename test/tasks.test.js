const T=require(require('path').join(__dirname,'../tasks.js'));
const strip=s=>String(s).replace(/<br>/g,' ⏎ ').replace(/<i>/g,'[').replace(/<\/i><b>/g,']/[').replace(/<\/b>/g,']').replace(/<[^>]+>/g,'');
let bad=0,total=0;
for(const [tid,levels] of Object.entries(T._G)){
 for(const d of [1,2,3]){
  for(const g of levels[d]){
   let err=null,sample=null;
   for(let i=0;i<300;i++){
     try{
       const t=g.fn(); total++;
       if(t.type==='mc'){
         if(new Set(t.choices).size!==t.choices.length) throw new Error('dup choices '+JSON.stringify(t.choices));
         if(t.choices.length<2||t.correct<0||t.choices[t.correct]!==t.ansText) throw new Error('bad mc');
       } else { if(!isFinite(t.ans)) throw new Error('bad ans '+t.ans); if(!T.checkNum(strip(t.ansText).replace(/\[(.*?)\]\/\[(.*?)\]/,'$1/$2'),t.ans) && !/^-?\d/.test(strip(t.ansText).replace('−','-'))) {} }
       if(/undefined|NaN|\[object/.test(t.q+(t.choices?t.choices.join(''):'')+t.expl)) throw new Error('undefined in text: '+t.q+' '+t.expl);
       if(i===0) sample=t;
     }catch(e){err=e;break;}
   }
   if(err){bad++;console.log('❌',tid,d,g.name,err.message);}
   else if(process.argv[2]) {const s=sample; console.log(`[${tid} L${d} ${g.name}] ${strip(s.q)}\n   ${s.type==='mc'? s.choices.map((c,i)=>(i===s.correct?'✔':' ')+strip(c)).join(' | '):'= '+strip(s.ansText)}\n   ↳ ${strip(s.expl)}`);}
  }
 }
}
console.log('total',total,'bad',bad);
