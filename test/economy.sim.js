global.window=undefined;
const Tasks=require(require('path').join(__dirname,'../tasks.js')); globalThis.Tasks=Tasks;
const E=require(require('path').join(__dirname,'../engine.js'));
function run(strategy,verbose){
 const S=E.newState('TEST'); S.settings.years=6;
 const ps=[]; for(let i=0;i<9;i++){ps.push(E.joinPlayer(S,'tok'+i,'P'+i));}
 E.autoAssign(S); 
 let r=E.next(S); if(r) throw r;
 for(let y=1;y<=S.settings.years;y++){
   // work: each player solves tasks; accuracy by difficulty
   E.next(S); // event->work
   for(const p of ps){ for(let k=0;k<6;k++){ const d=strategy.diff(); p.lockUntil=0; E.handle(S,p.id,{t:'task:get',diff:d}); const task=p.task; if(!task) throw new Error('no task'); const good=Math.random()<strategy.acc[d]; let a; if(task.type==='mc') a= good? task.correct : (task.correct+1)%task.choices.length; else a= good? String(task.ans) : '12345'; E.handle(S,p.id,{t:'task:answer',id:task.id,a}); } }
   E.next(S); // work->decide
   for(const t of S.teams){ const [ceo,cfo,adm]=[t.members[0],t.members[1]||t.members[0],t.members[2]||t.members[0]]; strategy.decide(S,t,{ceo,cfo,adm}); }
   E.next(S); // decide->result
   if(verbose) console.log('Y'+y, S.event.name, S.teams.map(t=>t.name+':'+E.net(t)).join(' | '));
   E.next(S); // result -> event / final
 }
 return S;
}
const strategies={
 passive:{diff:()=>2,acc:{1:.9,2:.75,3:.5},decide(S,t,r){}},
 investor:{diff:()=>2,acc:{1:.9,2:.75,3:.5},decide(S,t,r){ const pr=E.prices(S); for(const id of ['cafe','shop','tech','home']){ while(t.money>=pr.assets[id]+800 && Math.random()<.9){E.handle(S,r.ceo,{t:'act',a:'buy',arg:id}); break;} } if(t.money>1500) E.handle(S,r.adm,{t:'act',a:'insure'}); }},
 saver:{diff:()=>2,acc:{1:.9,2:.75,3:.5},decide(S,t,r){ E.handle(S,r.cfo,{t:'act',a:'deposit',arg:Math.max(0,t.money-900)}); E.handle(S,r.adm,{t:'act',a:'insure'}); }},
 hard:{diff:()=>3,acc:{1:.9,2:.75,3:.5},decide(S,t,r){ }},
 easy:{diff:()=>1,acc:{1:.9,2:.75,3:.5},decide(S,t,r){ }},
};
for(const [n,st] of Object.entries(strategies)){
 const res=[]; let goals=0,tot=0;
 for(let i=0;i<30;i++){ const S=run(st); S.teams.forEach(t=>res.push(E.net(t))); S.final.forEach(f=>{tot++; if(f.goalMet)goals++;}); }
 res.sort((a,b)=>a-b); console.log(n.padEnd(9),'net min/med/max',res[0],res[res.length>>1],res[res.length-1],' goals met',Math.round(100*goals/tot)+'%');
}
const S=run(strategies.investor,true); console.log(JSON.stringify(S.teams[0].last.lines.slice(0,8)));
console.log(JSON.stringify(E.viewFor(S,Object.keys(S.players)[0])).length,'bytes view');
