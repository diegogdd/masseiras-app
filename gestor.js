// Painel do Gestor: gráficos e análises da produção. Carregado só em /gestor, antes do app.js.
// Usa as funções do app.js (S, A, rpc, rpcQ, esc, fd, head, sair) só na hora de executar.
(function(){
const MINI='2026-10-05'; // massas contam a partir daqui
const INI='2026-10-28'; // pacotes só contam a partir daqui (antes não havia embalamento no sistema)
const TUR=['1º turno','2º turno','3º turno'],COR=['var(--t1)','var(--t2)','var(--t3)'];
const DOW=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],DS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const n=(v,d=0)=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:d,minimumFractionDigits:d});
const dow=d=>new Date(d+'T12:00:00').getDay();
const add=(d,k)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+k);return x.toISOString().slice(0,10)};
const dm=d=>d.slice(8)+'/'+d.slice(5,7);
const dl=d=>DS[dow(d)]+' '+dm(d);
const sm=(a,f)=>a.reduce((s,x)=>s+(f?f(x):x),0);
const PER=[[7,'7 dias'],[30,'30 dias'],[90,'90 dias'],[0,'Tudo']];

// Agrupa as linhas dia/turno por data de produção. "inc" = dia ainda não fechado (não entra em rankings e médias).
function porData(dias,hoje){const lim=add(hoje,-1),m={};
  dias.forEach(d=>{const o=m[d.data]||(m[d.data]={data:d.data,t:[0,0,0],tot:0,meta:0,mm:0,inc:false}),i=TUR.indexOf(d.turno),q=Number(d.massas)||0;
    if(i>=0)o.t[i]+=q;o.tot+=q;if(d.meta!=null&&q>0){o.meta+=Number(d.meta);o.mm+=q}
    if(d.status!=='encerrado'&&d.data>=lim)o.inc=true});
  return Object.values(m).sort((a,b)=>a.data<b.data?-1:1)}

function calc(G,per){const hoje=G.hoje,ini0=per?add(hoje,-(per-1)):MINI,ini=ini0>MINI?ini0:MINI,lim=add(hoje,-1),GD=G.dias.filter(d=>d.data>=MINI);
  const todos=porData(GD,hoje),incSet=new Set(todos.filter(x=>x.inc).map(x=>x.data));
  const rows=GD.filter(d=>d.data>=ini),dd=porData(rows,hoje),ok=dd.filter(x=>!x.inc&&x.tot>0);
  const media=ok.length?sm(ok,x=>x.tot)/ok.length:0,ord=ok.slice().sort((a,b)=>b.tot-a.tot),k=Math.max(1,Math.min(5,Math.floor(ok.length/2)));
  const top=ok.length>=2?ord.slice(0,k):ord.slice(0,1),bot=ok.length>=2?ord.slice().reverse().slice(0,k):[];
  const sem=DOW.map((nome,i)=>{const l=ok.filter(x=>dow(x.data)===i);return{i,nome,qtd:l.length,media:l.length?sm(l,x=>x.tot)/l.length:0}}),sc=sem.filter(x=>x.qtd>0);
  const sbest=sc.length>=2?sc.reduce((a,b)=>b.media>a.media?b:a):null,sworst=sc.length>=2?sc.reduce((a,b)=>b.media<a.media?b:a):null;
  const tr=TUR.map((nome,i)=>{const l=rows.filter(d=>d.turno===nome&&d.massas>0&&(d.status==='encerrado'||d.data<lim)),m=sm(l,x=>x.massas),lh=l.filter(x=>Number(x.horas)>0),h=sm(lh,x=>Number(x.horas)),lt=l.filter(x=>x.temp!=null),lm=l.filter(x=>x.meta!=null);
    return{nome,i,dias:l.length,massas:m,media:l.length?m/l.length:0,mh:h>0?sm(lh,x=>x.massas)/h:null,temp:lt.length?sm(lt,x=>Number(x.temp)*x.massas)/sm(lt,x=>x.massas):null,meta:lm.length&&sm(lm,x=>x.meta)>0?sm(lm,x=>x.massas)/sm(lm,x=>x.meta)*100:null,rep:m?sm(l,x=>x.rep_cong+x.rep_linha)/m*100:null}});
  const prod={};rows.forEach(d=>Object.entries(d.por_produto||{}).forEach(([p,c])=>prod[p]=(prod[p]||0)+Number(c)));
  const hr=Array.from({length:24},(_,h)=>({h,t:[0,0,0]}));(G.horas||[]).filter(x=>x.data>=ini).forEach(x=>{const i=TUR.indexOf(x.turno);if(i>=0&&hr[x.hora])hr[x.hora].t[i]+=Number(x.n)});
  return{ini,dd,ok,media,top,bot,sem,sbest,sworst,tr,prod,hr,total:sm(dd,x=>x.tot),incSet,todos}}

