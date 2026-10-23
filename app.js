const {SU,SK}=window.CONFIG||{},PERFIL=window.PERFIL||'operador',NOMES={operador:'Operador',lider:'Líder',admin:'Administrador',farinha:'Abastecimento Farinha'},K='mq_'+PERFIL;
const sb=PERFIL==='treinamento'?null:supabase.createClient(SU,SK),TURNOS=['1º turno','2º turno','3º turno'],A=document.getElementById('app');
let S={v:'login',w:null,fin:false,mode:'iniciar'};try{Object.assign(S,JSON.parse(localStorage.getItem(K)||'{}'))}catch(e){}
if(PERFIL!=='treinamento'&&S.perfil&&S.perfil!==PERFIL){S.token=null;S.perfil=null}
if(PERFIL==='treinamento'){S.token='demo';S.perfil='operador';S.turno='Treinamento';if(S.v==='login')S.v='home'}
const save=()=>{try{localStorage.setItem(K,JSON.stringify({token:S.token,perfil:S.perfil,turno:S.turno,nome:S.nome,v:S.v}))}catch(e){}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hm=t=>t?new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—';
const fd=d=>d?d.split('-').reverse().join('/'):'';
const SV=p=>`<svg class=ic viewBox="0 0 120 120" width=240 height=240 aria-hidden=true fill=none stroke=currentColor stroke-width=6 stroke-linejoin=round stroke-linecap=round>${p}</svg>`;
const ICS=[SV('<path d="M30 12h60v12H30z"/><path d="M30 24h60l6 84H24z"/><path d="M42 60q18-14 36 0M42 82q18-14 36 0"/>'),SV('<path d="M60 12l42 24v48L60 108 18 84V36z"/><path d="M18 36l42 24 42-24M60 60v48"/>')];
const IC=['fermento','gelo'].map((n,i)=>`<img class=foto src="/img/${n}.png" alt="${n}" onerror="this.style.display='none';this.nextElementSibling.hidden=false"><span hidden>${ICS[i]}</span>`);
async function rpc(fn,a){if(PERFIL==='treinamento')return demoRpc(fn,a);const {data,error}=await sb.rpc(fn,Object.assign({p_token:S.token},a||{}));if(error){if(/Sessão inválida/.test(error.message)){S.token=null;go('login')}else alert(error.message);throw error}return data}
const go=v=>{S.v=v;save();R()};
async function R(){if(!S.token&&S.v!=='login')S.v='login';if(!S.w&&(S.v==='wiz'||S.v==='fim'))S.v='main';if(!S.mescla&&S.v==='mescla')S.v='main';try{await V[S.v]()}catch(e){console.error(e)}}
const mescT=b=>(b.farinha||[]).slice().sort((x,y)=>x.moega-y.moega).map(f=>`M${f.moega}: ${esc(f.moinho)} ${esc(f.lote)}`).join('<br>')||'—';
const rp=b=>[b.rep_congelado?'C':'',b.rep_linha?'L':''].filter(Boolean).join('/')||'—';
const done=()=>S.E.bateladas.filter(b=>b.status==='Finalizada');
const dh=()=>{const d=new Date();return `<span class=d>${d.toLocaleDateString('pt-BR')}</span><span>${d.toLocaleDateString('pt-BR',{weekday:'long'})}</span>`};
function head(){const d=S.E&&S.E.dia;return (PERFIL==='treinamento'?'<div class=demo>MODO TREINAMENTO: dados fictícios, nada é gravado no sistema real</div>':'')+`<header>${dh()}<span>${esc(S.turno||NOMES[S.perfil])}</span>${d&&S.perfil==='operador'?`<span class=pa>Produto atual: <b>${esc(d.produto)}</b></span>`:''}</header>`}
function nav(){const o=S.perfil==='operador',l=S.perfil==='lider';return `<nav>${o?`<button onclick="go('${S.E&&S.E.dia?'main':'home'}')">Bateladas</button>`:''}${o||l?`<button onclick="S.fin=false;go('resumo')">Produção do Dia</button>`:''}<button onclick="go('hist')">Histórico de produção</button>${o?`<button onclick="go('rec')">Receitas (batimentos)</button><button onclick="go('ajuda')">Como usar</button>`:''}${l?`<button onclick="go('report')">Gerar report de produção do dia</button>${S.turno==='1º turno'?`<button onclick="go('geral')">Report do dia anterior</button>`:''}<button onclick="go('resumo')">Atualizar</button>`:''}${PERFIL==='treinamento'?'<button onclick=metaDemo()>Definir meta de exemplo</button><button class=big onclick=zerar()>Zerar treinamento</button>':'<button onclick="sair()">Sair</button>'}</nav>`}
const home0=()=>S.perfil==='farinha'?'farinha':S.perfil==='admin'?'admin':S.perfil==='lider'?'resumo':(S.E&&S.E.dia?'main':'home');
async function load(){S.E=await rpc('estado')}
function sum(f){const p={};f.forEach(b=>p[b.produto]=(p[b.produto]||0)+1);const t=f.length;let h='—';if(t){const hr=(Math.max(...f.map(b=>Date.parse(b.fim)))-Math.min(...f.map(b=>Date.parse(b.inicio))))/36e5;if(hr>0)h=(t/hr).toFixed(1).replace('.',',')}
return{t,p,h,tp:t?(f.reduce((a,b)=>a+Number(b.temperatura),0)/t).toFixed(1).replace('.',',')+'ºC':'—',c:f.filter(b=>b.rep_congelado).length,cp:f.reduce((o,b)=>{if(b.rep_congelado)o[b.produto]=(o[b.produto]||0)+1;return o},{}),l:f.filter(b=>b.rep_linha).length}}
const metaHtml=(m,f,nd)=>m==null?`<div class=meta><span>${nd}</span></div>`:`<div class=meta><span>Meta do dia<b>${m}</b></span><span>Feitas<b>${f}</b></span><span>Faltam<b>${Math.max(m-f,0)}</b></span></div>`;
function metaBar(){return metaHtml(S.E.meta,done().length,'META: a definir pelo líder')}
const stats=m=>`<p>Total de massas</p><div class=tot>${m.t}</div>${Object.entries(m.p).map(([k,v])=>`<div class=kv><span>Massas ${esc(k)}</span><b>${v}</b></div>`).join('')}<div class=kv><span>Média massa/hora</span><b>${m.h}</b></div><div class=kv><span>Média temperatura total</span><b>${m.tp}</b></div><div class=kv><span>Reprocesso Congelado</span><b>${m.c}</b></div>${Object.entries(m.cp).map(([k,v])=>`<div class=kv style="padding-left:28px;font-size:19px;opacity:.8"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}<div class=kv><span>Reprocesso Linha</span><b>${m.l}</b></div>`;
const metaForm=()=>S.perfil==='lider'?`<div class=f><label>Meta do dia (massas)<input type=number min=0 id=mt value="${S.E.meta??''}"></label><button class=big onclick=salvameta()>Salvar meta</button></div>`:''
const V={
login(){A.innerHTML=`<main class=c><h1>Controle de Bateladas JBT</h1><h2>${NOMES[PERFIL]}</h2>${['admin','farinha'].includes(PERFIL)?'':`<label>Turno<select id=t>${TURNOS.map(t=>`<option>${t}</option>`).join('')}</select></label>`}<label>Senha<input id=p type=password autocomplete=off></label><button class=big onclick=ent()>Entrar</button><p class=er id=er></p></main>`},
async home(){await load();const fc=S.E.fechando;A.innerHTML=head()+nav()+(fc&&!S.E.dia?`<div class=ctr><p><b>Produção deste turno encerrada.</b><br>Aguardando o próximo turno finalizar ${fc.batendo} massa${fc.batendo==1?'':'s'} que ainda ${fc.batendo==1?'está':'estão'} batendo.</p></div>`:`<div class=ctr><button class=big onclick=inicia()>${S.E.dia?'CONTINUAR PRODUÇÃO DE HOJE':'INICIAR PRODUÇÃO DE HOJE'}</button></div>`)},
async prod(){await load();A.innerHTML=head()+`<main><h2>Escolha o produto</h2><div class=grid>${S.E.produtos.map(p=>`<button onclick="pick(${p.id})">${esc(p.nome)}</button>`).join('')}</div>${S.E.dia?`<div class=foot><button onclick="go('main')">Voltar</button></div>`:''}</main>`},
async main(){await load();if(!S.E.dia)return go('home');const ant=S.E.anteriores||[],act=S.E.bateladas.filter(b=>b.status==='Batendo').sort((a,b)=>a.diosna-b.diosna),f=done(),livres=Math.max(0,2-(S.E.diosnas_ocupadas?S.E.diosnas_ocupadas.length:act.length));
A.innerHTML=head()+nav()+`<main>${metaBar()}<h2>Bateladas</h2>${[0,1].map(i=>row(act[i],i-act.length>=livres)).join('')}${ant.length?`<h3>Massas do turno anterior ainda batendo</h3>${ant.map(rowA).join('')}`:''}<div class=foot><button onclick="go('prod')">Trocar de produto</button><button onclick=fecha()>Encerrar meu turno</button></div><h2>Finalizadas hoje</h2>${tabela(f.slice().reverse())}</main>`},
wiz(){const w=S.w,st=w.step;let h='';
if(st<2){h=`<div class=ing>${IC[st]}<h2>${st?'Gelo':'Fermento'}</h2><p>Confirma que acrescentou o item?</p><button class=big onclick=nx()>SIM</button></div>`}
else if(st==2){h=`<h2>Reprocesso</h2><p>Marque o que foi usado nesta batelada.</p><div class=grid>${['Congelado','Linha'].map(x=>`<button class="${w.rep.includes(x)?'sel':''}" onclick="tg('${x}')">${x.toUpperCase()}</button>`).join('')}</div><div class=foot><button class=big onclick=nx()>${w.rep.length?'Continuar':'Não usou reprocesso, continuar'}</button></div>`}
else if(st==3){const oc=n=>(S.E.diosnas_ocupadas||[]).includes(n)||S.E.bateladas.some(b=>b.status==='Batendo'&&b.diosna===n);h=`<h2>Qual Diosna está batendo?</h2><div class=grid>${[1,2].map(n=>`<button ${oc(n)?'disabled':''} onclick="dio(${n})">${n}</button>`).join('')}</div>`}
else{h=`<h2>Operador responsável</h2><label>Nome<input id=op value="${esc(w.op)}" oninput="S.w.op=this.value" autocomplete=off></label><div class=foot><button class=big onclick=iniciaB()>Continuar</button></div><p class=er id=er></p>`}
A.innerHTML=head()+`<main>${h}<div class=foot><button onclick="S.w=null;go('main')">Cancelar batelada</button></div></main>`},
fim(){const w=S.w;A.innerHTML=head()+`<main><h2>Fim da Batelada</h2><p>Hora fim: <b>${hm(w.fim)}</b></p><p>Temperatura da massa</p><div class=tv><span id=tv>${w.temp||'0'}</span> ºC</div><div class=kp>${[7,8,9,4,5,6,1,2,3,',',0,'⌫'].map(k=>`<button onclick="key('${k}')">${k}</button>`).join('')}</div><div class=foot><button class=big onclick=ok()>Confirmar fim da batelada</button><button onclick="S.w=null;go('main')">Voltar</button></div><p class=er id=er></p></main>`},
async resumo(){await load();const d=S.E.dia;if(!d&&S.E.fechando){await resumoFechando();return}
if(!d){A.innerHTML=head()+nav()+`<main>${metaBar()}${metaForm()}<h2>Produção do Dia</h2><p>Nenhuma produção em andamento neste turno.</p></main>`;return}
const m=sum(done());A.innerHTML=head()+nav()+`<main>${metaBar()}${metaForm()}<h2>Produção do Dia</h2>${stats(m)}${S.fin?`<div class=foot><button class=big onclick=encerra()>Encerrar meu turno</button><button onclick="go('main')">Voltar</button></div>`:''}${S.perfil==='lider'?`<h3>Bateladas</h3>${tabela(S.E.bateladas.slice().reverse(),1)}`:''}</main>`},
async hist(){S.H=await rpc('historico');if(!S.E&&S.perfil!=='admin')await load();drawHist()},
async hdia(){if(!S.hid)return go('hist');const r=await rpc('historico_dia',{p_dia:S.hid}),d=r.dia,m=sum(r.bateladas.filter(b=>b.status==='Finalizada'));
A.innerHTML=head()+nav()+`<main><div class=foot style="margin-top:0"><button onclick="go('hist')">← Voltar ao histórico</button></div><h2>Produção do Dia</h2><p>${fd(d.data)} · ${esc(d.turno)}${d.status==='aberto'?' (em andamento)':d.status==='encerrando'?' (encerrando: massas ainda batendo)':''}</p>${metaHtml(d.meta,m.t,'Meta não definida neste dia')}${stats(m)}<h3>Bateladas</h3>${tabela(r.bateladas.slice().reverse(),1)}</main>`},
async rec(){await load();A.innerHTML=head()+nav()+`<main><h2>Receitas (batimentos)</h2>${S.E.produtos.map(p=>`<div class=row style="display:block"><b>${esc(p.nome)}</b>${etTab(p.batimento||[])}${p.receita?`<div class=pre>${esc(p.receita)}</div>`:''}</div>`).join('')}</main>`},
mescla(){const M=S.mescla,f=M.farinha||[];A.innerHTML=head()+`<main><h2>Mescla de farinha atual</h2><div class=tiles>${[1,2].map(m=>tile(m,f.find(x=>x.moega===m))).join('')}</div>${(M.trocas||[]).map(t=>`<div class=balao><b>Troca nesta batelada:</b> Moega ${t.moega} agora é ${esc(t.para.moinho)} (lote ${esc(t.para.lote)})${t.de?`, antes era ${esc(t.de.moinho)} (lote ${esc(t.de.lote)})`:''}.</div>`).join('')}${(M.proximas||[]).map(p=>`<div class=balao><b>Atenção:</b> a próxima batelada troca a Moega ${p.moega} para ${esc(p.moinho)} (lote ${esc(p.lote)}).</div>`).join('')}<div class=foot><button class=big onclick="S.mescla=null;go('main')">CIENTE</button></div></main>`},
async ajuda(){if(S.perfil!=='operador')return go(home0());await load();A.innerHTML=head()+nav()+`<main><h2>Como usar</h2><ol class=passos>${PASSOS.map(x=>`<li><b>${x[0]}</b>${x[1]}</li>`).join('')}</ol></main>`},
async report(){if(S.perfil!=='lider')return go(home0());const H=await rpc('historico');
if(!H.length){A.innerHTML=head()+nav()+'<main><h2>Report de produção do dia</h2><p>Nenhuma produção registrada neste turno.</p></main>';return}
if(!S.rd||!H.some(x=>x.id==S.rd))S.rd=H[0].id;const r=await rpc('report_dia',{p_dia:S.rd});S.RP={H,r,v:repVals(r)};S.RP.abs=Object.assign({},S.RP.v.abs);drawReport()},
async geral(){if(S.perfil!=='lider'||S.turno!=='1º turno')return go(home0());if(!S.rgd){const d=new Date(Date.now()-864e5);S.rgd=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const g=await rpc('report_geral',{p_data:S.rgd}),b=geralBase(g);S.RG={g,m:(g.salvo&&g.salvo.m)||b.m,avisos:b.avisos,salvo:!!(g.salvo&&g.salvo.m)};drawGeral()},
async farinha(){S.F=await rpc('farinha_estado');S.FM=await fetchMassas();drawFarinha()},
async admin(){S.AD=await rpc('admin_listar');S.RH=await rpc('admin_rh');drawAdmin()}};
const PASSOS=[
['Entrar no sistema','Abra o endereço do operador, escolha o <b>turno</b> e digite a <b>senha do turno</b>.'],
['Iniciar a produção do dia','Na tela inicial, toque em <b>INICIAR PRODUÇÃO DE HOJE</b> e escolha o <b>produto</b>. Se a produção já foi iniciada, o botão mostra <b>CONTINUAR PRODUÇÃO DE HOJE</b>.'],
['Conferir a meta','No topo da tela <b>Bateladas</b> aparecem a meta do dia, as massas feitas e quantas faltam. Se estiver escrito <b>META: a definir pelo líder</b>, aguarde o líder informar.'],
['Iniciar uma batelada','Toque em <b>Iniciar nova batelada</b>. A hora de início é registrada sozinha. Responda na ordem: <b>Fermento</b> (SIM), <b>Gelo</b> (SIM), <b>Reprocesso</b> (Congelado, Linha, os dois, ou &quot;Não usou reprocesso&quot;), <b>qual Diosna</b> está batendo (1 ou 2) e o <b>operador responsável</b>. Até o último passo ainda dá para tocar em <b>Cancelar batelada</b>.'],
['Conferir a mescla de farinha','Depois de iniciar, aparece a <b>mescla de farinha atual</b>: o moinho e o lote de cada moega. Leia o balão de aviso, se houver troca de lote ou moinho, e toque em <b>CIENTE</b>. Se aparecer &quot;Não informado&quot;, avise o operador da ponte rolante.'],
['Acompanhar as duas Diosnas','A batelada em andamento fica destacada como <b>Batendo</b>, com fermento, gelo, reprocesso, Diosna e mescla. Enquanto uma Diosna está ocupada, o botão da linha fica bloqueado com &quot;Aguardando fim do batimento&quot;.'],
['Finalizar a batelada','Quando terminar de bater, toque em <b>Fim da batelada</b>. A hora final é registrada sozinha. Digite a <b>temperatura da massa</b> no teclado da tela e confirme.'],
['Trocar de produto','Toque em <b>Trocar de produto</b> e escolha o novo. Pode trocar mesmo com massa batendo: ela termina normalmente com o produto antigo. O novo produto começa no <b>lote 1</b> e as massas continuam somando no total do dia.'],
['Consultar as informações','<b>Produção do Dia</b> mostra o total de massas, as massas por produto e as médias. <b>Histórico de produção</b> mostra os dias do seu turno. <b>Receitas (batimentos)</b> mostra as etapas de cada produto: tempo, ferramenta e tina.'],
['Encerrar o turno (mesmo com massa batendo)','Toque em <b>Encerrar meu turno</b>, confira o resumo e toque em <b>Encerrar meu turno</b>. Se ainda houver massa batendo, o sistema avisa: ela será finalizada pelo operador do próximo turno e continua contando no seu turno.'],
['Se algo der errado','Se a página recarregar no meio de uma batelada, ela volta para a tela principal. Se a Diosna aparecer bloqueada, escolha a outra ou aguarde o fim do batimento. Em caso de dúvida, chame o líder. Para sair do sistema, toque em <b>Sair</b>.']];
const slug=n=>String(n).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
const logo=n=>`<img class=logo src="/img/moinhos/${slug(n)}.png" alt="${esc(n)}" onerror="this.style.display='none';this.nextElementSibling.hidden=false"><b class=mn hidden>${esc(n)}</b>`;
const tile=(m,v,extra)=>`<div class=tile><small>Moega ${m}</small>${v?logo(v.moinho)+`<div class=lt>Lote: <b>${esc(v.lote)}</b></div>`:'<div class=lt>Não informado</div>'}${extra||''}</div>`;
function drawFarinha(){const F=S.F;A.innerHTML=head()+`<nav><button onclick="sair()">Sair</button></nav><main><h2>Abastecimento Farinha</h2><div id=fm2>${massasHtml()}</div><h3>Absorção da farinha</h3><div class=f><label>Absorção geral (%)<input id=fab type=number step=any min=0 inputmode=decimal value="${F.absorcao?F.absorcao.valor:''}"></label><button class=big onclick=salvaAbs()>Salvar absorção</button></div>${F.absorcao?`<p>Valor atual: <b>${fR(F.absorcao.valor)}%</b> · informado em ${new Date(F.absorcao.registrado_em).toLocaleString('pt-BR')}</p>`:'<p>Nenhuma absorção informada ainda.</p>'}<div class=tiles>${[1,2].map(m=>{const v=F.pendente.find(x=>x.moega===m)||F.vigente.find(x=>x.moega===m);return tile(m,v,`<button onclick="S.ft=${m};drawFarinha()">Trocar lote/moinho</button>`)}).join('')}</div>${S.ft?`<h3>Trocar a Moega ${S.ft}</h3><div class=f><label>Moinho<select id=fm>${F.moinhos.map(n=>`<option>${esc(n)}</option>`).join('')}</select></label><label>Lote<input id=fl autocomplete=off></label><button class=big onclick=trocaF()>Confirmar troca</button><button onclick="S.ft=null;drawFarinha()">Cancelar</button></div>`:''}<h3>Histórico de trocas</h3><div class=wrap><table><tr><th>Data e hora<th>Moega<th>Moinho<th>Lote</tr>${F.historico.length?F.historico.map(h=>`<tr><td>${new Date(h.registrado_em).toLocaleString('pt-BR')}<td>${h.moega}<td>${esc(h.moinho)}<td>${esc(h.lote)}</tr>`).join(''):'<tr><td colspan=4>Nenhuma troca registrada.</tr>'}</table></div></main>`}
async function trocaF(){const m=document.getElementById('fm').value,l=document.getElementById('fl').value.trim();if(!l)return alert('Informe o lote.');if(!confirm('Confirmar a troca da Moega '+S.ft+' para '+m+', lote '+l+'?'))return;await rpc('farinha_trocar',{p_moega:S.ft,p_moinho:m,p_lote:l});S.ft=null;R()}
async function excluirDia(id){if(!confirm('Excluir esta produção? Todas as bateladas deste dia e turno serão apagadas e isso não pode ser desfeito.'))return;await rpc('admin_excluir_dia',{p_dia:id});R()}
async function addm(){await rpc('admin_moinho',{p_nome:document.getElementById('nm').value});R()}
async function delm(n){if(confirm('Excluir o moinho '+n+'?')){await rpc('admin_excluir_moinho',{p_nome:n});R()}}

// ---- Report de produção do dia (líder): colunas por produto, como no modelo JBT ----
const nR=x=>{const t=String(x).replace(',','.');return t===''?0:parseFloat(t)||0};
const fR=x=>String(x).replace('.',',');
const RCAMPOS=[['ordem','Nº Ordem (bipe o código de barras)','t'],['planejado','Planejado','n'],['produzido','Produzido','n'],['pacotes','Total de pacotes','n'],['mr0036','MR0036 consumidos (kg)','n'],['mescla','Mescla farinha','t'],['absorcao','Absorção de água','t'],['mr0001','MR0001 consumidos (kg)','n'],['mr0036g','MR0036 gerados (kg)','n'],['mr0027','MR0027 consumidos (kg)','n'],['gelo','Pacotes de gelo','n']];
function repVals(r){const sv=r.salvo||{},sp=sv.prod||{},um=r.produtos.length===1;
const pr=r.produtos.map(p=>{const s=sp[p.produto]||{},ms=r.moinhos.filter(m=>m.produto===p.produto),nomes=[...new Set(ms.map(m=>m.moinho.toUpperCase()))],
dflt={ordem:'',planejado:um?(r.dia.meta??''):'',produzido:p.massas,pacotes:p.massas*60,mr0036:p.congelado*22.5,mescla:nomes.length===2?'50/50'+nomes.join('/'):nomes.join('/'),absorcao:r.absorcao!=null?fR(Number(r.absorcao))+'%':'',mr0001:0,mr0036g:0,mr0027:0,gelo:0},o={produto:p.produto,codigo:p.codigo||p.produto};
const au=(sv.auto||{})[p.produto]||{};RCAMPOS.forEach(([k])=>o[k]=(s[k]==null||(k in au&&String(s[k])===String(au[k])))?dflt[k]:s[k]);o.__d=dflt;return o});
return{produtos:pr,estoque_gelo:sv.estoque_gelo??(r.estoque_gelo_anterior!=null?Number(r.estoque_gelo_anterior):0),abs:sv.abs||{},obs:sv.obs||''}}
function drawReport(){const {H,r,v}=S.RP;
A.innerHTML=head()+nav()+`<main class=rep><h2>Report de produção diária</h2>
<div class=f><label>Produção<select onchange="S.rd=this.value;R()">${H.map(x=>`<option value=${x.id} ${x.id==S.rd?'selected':''}>${fd(x.data)} · ${esc(x.turno)}${x.status==='aberto'?' (em andamento)':''}</option>`).join('')}</select></label><label>Data da produção<input value="${fd(r.dia.data)}" readonly></label><label>Turno<input value="${esc(r.dia.turno)}" readonly></label></div>
${v.produtos.length>1&&r.dia.meta!=null?`<p>Meta do dia definida pelo líder: <b>${r.dia.meta}</b> massas. Informe o planejado de cada produto.</p>`:''}
${v.produtos.length?`<div class=wrap><table class=rp><tr><th>${''}<th>${v.produtos.map(p=>`<th>${esc(p.codigo)}`).join('')}</tr>${RCAMPOS.map(([k,rot,t])=>`<tr><td><b>${rot}</b>${v.produtos.map((p,i)=>`<td${v.produtos.length>1?` data-p="${esc(p.codigo)}"`:''}><input id="rf_${k}_${i}" value="${esc(t==='n'?fR(p[k]):p[k])}" ${t==='n'?'inputmode=decimal':'autocomplete=off'}${k==='ordem'?` placeholder="Bipe aqui" onkeydown="if(event.key==='Enter'){event.preventDefault();var n=document.getElementById('rf_ordem_${i+1}');n?n.focus():this.blur()}"`:''}>${k==='ordem'?`<button type=button onclick="lerCam(${i})">Ler com a câmera</button>`:''}`).join('')}</tr>`).join('')}</table></div>`:'<p>Nenhuma massa registrada neste dia.</p>'}
<div class=f><label>Estoque de gelo (pallets)<input id=reg value="${fR(v.estoque_gelo)}" inputmode=decimal></label></div>
<h3>Absenteísmo <small id=sab></small></h3><div id=absb></div>
<label>Observação<textarea id=robs>${esc(v.obs)}</textarea></label>
<div class=foot><button class=big onclick=compartilhaR()>Compartilhar report</button><button class=big onclick=salvaR()>Salvar report</button><button class=big onclick=baixaR()>Baixar Excel</button><button onclick=copiaR()>Copiar resumo</button><button onclick=limpaR()>Recalcular (descartar edições)</button></div></main>`;
drawAbs();document.fonts&&document.fonts.load('700 20px Barlow');setTimeout(()=>{const e=document.getElementById('rf_ordem_0');e&&!e.value&&e.focus()},60)}
function coletaR(){const g=i=>document.getElementById(i),prod={},abs={};S.RP.v.produtos.forEach((p,i)=>{const o={};RCAMPOS.forEach(([k,,t])=>{const x=g(`rf_${k}_${i}`).value.trim();o[k]=t==='n'?(x===''?'':nR(x)):x});prod[p.produto]=o});
S.RP.r.colaboradores.forEach(c=>{if(S.RP.abs[c.id])abs[c.id]=S.RP.abs[c.id]});const auto={};S.RP.v.produtos.forEach(p=>{if(p.__d)auto[p.produto]=p.__d});return{prod,auto,estoque_gelo:nR(g('reg').value),abs,obs:g('robs').value}}
function payloadR(){const d=coletaR(),r=S.RP.r;return{data:r.dia.data,turno:r.dia.turno,produtos:S.RP.v.produtos.map(p=>Object.assign({produto:p.produto,codigo:p.codigo},d.prod[p.produto])),estoque_gelo:d.estoque_gelo,ausentes:r.colaboradores.filter(c=>d.abs[c.id]).map(c=>({nome:c.nome,motivo:d.abs[c.id]})),obs:d.obs}}
async function salvaR(q){await rpc('report_salvar',{p_dia:S.rd,p_dados:coletaR()});if(!q)alert('Report salvo.')}
async function limpaR(){if(!confirm('Descartar as edições salvas e recalcular com os dados da produção?'))return;await rpc('report_limpar',{p_dia:S.rd});R()}
async function baixaR(){await salvaR(1);const p=payloadR();let x;try{x=await fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})}catch(e){return alert('Não foi possível gerar o Excel.')}
if(!x.ok)return alert('Não foi possível gerar o Excel: '+await x.text());const b=await x.blob(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='Report_producao_'+p.data+'_'+p.turno.replace(/\W/g,'')+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
function copiaR(){const p=payloadR(),L=['REPORT DE PRODUÇÃO DIÁRIA JBT',p.turno.toUpperCase()+' - '+fd(p.data)];
p.produtos.forEach(x=>{L.push('',x.codigo,...RCAMPOS.map(([k,rot])=>rot.replace(' (bipe o código de barras)','')+': '+(x[k]===''||x[k]==null?'-':fR(x[k]))))});
L.push('','Total de gelo em estoque: '+fR(p.estoque_gelo)+' pallet','Absenteísmo: '+(p.ausentes.length?p.ausentes.map(a=>`\n- ${a.nome}: ${a.motivo}`).join(''):'nenhum'),'Observação: '+(p.obs||'-'));const t=L.join('\n');
navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t).then(()=>alert('Resumo copiado.'),()=>prompt('Copie o resumo:',t)):prompt('Copie o resumo:',t)}
async function salvaCod(id){await rpc('admin_produto_codigo',{p_id:id,p_codigo:document.getElementById('pc'+id).value});alert('Código salvo.')}
// ---- Absorção geral da farinha (operador de ponte rolante) ----
async function salvaAbs(){const v=parseFloat(String(document.getElementById('fab').value).trim().replace(',','.'));if(!(v>0&&v<=200))return alert('Informe a absorção da farinha em %.');await rpc('farinha_absorcao_salvar',{p_valor:v});R()}
// ---- Absenteísmo: o líder adiciona só quem faltou ----
function drawAbs(){const el=document.getElementById('absb');if(!el)return;const r=S.RP.r,ab=S.RP.abs,cs=r.colaboradores,ids=cs.filter(c=>ab[c.id]),livres=cs.filter(c=>!ab[c.id]);
const sab=document.getElementById('sab');sab&&(sab.textContent=ids.length?`Ausentes: ${ids.length}`:'');
el.innerHTML=(ids.length?`<div class=wrap><table><tr><th>Colaborador<th>Motivo<th></tr>${ids.map(c=>`<tr><td>${esc(c.nome)}<td><select onchange="mudaAbs(${c.id},this.value)">${r.motivos.map(m=>`<option ${ab[c.id]===m?'selected':''}>${esc(m)}</option>`).join('')}</select><td><button onclick="remAbs(${c.id})">Remover</button></tr>`).join('')}</table></div>`:'<p>Nenhum ausente adicionado.</p>')+
(!cs.length?'<p>Nenhum colaborador cadastrado para este turno. O administrador cadastra na aba Admin.</p>':livres.length?`<div class=f><label>Colaborador<select id=abc><option value="">Escolha o colaborador</option>${livres.map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label><label>Motivo<select id=abm><option value="">Escolha o motivo</option>${r.motivos.map(m=>`<option>${esc(m)}</option>`).join('')}</select></label><button onclick=addAbs()>Adicionar ausente</button></div>`:'')}
function addAbs(){const c=document.getElementById('abc').value,m=document.getElementById('abm').value;if(!c||!m)return alert('Escolha o colaborador e o motivo.');S.RP.abs[c]=m;drawAbs()}
function mudaAbs(id,m){S.RP.abs[id]=m}
function remAbs(id){delete S.RP.abs[id];drawAbs()}
// ---- Imagem do report para compartilhar (WhatsApp) ----
const fvR=(v,d)=>{if(v===''||v==null)return '';if(d<0||typeof v!=='number')return String(v);return v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})};
const RIMG=[['ordem','Nº ORDEM',-1],['planejado','PLANEJADO',0],['produzido','PRODUZIDO',0],['pacotes','TOTAL DE PACOTES',0],['mr0036','MR0036 CONSUMIDOS',2],['mescla','MESCLA FARINHA',-1],['absorcao','ABSORÇÃO DE ÁGUA',-1],['mr0001','MR0001 CONSUMIDOS',2],['mr0036g','MR0036 GERADOS',2],['mr0027','MR0027 CONSUMIDOS',2],['gelo','PACOTES DE GELO',0]];
function imgR(p){return new Promise((ok,ko)=>{
const W=[250,215,26,215,270],X=[0];W.forEach((w,i)=>X.push(X[i]+w));const TW=X[5],M=12,SC=2,RH=40,TH=54,GAP=14,ft='Barlow,Arial,Helvetica,sans-serif',
AZ='#4472C4',ROT='#B4C6E7',LAR='#FFC000',VD='#00B050',CL='#DDEBF7',CZ='#D6DCE4',CZ2='#D9D9D9',VM='#FF0000';
let ctx=document.createElement('canvas').getContext('2d');
const wrap=(t,w)=>{const o=[];String(t).split('\n').forEach(par=>{let ln='';par.split(/\s+/).forEach(wd=>{const tt=ln?ln+' '+wd:wd;if(ln&&ctx.measureText(tt).width>w){o.push(ln);ln=wd}else ln=tt});o.push(ln)});return o};
const fit=(t,w,h,s0,b)=>{let s=s0,L;for(;s>=10;s--){ctx.font=`${b===false?400:700} ${s}px ${ft}`;L=wrap(t,w);if(L.length*s*1.2<=h&&L.every(l=>ctx.measureText(l).width<=w))break}return{s,L}};
const pares=[];for(let i=0;i<Math.max(p.produtos.length,1);i+=2)pares.push(p.produtos.slice(i,i+2));
const aus=p.ausentes.length?p.ausentes.map(a=>`${String(a.nome).toUpperCase()} (${a.motivo})`).join(' · '):'NENHUM';
const wABS=W[1]+W[2]+W[3];ctx.font=`700 18px ${ft}`;const hA=Math.max(RH,wrap(aus,wABS-16).length*22+16);
const H=M*2+pares.length*(TH+14*RH+hA)+(pares.length-1)*GAP;
const c=document.createElement('canvas');c.width=(TW+M*2)*SC;c.height=H*SC;ctx=c.getContext('2d');ctx.scale(SC,SC);ctx.fillStyle='#fff';ctx.fillRect(0,0,TW+M*2,H);
const cell=(x,y,w,h,fill,t,o)=>{o=o||{};ctx.fillStyle=fill||'#fff';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);if(t===''||t==null)return;
const f=fit(t,w-14,h-8,o.s||18,o.b),lh=f.s*1.2;ctx.font=`${o.b===false?400:700} ${f.s}px ${ft}`;ctx.fillStyle=o.c||'#000';ctx.textAlign='center';ctx.textBaseline='middle';
let y0=o.top?y+6+lh/2:y+h/2-(f.L.length-1)*lh/2;f.L.forEach((l,i)=>ctx.fillText(l,x+w/2,y0+i*lh))};
let y=M;pares.forEach((par,bi)=>{const first=bi===0,x=i=>M+X[i],w3=wABS;
cell(M,y,TW,TH,AZ,'REPORT DE PRODUÇÃO DIÁRIA JBT',{s:26,c:'#fff'});y+=TH;
cell(x(0),y,W[0],RH,ROT,'TURNO');cell(x(1),y,w3,RH,VD,String(p.turno).toUpperCase());cell(x(4),y,W[4],RH,CZ2,'OBSERVAÇÃO');y+=RH;
cell(x(0),y,W[0],RH,ROT,'DATA');cell(x(1),y,w3,RH,CL,fd(p.data));cell(x(4),y,W[4],RH,ROT,'total de gelo em estoque',{s:15,b:false});y+=RH;
cell(x(0),y,W[0],RH,ROT,'PRODUTO');[0,1].forEach(k=>{const q=par[k];cell(x(k?3:1),y,W[k?3:1],RH,LAR,q?(q.codigo||q.produto):'',{s:20})});cell(x(2),y,W[2],RH,CZ,'');
cell(x(4),y,W[4],RH,ROT,first&&p.estoque_gelo!==''&&p.estoque_gelo!=null?fR(p.estoque_gelo)+' pallet':'',{s:22});y+=RH;
RIMG.forEach(([k,rot,d],i)=>{cell(x(0),y,W[0],RH,ROT,rot,{s:16});[0,1].forEach(j=>{const q=par[j];cell(x(j?3:1),y,W[j?3:1],RH,LAR,q?fvR(q[k],d):'',{s:20})});cell(x(2),y,W[2],RH,CZ,'');
if(!(first&&i>=1))cell(x(4),y,W[4],RH,ROT,'');if(first&&i===1)cell(x(4),y,W[4],RH*10,ROT,p.obs,{s:18,top:true});y+=RH});
cell(x(0),y,W[0],hA,ROT,'ABSENTEÍSMO',{s:16});cell(x(1),y,w3,hA,VM,first?aus:'',{s:18,c:'#fff'});cell(x(4),y,W[4],hA,ROT,'');y+=hA+GAP});
c.toBlob(b=>b?ok(b):ko(new Error('Falha ao gerar a imagem')),'image/png')})}
function baixaImg(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
async function compartilhaR(){const p=payloadR();let b;try{b=await imgR(p)}catch(e){return alert('Não foi possível gerar a imagem do report.')}
salvaR(1).catch(()=>{});const n='Report_producao_'+p.data+'_'+p.turno.replace(/\W/g,'')+'.png',f=new File([b],n,{type:'image/png'});
if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:'Report de produção JBT'});return}catch(e){if(e&&e.name==='AbortError')return}}
baixaImg(b,n);alert('Este aparelho não abriu o compartilhamento. A imagem foi baixada: envie pelo WhatsApp a partir da galeria.')}
// ---- Leitura do código de barras pela câmera (nº da ordem) ----
const ZXURL='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
const carregaZX=()=>window.ZXing?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src=ZXURL;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
function fechaCam(){const c=S.cam;S.cam=null;if(c){try{c.stop&&c.stop()}catch(e){}c.ov.remove()}}
function camOk(txt){const c=S.cam;if(!c)return;const e=document.getElementById('rf_ordem_'+c.i);if(e)e.value=String(txt).trim();try{navigator.vibrate&&navigator.vibrate(120)}catch(e){}fechaCam()}
async function lerCam(i){if(S.cam)return;const ov=document.createElement('div');ov.className='cam';ov.innerHTML='<video playsinline muted></video><div class=camg></div><div class=camb><p>Aponte a câmera para o código de barras da ordem</p><button onclick=fechaCam()>Cancelar</button></div>';document.body.appendChild(ov);
const v=ov.querySelector('video');S.cam={ov,i};let ativo=true;
try{if('BarcodeDetector' in window){const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});v.srcObject=st;await v.play();S.cam.stop=()=>{ativo=false;st.getTracks().forEach(t=>t.stop())};
const det=new BarcodeDetector();(async()=>{while(ativo){try{const r=await det.detect(v);if(r.length){camOk(r[0].rawValue);return}}catch(e){}await new Promise(r=>setTimeout(r,200))}})()}
else{await carregaZX();const rd=new ZXing.BrowserMultiFormatReader();S.cam.stop=()=>{ativo=false;rd.reset()};rd.decodeFromVideoDevice(null,v,res=>{if(res&&ativo)camOk(res.getText())})}}
catch(e){fechaCam();alert('Não foi possível abrir a câmera. Permita o uso da câmera no navegador (o site precisa estar em https) e tente de novo.')}}
// ---- Report do dia anterior (líder do 1º turno): junta os reports dos 3 turnos ----
const TN={'1º turno':'1º','2º turno':'2º','3º turno':'3º'};
const GSEC=[['prod','Produção por produto',[['codigo','Código'],['turno','Turno'],['prog','Lotes programados','n'],['prod','Lotes produzidos','n'],['pacotes','Cxs/Pcts produzidos','n'],['op','Nº OP'],['ocorr','Ocorrências']],6],
['gelo','Informações do gelo',[['turno','Turno'],['pesados','Pacotes pesados','n'],['estoque','Estoque (pallets)','n']],3],
['abs','Absorção %',[['codigo','Código'],['turno','Turno'],['lotes','Lotes','n'],['pct','%'],['farinha','Farinha']],6],
['falt','Faltantes (até 6 por turno)',[['turno','Turno'],['nome','Nome'],['motivo','Motivo']],18],
['gerado','Reprocesso gerado (MR0036)',[['turno','Turno'],['kg','Qtde (kg)','n'],['pct','Qtde (pct, 7,5 kg cada)','r'],['motivo','Motivo']],4],
['cons','Reprocesso consumido',[['codigo','Código'],['turno','Turno'],['kg','Qtde (kg)','n']],6]];
function geralBase(g){const m={prod:[],gelo:[],abs:[],falt:[],gerado:[],cons:[]},avisos=[];
g.turnos.forEach(t=>{const T=TN[t.turno],d=t.dados;if(!d){avisos.push(`${t.turno}: sem produção neste dia.`);m.gelo.push({turno:T,pesados:'',estoque:''});return}
if(!d.salvo)avisos.push(`${t.turno}: o líder ainda não salvou o report; os dados vieram direto da produção.`);
const v=repVals(d),ps=v.produtos;
ps.forEach((p,i)=>{m.prod.push({codigo:p.codigo,turno:T,prog:p.planejado,prod:p.produzido,pacotes:p.pacotes,op:p.ordem,ocorr:i===0?v.obs:''});m.abs.push({codigo:p.codigo,turno:T,lotes:p.produzido,pct:p.absorcao,farinha:p.mescla})});
m.gelo.push({turno:T,pesados:ps.reduce((a,p)=>a+nR(p.gelo),0),estoque:v.estoque_gelo});
(d.colaboradores||[]).filter(c=>v.abs[c.id]).forEach(c=>m.falt.push({turno:T,nome:c.nome,motivo:v.abs[c.id]}));
const kg=ps.reduce((a,p)=>a+nR(p.mr0036g),0);m.gerado.push({turno:T,kg,motivo:kg>0?'':'N/ GEROU REPROCESSO'});
[['MR0036','mr0036'],['MR0001','mr0001'],['MR0027','mr0027']].forEach(([cod,k])=>{const s=ps.reduce((a,p)=>a+nR(p[k]),0);if(s>0)m.cons.push({codigo:cod,turno:T,kg:s})})});
return{m,avisos}}
function drawGeral(){const {m,avisos,salvo}=S.RG;
const sec=([k,tit,cols,cap])=>`<h3>${tit}${k!=='falt'&&m[k].length>cap?` <small class=aviso>${m[k].length} linhas; o modelo comporta ${cap}, as extras não vão para o Excel</small>`:''}</h3><div class=wrap><table><tr>${cols.map(c=>`<th>${c[1]}`).join('')}<th></tr>${m[k].map((row,i)=>`<tr>${cols.map(c=>c[2]==='r'?`<td id="gp_${i}">${fR(Math.round(nR(row.kg)/7.5*10)/10)}`:`<td><input id="g_${k}_${i}_${c[0]}" value="${esc(row[c[0]]==null?'':c[2]==='n'&&row[c[0]]!==''?fR(row[c[0]]):row[c[0]])}" ${c[2]==='n'?'inputmode=decimal':'autocomplete=off'}${k==='gerado'&&c[0]==='kg'?` oninput="document.getElementById('gp_${i}').textContent=fR(Math.round(nR(this.value)/7.5*10)/10)"`:''}>`).join('')}<td><button onclick="gDel('${k}',${i})">Remover</button></tr>`).join('')||`<tr><td colspan=${cols.length+1}>Sem linhas.</tr>`}</table></div><div class=foot><button onclick="gAdd('${k}')">Adicionar linha</button></div>`;
A.innerHTML=head()+nav()+`<main class=rep><h2>Report do dia anterior</h2><div class=f><label>Dia da produção<input type=date value="${S.rgd}" onchange="S.rgd=this.value;R()"></label></div>
${salvo?'<p>Mostrando o report geral que você já salvou para este dia. Use <b>Recalcular</b> para voltar aos dados dos líderes.</p>':''}${avisos.map(a=>`<p class=aviso>${esc(a)}</p>`).join('')}
${GSEC.map(sec).join('')}
<div class=foot><button class=big onclick=gSalva()>Salvar</button><button class=big onclick=gBaixa()>Baixar Excel</button><button onclick=gLimpa()>Recalcular (descartar edições)</button></div></main>`}
function gSync(){GSEC.forEach(([k,,cols])=>{S.RG.m[k]=S.RG.m[k].map((row,i)=>{const o={};cols.filter(c=>c[2]!=='r').forEach(c=>{const e=document.getElementById(`g_${k}_${i}_${c[0]}`),x=e?e.value.trim():row[c[0]];o[c[0]]=c[2]==='n'?(x===''?'':nR(x)):x});return o})})}
function gAdd(k){gSync();S.RG.m[k].push({});drawGeral()}
function gDel(k,i){gSync();S.RG.m[k].splice(i,1);drawGeral()}
async function gSalva(q){gSync();await rpc('report_geral_salvar',{p_data:S.rgd,p_dados:{m:S.RG.m}});if(!q)alert('Report do dia anterior salvo.')}
async function gLimpa(){if(!confirm('Descartar as edições e recalcular com os reports dos líderes?'))return;await rpc('report_geral_limpar',{p_data:S.rgd});R()}
async function gBaixa(){gSync();const m=S.RG.m,ex=GSEC.filter(([k,,,cap])=>k!=='falt'&&m[k].length>cap).map(s=>s[1]);['1º','2º','3º'].forEach(t=>{if(m.falt.filter(f=>f.turno===t).length>6)ex.push('Faltantes '+t)});
if(ex.length&&!confirm('Há mais linhas do que o modelo comporta em: '+ex.join(', ')+'. As linhas extras não vão para o Excel. Baixar mesmo assim?'))return;
await gSalva(1);let x;try{x=await fetch('/api/report_geral',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:S.rgd,m})})}catch(e){return alert('Não foi possível gerar o Excel.')}
if(!x.ok)return alert('Não foi possível gerar o Excel: '+await x.text());const b=await x.blob(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='Report_do_dia_anterior_'+S.rgd+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
async function addc(){await rpc('admin_colaborador',{p_nome:document.getElementById('cn').value,p_turno:document.getElementById('ct').value});R()}
async function delc(id){if(confirm('Excluir este colaborador da lista?')){await rpc('admin_excluir_colaborador',{p_id:id});R()}}
async function addmot(){await rpc('admin_motivo_abs',{p_nome:document.getElementById('nmo').value});R()}
async function delmot(n){if(confirm('Excluir o motivo '+n+'?')){await rpc('admin_excluir_motivo_abs',{p_nome:n});R()}}
function drawHist(){const adm=S.perfil==='admin',lid=S.perfil==='lider',h=S.H.filter(x=>!adm||((!S.hd||x.data===S.hd)&&(!S.ht||x.turno===S.ht)));
A.innerHTML=head()+(adm?`<nav><button onclick="go('admin')">Voltar ao admin</button></nav>`:nav())+`<main><h2>Histórico de produção</h2>${adm?`<div class=f><label>Dia<input type=date value="${S.hd||''}" onchange="S.hd=this.value;drawHist()"></label><label>Turno<select onchange="S.ht=this.value;drawHist()"><option value="">Todos</option>${TURNOS.map(t=>`<option ${S.ht===t?'selected':''}>${t}</option>`).join('')}</select></label></div>`:''}${h.length?h.map(x=>`<div class=row><div><small>${fd(x.data)}${x.status==='aberto'?' (em andamento)':x.status==='encerrando'?' (encerrando: massas ainda batendo)':''}</small><b>${esc(x.turno)}</b></div><div><small>Total de massas</small><b>${x.total}</b></div><div><small>Meta</small>${x.meta||'—'}</div><div><small>Por produto</small>${x.por_produto?Object.entries(x.por_produto).map(([k,v])=>esc(k)+': '+v).join(' / '):'—'}</div>${adm?`<span class=acoes><button onclick="baixar(${x.id})">Baixar Excel</button><button onclick="baixar(${x.id},'farinha')">Excel da farinha</button><button class=perigo onclick="excluirDia(${x.id})">Excluir</button></span>`:''}${lid?`<button onclick="verDia(${x.id})">Ver produção</button>`:''}</div>`).join(''):'<p>Nenhum dia registrado.</p>'}</main>`}
function drawAdmin(){const a=S.AD,u=a.usuarios.find(x=>x.id===S.eu)||{};
A.innerHTML=head()+`<nav><button onclick="go('hist')">Histórico de produção</button><button onclick="sair()">Sair</button></nav><main><h2>Usuários e senhas</h2><div class=wrap><table><tr><th>Nome<th>Acesso<th>Turno<th></tr>${a.usuarios.map(x=>`<tr><td>${esc(x.nome)}<td>${x.perfil}<td>${esc(x.turno||'—')}<td><button onclick="S.eu=${x.id};R()">Editar</button> <button onclick="delu(${x.id})">Excluir</button></tr>`).join('')}</table></div>
<h3>${u.id?'Editar usuário':'Novo usuário'}</h3><div class=f><label>Nome<input id=un value="${esc(u.nome)}"></label><label>Acesso<select id=up>${['operador','lider','admin','farinha'].map(x=>`<option ${u.perfil===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Turno<select id=ut>${TURNOS.map(t=>`<option ${u.turno===t?'selected':''}>${t}</option>`).join('')}</select></label><label>Senha${u.id?' (vazio mantém)':''}<input id=us type=text autocomplete=off></label><button class=big onclick=salvau()>Salvar</button>${u.id?'<button onclick="S.eu=null;R()">Cancelar</button>':''}</div>
<h2>Produtos</h2><div class=wrap><table>${a.produtos.map(p=>`<tr><td>${esc(p.nome)}<td><input id="pc${p.id}" value="${esc(p.codigo||'')}" placeholder="Código (ex.: PF0005)" style="width:170px"> <button onclick="salvaCod(${p.id})">Salvar código</button><td><button onclick="delp(${p.id})">Excluir</button></tr>`).join('')}</table></div><div class=f><label>Novo produto<input id=np></label><button class=big onclick=addp()>Adicionar produto</button></div>
<h2>Colaboradores por turno</h2><div class=wrap><table>${((S.RH||{}).colaboradores||[]).map(c=>`<tr><td>${esc(c.nome)}<td>${esc(c.turno)}<td><button onclick="delc(${c.id})">Excluir</button></tr>`).join('')}</table></div><div class=f><label>Nome<input id=cn></label><label>Turno<select id=ct>${TURNOS.map(t=>`<option>${t}</option>`).join('')}</select></label><button class=big onclick=addc()>Adicionar colaborador</button></div>
<h2>Motivos de absenteísmo</h2><div class=wrap><table>${((S.RH||{}).motivos||[]).map(n=>`<tr><td>${esc(n)}<td><button data-n="${esc(n)}" onclick="delmot(this.dataset.n)">Excluir</button></tr>`).join('')}</table></div><div class=f><label>Novo motivo<input id=nmo></label><button class=big onclick=addmot()>Adicionar motivo</button></div>
<h2>Moinhos de farinha</h2><p>Para mostrar o logo, coloque a imagem em <b>img/moinhos/</b> com o nome do moinho em minúsculas (ex.: bunge.png).</p><div class=wrap><table>${(a.moinhos||[]).map(n=>`<tr><td>${esc(n)}<td><button data-n="${esc(n)}" onclick="delm(this.dataset.n)">Excluir</button></tr>`).join('')}</table></div><div class=f><label>Novo moinho<input id=nm></label><button class=big onclick=addm()>Adicionar moinho</button></div>
<h2>Receitas de batimento</h2><datalist id=tp><option value="Amassar cf. tempo"><option value="Esvaziamento"></datalist>${a.produtos.map(p=>`<h3>${esc(p.nome)}</h3><div class=wrap><table><tr><th>Etapa<th>Tempo (s)<th>Ferramenta<th>Tina<th></tr>${(p.batimento||[]).map((e,i)=>`<tr><td><input list=tp id="b${p.id}_${i}_a" value="${esc(e.tipo)}"><td><input type=number step=any style="width:110px" id="b${p.id}_${i}_b" value="${e.tempo}"><td><input type=number step=any style="width:90px" id="b${p.id}_${i}_d" value="${e.ferramenta}"><td><input type=number step=any style="width:90px" id="b${p.id}_${i}_c" value="${e.tina}"><td><button onclick="remEt(${p.id},${i})">Remover</button></tr>`).join('')}</table></div><div class=foot><button onclick="addEt(${p.id})">Adicionar etapa</button></div><label>Observações<textarea id="r${p.id}">${esc(p.receita)}</textarea></label><div class=foot><button class=big onclick="salvar(${p.id})">Salvar receita</button></div>`).join('')}</main>`}
const nf=v=>Number(v||0).toFixed(1).replace('.',',');
const etTab=l=>l.length?`<div class=wrap><table><tr><th>Etapa<th>Tempo (s)<th>Ferramenta<th>Tina</tr>${l.map((e,i)=>`<tr><td>${i+1}. ${esc(e.tipo)}<td>${nf(e.tempo)}<td>${esc(e.ferramenta)}<td>${esc(e.tina)}</tr>`).join('')}</table></div>`:'<small>Batimento ainda não cadastrado</small>';
const rowA=b=>`<div class="row on"><div><small>Turno</small><b>${esc(b.turno)}</b></div><div><small>Lote</small><b>${b.lote}</b></div><div><small>Produto</small>${esc(b.produto)}</div><div><small>Início</small>${hm(b.inicio)}</div><div><small>Diosna</small>${b.diosna}</div><div><small>Responsável</small>${esc(b.operador||'—')}</div><button class=big onclick="fim(${b.id})">Fim da batelada</button></div>`;
function row(b,bloq){if(b)return `<div class="row on"><div><small>Lote</small><b>${b.lote}</b></div><div><small>Produto</small>${esc(b.produto)}</div><div><small>Início</small>${hm(b.inicio)}</div><div><small>Fim</small>Produzindo</div><div><small>Fermento</small>✔</div><div><small>Gelo</small>✔</div><div><small>Reprocesso</small>${rp(b)}</div><div><small>Diosna</small>${b.diosna}</div><div class=mesc><small>Mescla de farinha</small>${mescT(b)}</div><div class=stt>Batendo</div><button class=big onclick="fim(${b.id})">Fim da batelada</button></div>`;
return `<div class=row><div><small>Lote</small><b>${S.E.dia.contador+1}</b></div><div class=st>${bloq?'Aguardando fim do batimento':'Diosna liberada'}</div><button class=big onclick=ini() ${bloq?'disabled style="opacity:.4;cursor:not-allowed"':''}>Iniciar nova batelada</button></div>`}
function tabela(l,all,nm){return `<div class=wrap><table><tr><th>Produto<th>Lote<th>Início<th>Fim<th>Reprocesso<th>Diosna${nm?'':'<th>Mescla de farinha'}<th>Temperatura<th>Operador${all?'<th>Status':''}</tr>${l.length?l.map(b=>`<tr><td>${esc(b.produto)}<td>${b.lote}<td>${hm(b.inicio)}<td>${hm(b.fim)}<td>${rp(b)}<td>${b.diosna}${nm?'':`<td class=mesc>${mescT(b)}`}<td>${b.temperatura==null?'—':String(b.temperatura).replace('.',',')+'ºC'}<td>${esc(b.operador||'—')}${all?`<td>${b.status}`:''}</tr>`).join(''):'<tr><td colspan=${nm?9:10}>Nenhuma batelada ainda.</tr>'}</table></div>`}
async function ent(){const pf=PERFIL,{data,error}=await sb.rpc('login',{p_perfil:pf,p_turno:['admin','farinha'].includes(pf)?null:document.getElementById('t').value,p_senha:document.getElementById('p').value});
if(error)return document.getElementById('er').textContent=error.message;S.token=data.token;S.perfil=data.perfil;S.turno=data.turno;S.nome=data.nome;S.E=null;go(home0())}
async function resumoFechando(){const r=await rpc('historico_dia',{p_dia:S.E.fechando.id}),m=sum(r.bateladas.filter(b=>b.status==='Finalizada')),nb=r.bateladas.filter(b=>b.status==='Batendo').length;
A.innerHTML=head()+nav()+`<main><h2>Produção do Dia</h2><p><b>Turno encerrado.</b> ${nb} massa${nb==1?'':'s'} ainda ${nb==1?'está':'estão'} batendo, aguardando o próximo turno finalizar. O total pode aumentar.</p>${metaHtml(r.dia.meta,m.t,'Meta não definida neste dia')}${stats(m)}${S.perfil==='lider'?`<h3>Bateladas</h3>${tabela(r.bateladas.slice().reverse(),1)}`:''}</main>`}
function verDia(id){S.hid=id;go('hdia')}
function sair(){S.token=null;S.E=null;go('login')}
async function inicia(){S.mode=S.E.dia?'':'iniciar';go(S.E.dia?'main':'prod')}
async function pick(id){await rpc(S.E.dia?'trocar_produto':'iniciar_dia',{p_produto:id});go('main')}
function ini(){let o='';try{o=localStorage.getItem('mq_op')||''}catch(e){}S.w={ini:new Date().toISOString(),step:0,rep:[],op:o};go('wiz')}
function nx(){S.w.step++;R()}
function tg(x){const r=S.w.rep,i=r.indexOf(x);i<0?r.push(x):r.splice(i,1);R()}
function dio(n){S.w.dio=n;S.w.step=4;R()}
async function iniciaB(){const w=S.w,o=(w.op||'').trim();if(!o)return document.getElementById('er').textContent='Informe o operador responsável.';try{localStorage.setItem('mq_op',o)}catch(e){}S.mescla=await rpc('iniciar_batelada',{p_linha:w.rep.includes('Linha'),p_cong:w.rep.includes('Congelado'),p_diosna:w.dio,p_inicio:w.ini,p_op:o});S.w=null;go('mescla')}
function fim(id){S.w={id,fim:new Date().toISOString(),temp:''};go('fim')}
function key(k){let t=S.w.temp;if(k==='⌫')t=t.slice(0,-1);else if(k===','){if(!t.includes(',')&&t)t+=','}else if(t.length<5)t+=k;S.w.temp=t;document.getElementById('tv').textContent=t||'0'}
async function ok(){const w=S.w,t=parseFloat(w.temp.replace(',','.'));if(isNaN(t))return document.getElementById('er').textContent='Informe a temperatura da massa.';
await rpc('finalizar_batelada',{p_id:w.id,p_temp:t,p_op:null,p_fim:w.fim});S.w=null;go('main')}
async function fecha(){S.fin=true;go('resumo')}
async function encerra(){const nb=S.E.bateladas.filter(b=>b.status==='Batendo').length;if(!confirm(nb?`Ainda há ${nb} massa${nb==1?'':'s'} batendo. ${nb==1?'Ela será finalizada':'Elas serão finalizadas'} pelo operador do próximo turno e ${nb==1?'continua contando':'continuam contando'} neste turno. Encerrar o turno mesmo assim?`:'Encerrar o seu turno?'))return;await rpc('encerrar_dia');S.fin=false;go('home')}
async function salvau(){const g=i=>document.getElementById(i).value;await rpc('admin_usuario',{p_id:S.eu||null,p_nome:g('un'),p_perfil:g('up'),p_turno:g('ut'),p_senha:g('us')});S.eu=null;R()}
async function delu(id){if(confirm('Excluir este usuário?')){await rpc('admin_excluir_usuario',{p_id:id});R()}}
async function salvameta(){const v=document.getElementById('mt').value;if(v==='')return alert('Informe a meta.');await rpc('definir_meta',{p_meta:parseInt(v)});R()}
async function addp(){await rpc('admin_produto',{p_nome:document.getElementById('np').value});R()}
async function delp(id){if(confirm('Excluir este produto? O histórico antigo é mantido.')){await rpc('admin_excluir_produto',{p_id:id});R()}}
const prodAD=id=>S.AD.produtos.find(p=>p.id===id);
function colet(id){const p=prodAD(id),g=(i,k)=>document.getElementById('b'+id+'_'+i+'_'+k);return (p.batimento||[]).map((_,i)=>({tipo:g(i,'a').value.trim(),tempo:parseFloat(g(i,'b').value)||0,tina:parseFloat(g(i,'c').value)||0,ferramenta:parseFloat(g(i,'d').value)||0}))}
function addEt(id){const p=prodAD(id);p.batimento=colet(id);p.batimento.push({tipo:'Amassar cf. tempo',tempo:0,tina:0,ferramenta:0});drawAdmin()}
function remEt(id,i){const p=prodAD(id);p.batimento=colet(id);p.batimento.splice(i,1);drawAdmin()}
async function salvar(id){const p=prodAD(id),et=colet(id).filter(e=>e.tipo);await rpc('admin_batimento',{p_produto:id,p_etapas:et});await rpc('admin_receita',{p_produto:id,p_texto:document.getElementById('r'+id).value});p.batimento=et;drawAdmin();alert('Receita salva.')}
async function baixar(id,t){const d=await rpc('admin_dia',{p_dia:id});let r;try{r=await fetch('/api/'+(t==='farinha'?'farinha':'excel'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})}catch(e){return alert('Não foi possível gerar o Excel.')}
if(!r.ok)return alert('Não foi possível gerar o Excel: '+await r.text());const b=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(t==='farinha'?'Farinha_':'FM-000219_')+d.data+'_'+d.turno.replace(/\W/g,'')+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
// ---- Farinha: massas produzidas no turno que está em produção nas masseiras ----
const massasHtml=()=>{const M=S.FM;if(M==null)return '<div class=meta><span>Contagem de massas indisponível</span></div>';return M.length?`<div class=meta>${M.map(d=>`<span>Massas produzidas · ${esc(d.turno)}<b>${d.total}</b></span>`).join('')}</div>`:'<div class=meta><span>Nenhuma produção em andamento nas masseiras</span></div>'};
async function fetchMassas(){try{const {data,error}=await sb.rpc('farinha_massas',{p_token:S.token});return error?null:data}catch(e){return null}}
async function atualizaMassas(){S.FM=await fetchMassas();const e=document.getElementById('fm2');if(e)e.innerHTML=massasHtml()}
setInterval(()=>{if(PERFIL==='farinha'&&S.v==='farinha'&&S.token)atualizaMassas()},30000);
// ---- Modo treinamento: tudo local no navegador, sem Supabase ----
const DK='mq_demo_db',DP=['Pão Francês 6H','Pão Francês 90g','Pão Francês Proteico','Pão Francês 12h','Pão Cará','Integral','Massa Madre'];
const DB=()=>{try{return JSON.parse(localStorage.getItem(DK))||{dia:null,b:[],hist:[],meta:null,seq:1}}catch(e){return {dia:null,b:[],hist:[],meta:null,seq:1}}};
function demoRpc(fn,a){const D=DB(),sv=()=>{try{localStorage.setItem(DK,JSON.stringify(D))}catch(e){}},err=m=>{alert(m);throw new Error(m)},nome=id=>DP[id-1],f=D.b.filter(b=>b.status==='Finalizada');D.ant=D.ant||[];
if(fn==='estado')return{produtos:DP.map((n,i)=>({id:i+1,nome:n,receita:'',batimento:i===0?[{tipo:'Amassar cf. tempo',tempo:130,tina:30,ferramenta:40},{tipo:'Amassar cf. tempo',tempo:340,tina:55,ferramenta:40},{tipo:'Amassar cf. tempo',tempo:180,tina:40,ferramenta:35},{tipo:'Esvaziamento',tempo:50,tina:30,ferramenta:40}]:[]})),meta:D.meta,dia:D.dia?{id:1,turno:'Treinamento',contador:D.dia.contador,produto_id:D.dia.pid,produto:nome(D.dia.pid)}:null,bateladas:D.b.map(b=>Object.assign({},b,{produto:nome(b.pid)})),anteriores:D.ant.map(b=>Object.assign({},b,{produto:nome(b.pid),turno:'Turno anterior'})),diosnas_ocupadas:D.b.concat(D.ant).filter(b=>b.status==='Batendo').map(b=>b.diosna),fechando:null};
if(fn==='iniciar_dia'){if(!D.dia)D.dia={pid:a.p_produto,contador:0}}
else if(fn==='trocar_produto'){D.dia.pid=a.p_produto;D.dia.contador=0}
else if(fn==='iniciar_batelada'){if(D.b.concat(D.ant).some(b=>b.status==='Batendo'&&b.diosna===a.p_diosna))err('Esta Diosna já está batendo');D.dia.contador++;D.b.push({id:D.seq++,lote:D.dia.contador,pid:D.dia.pid,inicio:a.p_inicio,fim:null,rep_linha:a.p_linha,rep_congelado:a.p_cong,diosna:a.p_diosna,farinha:mescDemo(D.b.length+1).farinha,temperatura:null,operador:a.p_op||null,status:'Batendo'})}
else if(fn==='finalizar_batelada'){const x=D.b.find(y=>y.id===a.p_id)||D.ant.find(y=>y.id===a.p_id);Object.assign(x,{fim:a.p_fim,temperatura:a.p_temp,status:'Finalizada'});if(x.hid){const h=D.hist.find(y=>y.id===x.hid);if(h){const n=nome(x.pid);h.total++;h.por_produto=h.por_produto||{};h.por_produto[n]=(h.por_produto[n]||0)+1}D.ant=D.ant.filter(y=>y.id!==x.id)}}
else if(fn==='encerrar_dia'){const p={},hid=D.hist.length+1;f.forEach(b=>{const n=nome(b.pid);p[n]=(p[n]||0)+1});D.ant=D.ant.concat(D.b.filter(b=>b.status==='Batendo').map(b=>Object.assign({},b,{hid})));D.hist.push({id:hid,data:new Date().toISOString().slice(0,10),turno:'Treinamento',meta:D.meta,status:'encerrado',total:f.length,por_produto:f.length?p:null});D.dia=null;D.b=[];D.meta=null}
else if(fn==='definir_meta'){D.meta=a.p_meta}
else if(fn==='historico'){return D.hist.slice().reverse()}
sv();return fn==='iniciar_batelada'?mescDemo(D.b.length):null}
const mescDemo=n=>({farinha:[{moega:1,moinho:n>=3?'Realta':'Bunge',lote:n>=3?'202604':'20261003'},{moega:2,moinho:'Realta',lote:'202603'}],trocas:n===3?[{moega:1,de:{moinho:'Bunge',lote:'20261003'},para:{moinho:'Realta',lote:'202604'}}]:[],proximas:n===2?[{moega:1,moinho:'Realta',lote:'202604'}]:[]});
function zerar(){if(!confirm('Zerar o treinamento? Todas as bateladas, metas e o histórico de teste serão apagados.'))return;try{localStorage.removeItem(DK)}catch(e){}S.E=null;S.w=null;S.fin=false;go('home')}
function metaDemo(){const v=prompt('Meta do dia (massas):');if(v===null||v.trim()==='')return;demoRpc('definir_meta',{p_meta:parseInt(v)||0});R()}

R();
