
const {SU,SK}=window.CONFIG,PERFIL=window.PERFIL||'operador',NOMES={operador:'Operador',lider:'Líder',admin:'Administrador'},K='mq_'+PERFIL;
const sb=supabase.createClient(SU,SK),TURNOS=['1º turno','2º turno','3º turno'],A=document.getElementById('app');
let S={v:'login',w:null,fin:false,mode:'iniciar'};try{Object.assign(S,JSON.parse(localStorage.getItem(K)||'{}'))}catch(e){}
if(S.perfil&&S.perfil!==PERFIL){S.token=null;S.perfil=null}
const save=()=>{try{localStorage.setItem(K,JSON.stringify({token:S.token,perfil:S.perfil,turno:S.turno,nome:S.nome,v:S.v}))}catch(e){}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hm=t=>t?new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—';
const fd=d=>d?d.split('-').reverse().join('/'):'';
const SV=p=>`<svg class=ic viewBox="0 0 120 120" width=240 height=240 aria-hidden=true fill=none stroke=currentColor stroke-width=6 stroke-linejoin=round stroke-linecap=round>${p}</svg>`;
const IC=[SV('<path d="M30 12h60v12H30z"/><path d="M30 24h60l6 84H24z"/><path d="M42 60q18-14 36 0M42 82q18-14 36 0"/>'),SV('<path d="M60 12l42 24v48L60 108 18 84V36z"/><path d="M18 36l42 24 42-24M60 60v48"/>')];
async function rpc(fn,a){const {data,error}=await sb.rpc(fn,Object.assign({p_token:S.token},a||{}));if(error){if(/Sessão inválida/.test(error.message)){S.token=null;go('login')}else alert(error.message);throw error}return data}
const go=v=>{S.v=v;save();R()};
async function R(){if(!S.token&&S.v!=='login')S.v='login';try{await V[S.v]()}catch(e){console.error(e)}}
const rp=b=>[b.rep_congelado?'C':'',b.rep_linha?'L':''].filter(Boolean).join('/')||'—';
const done=()=>S.E.bateladas.filter(b=>b.status==='Finalizada');
const dh=()=>{const d=new Date();return `<span class=d>${d.toLocaleDateString('pt-BR')}</span><span>${d.toLocaleDateString('pt-BR',{weekday:'long'})}</span>`};
function head(){const d=S.E&&S.E.dia;return `<header>${dh()}<span>${esc(S.perfil==='admin'?'Administrador':S.turno)}</span>${d&&S.perfil==='operador'?`<span class=pa>Produto atual: <b>${esc(d.produto)}</b></span>`:''}</header>`}
function nav(){const o=S.perfil==='operador',l=S.perfil==='lider';return `<nav>${o?`<button onclick="go('${S.E&&S.E.dia?'main':'home'}')">Bateladas</button>`:''}${o||l?`<button onclick="S.fin=false;go('resumo')">Produção do Dia</button>`:''}<button onclick="go('hist')">Histórico de produção</button>${o?`<button onclick="go('rec')">Receitas (batimentos)</button>`:''}${l?`<button onclick="go('resumo')">Atualizar</button>`:''}<button onclick="sair()">Sair</button></nav>`}
const home0=()=>S.perfil==='admin'?'admin':S.perfil==='lider'?'resumo':(S.E&&S.E.dia?'main':'home');
async function load(){S.E=await rpc('estado')}
function sum(f){const p={};f.forEach(b=>p[b.produto]=(p[b.produto]||0)+1);const t=f.length;let h='—';if(t){const hr=(Math.max(...f.map(b=>Date.parse(b.fim)))-Math.min(...f.map(b=>Date.parse(b.inicio))))/36e5;if(hr>0)h=(t/hr).toFixed(1).replace('.',',')}
return{t,p,h,tp:t?(f.reduce((a,b)=>a+Number(b.temperatura),0)/t).toFixed(1).replace('.',',')+'ºC':'—',c:f.filter(b=>b.rep_congelado).length,l:f.filter(b=>b.rep_linha).length}}
function metaBar(){const m=S.E.meta;if(m==null)return `<div class=meta><span>META: a definir pelo líder</span></div>`;const f=done().length;return `<div class=meta><span>Meta do dia<b>${m}</b></span><span>Feitas<b>${f}</b></span><span>Faltam<b>${Math.max(m-f,0)}</b></span></div>`}
const metaForm=()=>S.perfil==='lider'?`<div class=f><label>Meta do dia (massas)<input type=number min=0 id=mt value="${S.E.meta??''}"></label><button class=big onclick=salvameta()>Salvar meta</button></div>`:''
const V={
login(){A.innerHTML=`<main class=c><h1>Controle de Bateladas</h1><h2>${NOMES[PERFIL]}</h2>${PERFIL==='admin'?'':`<label>Turno<select id=t>${TURNOS.map(t=>`<option>${t}</option>`).join('')}</select></label>`}<label>Senha<input id=p type=password autocomplete=off></label><button class=big onclick=ent()>Entrar</button><p class=er id=er></p></main>`},
async home(){await load();A.innerHTML=head()+nav()+`<div class=ctr><button class=big onclick=inicia()>${S.E.dia?'CONTINUAR PRODUÇÃO DE HOJE':'INICIAR PRODUÇÃO DE HOJE'}</button></div>`},
async prod(){await load();A.innerHTML=head()+`<main><h2>Escolha o produto</h2><div class=grid>${S.E.produtos.map(p=>`<button onclick="pick(${p.id})">${esc(p.nome)}</button>`).join('')}</div>${S.E.dia?`<div class=foot><button onclick="go('main')">Voltar</button></div>`:''}</main>`},
async main(){await load();if(!S.E.dia)return go('home');const act=S.E.bateladas.filter(b=>b.status==='Batendo').sort((a,b)=>a.diosna-b.diosna),f=done();
A.innerHTML=head()+nav()+`<main>${metaBar()}<h2>Bateladas</h2>${[0,1].map(i=>row(act[i])).join('')}<div class=foot><button onclick="go('prod')">Trocar de produto</button><button onclick=fecha()>Finalizar a produção de hoje</button></div><h2>Finalizadas hoje</h2>${tabela(f.slice().reverse())}</main>`},
wiz(){const w=S.w,st=w.step;let h='';
if(st<2){h=`<div class=ing>${IC[st]}<h2>${st?'Gelo':'Fermento'}</h2><p>Confirma que acrescentou o item?</p><button class=big onclick=nx()>SIM</button></div>`}
else if(st==2){h=`<h2>Reprocesso</h2><p>Marque o que foi usado nesta batelada.</p><div class=grid>${['Congelado','Linha'].map(x=>`<button class="${w.rep.includes(x)?'sel':''}" onclick="tg('${x}')">${x.toUpperCase()}</button>`).join('')}</div><div class=foot><button class=big onclick=nx()>${w.rep.length?'Continuar':'Não usou reprocesso, continuar'}</button></div>`}
else{const oc=n=>S.E.bateladas.some(b=>b.status==='Batendo'&&b.diosna===n);h=`<h2>Qual Diosna está batendo?</h2><div class=grid>${[1,2].map(n=>`<button ${oc(n)?'disabled':''} onclick="dio(${n})">${n}</button>`).join('')}</div>`}
A.innerHTML=head()+`<main>${h}<div class=foot><button onclick="S.w=null;go('main')">Cancelar batelada</button></div></main>`},
fim(){const w=S.w;A.innerHTML=head()+`<main><h2>Fim da Batelada</h2><p>Hora fim: <b>${hm(w.fim)}</b></p><p>Temperatura da massa</p><div class=tv><span id=tv>${w.temp||'0'}</span> ºC</div><div class=kp>${[7,8,9,4,5,6,1,2,3,',',0,'⌫'].map(k=>`<button onclick="key('${k}')">${k}</button>`).join('')}</div><label>Operador responsável<input id=op value="${esc(w.op)}" oninput="S.w.op=this.value"></label><div class=foot><button class=big onclick=ok()>Confirmar fim da batelada</button><button onclick="S.w=null;go('main')">Voltar</button></div><p class=er id=er></p></main>`},
async resumo(){await load();const d=S.E.dia;if(!d){A.innerHTML=head()+nav()+`<main>${metaBar()}${metaForm()}<h2>Produção do Dia</h2><p>Nenhuma produção em andamento neste turno.</p></main>`;return}
const m=sum(done());A.innerHTML=head()+nav()+`<main>${metaBar()}${metaForm()}<h2>Produção do Dia</h2><p>Total de massas</p><div class=tot>${m.t}</div>${Object.entries(m.p).map(([k,v])=>`<div class=kv><span>Massas ${esc(k)}</span><b>${v}</b></div>`).join('')}<div class=kv><span>Média massa/hora</span><b>${m.h}</b></div><div class=kv><span>Média temperatura total</span><b>${m.tp}</b></div><div class=kv><span>Reprocesso Congelado</span><b>${m.c}</b></div><div class=kv><span>Reprocesso Linha</span><b>${m.l}</b></div>${S.fin?`<div class=foot><button class=big onclick=encerra()>Encerrar produção do dia</button><button onclick="go('main')">Voltar</button></div>`:''}${S.perfil==='lider'?`<h3>Bateladas</h3>${tabela(S.E.bateladas.slice().reverse(),1)}`:''}</main>`},
async hist(){const h=await rpc('historico');if(!S.E&&S.perfil!=='admin')await load();A.innerHTML=head()+(S.perfil==='admin'?`<nav><button onclick="go('admin')">Voltar ao admin</button></nav>`:nav())+`<main><h2>Histórico de produção</h2>${h.length?h.map(x=>`<div class=row><div><small>${fd(x.data)}${x.status==='aberto'?' (em andamento)':''}</small><b>${esc(x.turno)}</b></div><div><small>Total de massas</small><b>${x.total}</b></div><div><small>Meta</small>${x.meta||'—'}</div><div><small>Por produto</small>${x.por_produto?Object.entries(x.por_produto).map(([k,v])=>esc(k)+': '+v).join(' / '):'—'}</div></div>`).join(''):'<p>Nenhum dia registrado ainda.</p>'}</main>`},
async rec(){await load();A.innerHTML=head()+nav()+`<main><h2>Receitas (batimentos)</h2>${S.E.produtos.map(p=>`<div class=row><div><b>${esc(p.nome)}</b><div class=pre>${p.receita?esc(p.receita):'<small>Batimento ainda não cadastrado</small>'}</div></div></div>`).join('')}</main>`},
async admin(){S.AD=await rpc('admin_listar');const a=S.AD,u=a.usuarios.find(x=>x.id===S.eu)||{};
A.innerHTML=head()+`<nav><button onclick="go('hist')">Histórico de produção</button><button onclick="sair()">Sair</button></nav><main><h2>Usuários e senhas</h2><div class=wrap><table><tr><th>Nome<th>Acesso<th>Turno<th></tr>${a.usuarios.map(x=>`<tr><td>${esc(x.nome)}<td>${x.perfil}<td>${esc(x.turno||'—')}<td><button onclick="S.eu=${x.id};R()">Editar</button> <button onclick="delu(${x.id})">Excluir</button></tr>`).join('')}</table></div>
<h3>${u.id?'Editar usuário':'Novo usuário'}</h3><div class=f><label>Nome<input id=un value="${esc(u.nome)}"></label><label>Acesso<select id=up>${['operador','lider','admin'].map(x=>`<option ${u.perfil===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Turno<select id=ut>${TURNOS.map(t=>`<option ${u.turno===t?'selected':''}>${t}</option>`).join('')}</select></label><label>Senha${u.id?' (vazio mantém)':''}<input id=us type=text autocomplete=off></label><button class=big onclick=salvau()>Salvar</button>${u.id?'<button onclick="S.eu=null;R()">Cancelar</button>':''}</div>
<h2>Produtos</h2><div class=wrap><table>${a.produtos.map(p=>`<tr><td>${esc(p.nome)}<td><button onclick="delp(${p.id})">Excluir</button></tr>`).join('')}</table></div><div class=f><label>Novo produto<input id=np></label><button class=big onclick=addp()>Adicionar produto</button></div>
<h2>Receitas de batimento</h2>${a.produtos.map(p=>`<h3>${esc(p.nome)}</h3><textarea id="r${p.id}">${esc(p.receita)}</textarea><div class=foot><button onclick="salvar(${p.id})">Salvar receita</button></div>`).join('')}</main>`}};
function row(b){if(b)return `<div class="row on"><div><small>Batelada</small><b>${b.lote}</b></div><div><small>Produto</small>${esc(b.produto)}</div><div><small>Início</small>${hm(b.inicio)}</div><div><small>Fim</small>Produzindo</div><div><small>Fermento</small>✔</div><div><small>Gelo</small>✔</div><div><small>Reprocesso</small>${rp(b)}</div><div><small>Diosna</small>${b.diosna}</div><div class=stt>Batendo</div><button class=big onclick="fim(${b.id})">Fim da batelada</button></div>`;
return `<div class=row><div><small>Batelada</small><b>${S.E.dia.contador+1}</b></div><div class=st>Aguardando</div><button class=big onclick=ini()>Iniciar nova batelada</button></div>`}
function tabela(l,all){return `<div class=wrap><table><tr><th>Produto<th>Lote<th>Início<th>Fim<th>Reprocesso<th>Diosna<th>Temperatura<th>Operador${all?'<th>Status':''}</tr>${l.length?l.map(b=>`<tr><td>${esc(b.produto)}<td>${b.lote}<td>${hm(b.inicio)}<td>${hm(b.fim)}<td>${rp(b)}<td>${b.diosna}<td>${b.temperatura==null?'—':String(b.temperatura).replace('.',',')+'ºC'}<td>${esc(b.operador||'—')}${all?`<td>${b.status}`:''}</tr>`).join(''):'<tr><td colspan=9>Nenhuma batelada ainda.</tr>'}</table></div>`}
async function ent(){const pf=PERFIL,{data,error}=await sb.rpc('login',{p_perfil:pf,p_turno:pf==='admin'?null:document.getElementById('t').value,p_senha:document.getElementById('p').value});
if(error)return document.getElementById('er').textContent=error.message;S.token=data.token;S.perfil=data.perfil;S.turno=data.turno;S.nome=data.nome;S.E=null;go(home0())}
function sair(){S.token=null;S.E=null;go('login')}
async function inicia(){S.mode=S.E.dia?'':'iniciar';go(S.E.dia?'main':'prod')}
async function pick(id){await rpc(S.E.dia?'trocar_produto':'iniciar_dia',{p_produto:id});go('main')}
function ini(){S.w={ini:new Date().toISOString(),step:0,rep:[]};go('wiz')}
function nx(){S.w.step++;R()}
function tg(x){const r=S.w.rep,i=r.indexOf(x);i<0?r.push(x):r.splice(i,1);R()}
async function dio(n){const w=S.w;await rpc('iniciar_batelada',{p_linha:w.rep.includes('Linha'),p_cong:w.rep.includes('Congelado'),p_diosna:n,p_inicio:w.ini});S.w=null;go('main')}
function fim(id){S.w={id,fim:new Date().toISOString(),temp:'',op:localStorage.getItem('mq_op')||''};go('fim')}
function key(k){let t=S.w.temp;if(k==='⌫')t=t.slice(0,-1);else if(k===','){if(!t.includes(',')&&t)t+=','}else if(t.length<5)t+=k;S.w.temp=t;document.getElementById('tv').textContent=t||'0'}
async function ok(){const w=S.w,t=parseFloat(w.temp.replace(',','.')),o=w.op.trim();if(isNaN(t)||!o)return document.getElementById('er').textContent='Informe a temperatura da massa e o operador responsável.';
await rpc('finalizar_batelada',{p_id:w.id,p_temp:t,p_op:o,p_fim:w.fim});try{localStorage.setItem('mq_op',o)}catch(e){}S.w=null;go('main')}
async function fecha(){S.fin=true;go('resumo')}
async function encerra(){if(!confirm('Encerrar a produção de hoje?'))return;await rpc('encerrar_dia');S.fin=false;go('home')}
async function salvau(){const g=i=>document.getElementById(i).value;await rpc('admin_usuario',{p_id:S.eu||null,p_nome:g('un'),p_perfil:g('up'),p_turno:g('ut'),p_senha:g('us')});S.eu=null;R()}
async function delu(id){if(confirm('Excluir este usuário?')){await rpc('admin_excluir_usuario',{p_id:id});R()}}
async function salvameta(){const v=document.getElementById('mt').value;if(v==='')return alert('Informe a meta.');await rpc('definir_meta',{p_meta:parseInt(v)});R()}
async function addp(){await rpc('admin_produto',{p_nome:document.getElementById('np').value});R()}
async function delp(id){if(confirm('Excluir este produto? O histórico antigo é mantido.')){await rpc('admin_excluir_produto',{p_id:id});R()}}
async function salvar(id){await rpc('admin_receita',{p_produto:id,p_texto:document.getElementById('r'+id).value});alert('Receita salva.')}
R();