function calcPac(P,c){if(!P)return null;const ini=c.ini>INI?c.ini:INI,m={},parc=new Set((P.enc||[]).filter(e=>!e.fechado).map(e=>e.data));
  (P.itens||[]).filter(x=>x.data>=ini).forEach(x=>{const o=m[x.data]||(m[x.data]={data:x.data,tot:0,prod:{}}),v=Number(x.pacotes)||0;o.tot+=v;o.prod[x.produto]=(o.prod[x.produto]||0)+v});
  const dd=Object.values(m).sort((a,b)=>a.data<b.data?-1:1);dd.forEach(x=>x.inc=c.incSet.has(x.data)||parc.has(x.data));
  const ok=dd.filter(x=>!x.inc&&x.tot>0),ord=ok.slice().sort((a,b)=>b.tot-a.tot),prod={};dd.forEach(x=>Object.entries(x.prod).forEach(([p,v])=>prod[p]=(prod[p]||0)+v));
  const ms=sm(ok,x=>(c.todos.find(t=>t.data===x.data)||{}).tot||0),total=sm(dd,x=>x.tot);
  return{dd,ok,total,media:ok.length?sm(ok,x=>x.tot)/ok.length:0,melhor:ok.length>=2?ord[0]:null,pior:ok.length>=2?ord[ord.length-1]:null,prod,porMassa:ms>0?sm(ok,x=>x.tot)/ms:null}}

// ---------- componentes visuais (HTML/CSS) ----------
const kpi=(t,v,s)=>`<div class=gk><small>${t}</small><b>${v}</b>${s?`<span>${s}</span>`:''}</div>`;
function cols(it,o){o=o||{};const h=o.h||190,w=o.w||36,mx=Math.max(1,...it.map(i=>sm(i.seg,s=>s.v)));
  return `<div class=gw><div class=gch style="height:${h+52}px;min-width:${it.length*(w+4)}px">${it.map(i=>{const t=sm(i.seg,s=>s.v);
    return `<div class="gcol ${i.cls||''}" style="width:${w}px" title="${esc(i.tip||'')}"><div class=gpad><span class=gv>${t?n(t):''}</span><div class=gbar style="height:${Math.max(t?2:0,t/mx*h)}px">${i.seg.filter(s=>s.v>0).map(s=>`<i style="flex:${s.v} 1 0;background:${s.c}"></i>`).join('')}</div></div><span class=gl>${esc(i.l)}</span></div>`}).join('')}</div></div>`}
const leg=()=>`<div class=gleg>${TUR.map((t,i)=>`<span><i style="background:${COR[i]}"></i>${t}</span>`).join('')}</div>`;
function hbars(l,fmt){const mx=Math.max(1,...l.map(x=>x[1])),tot=sm(l,x=>x[1])||1;
  return l.map(([nm,v])=>`<div class=ghb><span class=ghn>${esc(nm)}</span><div class=ghw><div class=ghf style="width:${v/mx*100}%"></div></div><b>${fmt?fmt(v):n(v)}</b><small>${n(v/tot*100,1)}%</small></div>`).join('')}
function rank(l,tipo,media,pac){const mx=Math.max(1,...l.map(x=>x.tot));
  return l.map((x,i)=>{const dif=media>0?(x.tot/media-1)*100:null,pct=!pac&&x.meta>0?x.mm/x.meta*100:null;
    const sub=pac?(dif!=null?`${dif>=0?'+':''}${n(dif)}% vs. média`:''):`${TUR.map((t,j)=>x.t[j]?`${t.slice(0,2)}: ${x.t[j]}`:'').filter(Boolean).join(' · ')}${pct!=null?` · ${n(pct)}% da meta`:''}${dif!=null?` · ${dif>=0?'+':''}${n(dif)}% vs. média`:''}`;
    return `<div class="grk ${tipo}"><span class=gn>${i+1}</span><div class=gi><b>${dl(x.data)}</b><small>${esc(sub)}</small><div class=ghw><div class=ghf style="width:${x.tot/mx*100}%"></div></div></div><b class=gt>${n(x.tot)}</b></div>`}).join('')}

// ---------- tela ----------
function draw(){const G=S.G;if(!G)return;const per=S.gp==null?30:S.gp,c=calc(G,per),P=calcPac(S.GP,c),hoje=G.hoje;
  const dd=c.dd,vazio=!G.dias.some(d=>d.data>=MINI);
  const chartDias=cols(dd.map(x=>({l:dm(x.data),seg:x.t.map((v,i)=>({v,c:COR[i]})),cls:x.inc?'parc':'',tip:`${dl(x.data)}: ${x.tot} massas${x.inc?' (dia em andamento)':''}`})));
  const chartSem=cols(c.sem.map(s=>({l:DS[s.i],seg:[{v:s.media,c:'var(--pri)'}],cls:c.sbest&&s.i===c.sbest.i?'best':c.sworst&&s.i===c.sworst.i?'worst':'',tip:`${s.nome}: média de ${n(s.media,1)} massas em ${s.qtd} dia(s)`})),{w:56,h:150});
  const chartHora=cols(c.hr.map(x=>({l:String(x.h).padStart(2,'0')+'h',seg:x.t.map((v,i)=>({v,c:COR[i]})),tip:`${String(x.h).padStart(2,'0')}h: ${sm(x.t)} massas iniciadas`})),{w:30,h:140});
  const ins=[];
  if(c.top.length&&c.ok.length>=2){const t=c.top[0],b=c.bot[0];ins.push(`<b>Dia mais produtivo:</b> ${dl(t.data)} com ${n(t.tot)} massas (${n((t.tot/c.media-1)*100)}% acima da média de ${n(c.media,1)}).`);ins.push(`<b>Dia menos produtivo:</b> ${dl(b.data)} com ${n(b.tot)} massas (${n((1-b.tot/c.media)*100)}% abaixo da média).`)}
  if(c.sbest&&c.sworst&&c.sbest.i!==c.sworst.i)ins.push(`<b>Dia da semana:</b> ${c.sbest.nome} é o mais forte (média de ${n(c.sbest.media,1)} massas) e ${c.sworst.nome} o mais fraco (${n(c.sworst.media,1)}).`);
  const tm=c.tr.filter(t=>t.mh!=null);if(tm.length>=2){const a=tm.reduce((x,y)=>y.mh>x.mh?y:x);ins.push(`<b>Turno mais ágil:</b> ${a.nome}, com ${n(a.mh,1)} massas por hora.`)}
  const pk=c.hr.reduce((x,y)=>sm(y.t)>sm(x.t)?y:x,c.hr[0]);if(sm(pk.t)>0)ins.push(`<b>Horário de pico:</b> ${String(pk.h).padStart(2,'0')}h às ${String((pk.h+1)%24).padStart(2,'0')}h é quando mais massas são iniciadas.`);
  const inc=dd.filter(x=>x.inc).length;
  A.innerHTML=head()+`<nav><button onclick="GESTOR.load()">Atualizar</button><button onclick="sair()">Sair</button></nav><main class=gst><h2>Painel do Gestor</h2>
<div class="foot gper" style="margin:6px 0 14px"><small>Período:</small>${PER.map(([v,t])=>`<button class="${v===per?'sel':''}" onclick="GESTOR.per(${v})">${t}</button>`).join('')}</div>
${vazio?'<div class=gcard><p>Nenhuma produção registrada ainda.</p></div>':`
<div class=gks>${kpi('Massas no período',n(c.total),`${dd.length} dia${dd.length==1?'':'s'} com produção`)}${kpi('Média por dia',c.ok.length?n(c.media,1):'—','dias completos')}${kpi('Dia mais produtivo',c.top.length&&c.ok.length>=2?n(c.top[0].tot):'—',c.top.length&&c.ok.length>=2?dl(c.top[0].data):'precisa de 2 dias completos')}${kpi('Dia menos produtivo',c.bot.length?n(c.bot[0].tot):'—',c.bot.length?dl(c.bot[0].data):'precisa de 2 dias completos')}</div>
${inc?`<p class=gnota>O dia em andamento aparece nos gráficos (mais claro), mas não entra nos rankings nem nas médias até ser encerrado pelos 3 turnos.</p>`:''}
${ins.length?`<div class=gcard><h3>Resumo da análise</h3><ul class=gins>${ins.map(x=>`<li>${x}</li>`).join('')}</ul></div>`:''}
<div class=gcard><h3>Massas por dia</h3>${leg()}${chartDias}</div>
<div class=ggrid><div class=gcard><h3>▲ Mais produtivos</h3>${c.top.length&&c.ok.length>=2?rank(c.top,'top',c.media):'<p>Aparece quando houver pelo menos 2 dias completos no período.</p>'}</div>
<div class=gcard><h3>▼ Menos produtivos</h3>${c.bot.length?rank(c.bot,'bot',c.media):'<p>Aparece quando houver pelo menos 2 dias completos no período.</p>'}</div></div>
<div class=gcard><h3>Média de massas por dia da semana</h3>${chartSem}<small class=gnota>Só dias completos. Verde = melhor dia da semana, vermelho = mais fraco.</small></div>
<div class=gcard><h3>Turnos</h3><div class=wrap><table><tr><th>Turno<th>Dias<th>Massas<th>Média/dia<th>Massas/hora<th>Temp. média<th>Meta atingida<th>Reprocesso</tr>${c.tr.map(t=>`<tr><td><i class=gdot style="background:${COR[t.i]}"></i>${t.nome}<td>${t.dias}<td>${n(t.massas)}<td>${t.dias?n(t.media,1):'—'}<td>${t.mh!=null?n(t.mh,1):'—'}<td>${t.temp!=null?n(t.temp,1)+'ºC':'—'}<td>${t.meta!=null?n(t.meta)+'%':'—'}<td>${t.rep!=null?n(t.rep,1)+'%':'—'}</tr>`).join('')}</table></div><small class=gnota>Considera só turnos já encerrados. Massas/hora = massas ÷ tempo entre a 1ª e a última batelada do turno.</small></div>
<div class=ggrid><div class=gcard><h3>Massas por produto</h3>${Object.keys(c.prod).length?hbars(Object.entries(c.prod).sort((a,b)=>b[1]-a[1])):'<p>—</p>'}</div>
<div class=gcard><h3>Massas iniciadas por hora do dia</h3>${leg()}${chartHora}</div></div>`}
<div class="gcard gpac"><h3>Pacotes (embalamento)</h3><p class=gnota style="margin-top:0">A contagem de pacotes começou em <b>${fd(INI)}</b>. Os dias anteriores ficam de fora porque o embalamento ainda não estava no sistema.</p>
${S.GP==null?'<p class=aviso>Não foi possível carregar os pacotes agora. Rode <b>supabase/migracao-gestor.sql</b> no Supabase (se ainda não rodou) e toque em Atualizar.</p>':!P.dd.length?'<p>Ainda não há pallets registrados no período.</p>':`
<div class=gks>${kpi('Pacotes no período',n(P.total),`desde ${fd(P.dd[0].data)}`)}${kpi('Média por dia',P.ok.length?n(P.media):'—','dias completos')}${kpi('Melhor dia',P.melhor?n(P.melhor.tot):'—',P.melhor?dl(P.melhor.data):'precisa de 2 dias completos')}${kpi('Pior dia',P.pior?n(P.pior.tot):'—',P.pior?dl(P.pior.data):'precisa de 2 dias completos')}${kpi('Pacotes por massa',P.porMassa!=null?n(P.porMassa,1):'—','dias completos')}</div>
${cols(P.dd.map(x=>({l:dm(x.data),seg:[{v:x.tot,c:'var(--pri)'}],cls:x.inc?'parc':'',tip:`${dl(x.data)}: ${n(x.tot)} pacotes${x.inc?' (dia em andamento)':''}`})),{w:52,h:150})}
<div class=ggrid><div><h3>▲ Mais pacotes</h3>${P.melhor?rank(P.ok.slice().sort((a,b)=>b.tot-a.tot).slice(0,Math.min(5,Math.max(1,Math.floor(P.ok.length/2)))),'top',P.media,1):'<p>Aparece com pelo menos 2 dias completos.</p>'}</div>
<div><h3>▼ Menos pacotes</h3>${P.pior?rank(P.ok.slice().sort((a,b)=>a.tot-b.tot).slice(0,Math.min(5,Math.max(1,Math.floor(P.ok.length/2)))),'bot',P.media,1):'<p>Aparece com pelo menos 2 dias completos.</p>'}</div></div>
<h3>Pacotes por produto</h3>${hbars(Object.entries(P.prod).sort((a,b)=>b[1]-a[1]))}`}</div></main>`}

// ---------- Tempo Real (página /tempo-real, pensada para o celular) ----------
// Atualiza sozinho a cada 15 s (só com a tela visível) e ao voltar para o app; o botão Atualizar continua valendo.
let trBusy=false,trTimer=null;
async function loadTempo(auto){if(trBusy)return;trBusy=true;try{S.TR=await rpc('gestor_tempo_real');drawTempo()}catch(e){if(!auto)throw e}finally{trBusy=false}
  if(!trTimer){trTimer=setInterval(()=>{if(!document.hidden)loadTempo(true)},15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadTempo(true)})}}
function drawTempo(){const D=S.TR;if(!D)return;const L=D.pallets?(D.pallets.lista||[]):null,q=x=>Number(x.quantidade)||0;
  const T=TUR.map((nome,i)=>{const t=(D.turnos||[]).find(x=>x.turno===nome)||{},l=(L||[]).filter(x=>String(x.turno||'').slice(0,2)===nome.slice(0,2));
    return{nome,i,st:t.status?(t.status==='encerrado'?'Encerrado':'Em andamento'):'Sem registro',massas:Number(t.massas)||0,batendo:Number(t.batendo)||0,pacotes:L?sm(l,q):null,pallets:L?l.length:null}});
  const tot={massas:sm(T,x=>x.massas),pacotes:L?sm(L,q):null,pallets:L?L.length:null},v=x=>x==null?'—':n(x);
  A.innerHTML=head()+`<main class=tr><div class=trtop><h2>Tempo Real</h2><button onclick="sair()">Sair</button></div>
<p class=trd>Dia de produção <b>${fd(D.data)}</b> · atualizado às <b>${esc(D.agora)}</b></p>
<button class="big reg trbtn" onclick="GESTOR.load()">Atualizar</button>
${L?'':'<p class=aviso>Não foi possível carregar os pallets agora. Rode <b>supabase/migracao-gestor.sql</b> no Supabase (se ainda não rodou) e toque em Atualizar.</p>'}
<div class=trtot><div><small>Massas</small><b>${v(tot.massas)}</b></div><div><small>Pacotes</small><b>${v(tot.pacotes)}</b></div><div><small>Pallets</small><b>${v(tot.pallets)}</b></div></div>
${T.map(t=>`<div class="trt t${t.i+1}"><div class=trh><b>${t.nome}</b><span>${t.st}</span></div><div class=trg><div><small>Massas</small><b>${v(t.massas)}</b>${t.batendo?`<em class=trb>${t.batendo} batendo</em>`:''}</div><div><small>Pacotes</small><b>${v(t.pacotes)}</b></div><div><small>Pallets</small><b>${v(t.pallets)}</b></div></div></div>`).join('')}</main>`}

async function load(){if(window.PAGINA==='tempo')return loadTempo();const [G,P]=await Promise.all([rpc('gestor_dados'),rpcQ('gestor_pallets')]);S.G=G;S.GP=P;draw()}
window.GESTOR={load,draw,per:v=>{S.gp=v;draw();window.scrollTo(0,0)}};
})();
