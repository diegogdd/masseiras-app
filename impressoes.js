// Página Impressões: etiqueta de identificação de pallets. Carregado só em /impressoes, antes do app.js.
// Usa S, A, rpc, rpcQ, esc, head, sair do app.js só na hora de executar.
(function(){
const pad=(n,l)=>String(n).padStart(l,'0');
const hoje=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1,2)+'-'+pad(d.getDate(),2)};
const fmt=i=>{if(!i)return'';const [y,m,d]=i.split('-');return d+'/'+m+'/'+y.slice(2)};
// Validade = fabricação + N meses - 1 dia (ex.: 16/09/26 + 6 meses -> 15/03/27)
function validade(i,meses){if(!i)return'';const [y,m,d]=i.split('-').map(Number),a=new Date(y,m-1+meses,1),u=new Date(a.getFullYear(),a.getMonth()+1,0).getDate();a.setDate(Math.min(d,u));a.setDate(a.getDate()-1);return a.getFullYear()+'-'+pad(a.getMonth()+1,2)+'-'+pad(a.getDate(),2)}
const F={prod:null,qtd:150,fab:hoje(),meses:6,ordem:'',ini:1,fim:1,desc:'',lastro:'',alt:''};
let PR=[];
const cur=()=>PR.find(p=>String(p.id)===String(F.prod));
const dk=p=>'imp_'+(p.codigo||p.id);
function carrega(p){let d={};try{d=JSON.parse(localStorage.getItem(dk(p))||'{}')}catch(e){}F.desc=d.desc!=null?d.desc:p.nome;F.lastro=d.lastro!=null?d.lastro:'';F.alt=d.alt!=null?d.alt:'';F.meses=d.meses!=null?d.meses:6}
function guarda(){const p=cur();if(!p)return;try{localStorage.setItem(dk(p),JSON.stringify({desc:F.desc,lastro:F.lastro,alt:F.alt,meses:F.meses}))}catch(e){}}
const tam=(t,max,larg)=>Math.min(max,larg/(Math.max(t.length,1)*.5)).toFixed(1)+'mm';
const PALLET='<svg viewBox="0 0 60 50" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"><rect x="6" y="4" width="22" height="12"/><rect x="28" y="4" width="22" height="12"/><rect x="6" y="16" width="22" height="12"/><rect x="28" y="16" width="22" height="12"/><path d="M6 4l8-3h22l14 3M50 4l6-3v24l-6 3"/><rect x="2" y="32" width="56" height="5" fill="#000"/><rect x="5" y="37" width="8" height="7"/><rect x="26" y="37" width="8" height="7"/><rect x="47" y="37" width="8" height="7"/></svg>';
function etq(n){const p=cur(),cod=p.codigo||'',lt=String(F.ordem),sb=pad(n,2),tot=(Number(F.lastro)||0)*(Number(F.alt)||0),bc=t=>`<div class=bcw><svg class=bc data-v="${esc(t)}" preserveAspectRatio="none"></svg></div>`;
return `<div class=etq>
<div class="cl v"><div class=cp>Validade</div><div class=cv><span class=dt>${fmt(validade(F.fab,Number(F.meses)||0))}</span></div></div>
<div class="cl q"><div class=cp>Quantidade</div><div class=cv>${bc(String(F.qtd))}<span class=big style="font-size:30mm">${esc(F.qtd)}</span></div></div>
<div class="cl fb"><div class=cp>Fabricação</div><div class=cv><span class=dt>${fmt(F.fab)}</span></div></div>
<div class="cl cd"><div class=cp>Código</div><div class=cv><span class=big style="font-size:${tam(cod,30,112)}">${esc(cod)}</span>${bc(cod)}</div></div>
<div class="cl sl"><div class=cp>Sublotes</div><div class=cv><span class=big style="font-size:48mm">${esc(sb)}</span></div></div>
<div class="cl lt"><div class=cp>Lote</div><div class=cv><span class=big style="font-size:${tam(lt,17,112)}">${esc(lt)}</span>${bc(lt)}</div></div>
<div class="cl tu"><div class=cp>Turno</div><div class=cv><div class=tl>1<i></i></div><div class=tl>2<i></i></div><div class=tl>3<i></i></div></div></div>
<div class="cl pl"><div class=cp>Paletização</div><div class=cv><div class=tx>Qtd por lastro: ${esc(F.lastro)}<br>Altura: ${esc(F.alt)}<br>Total: ${tot?tot:''}</div>${PALLET}</div></div>
<div class="cl ds"><div class=cp>Descrição</div><div class=cv>${esc(F.desc)}</div></div>
<div class="cl rs"><div class=cp>Responsável</div><div class=cv></div></div>
<div class="cl hr"><div class=cp>Horário</div><div class=cv></div></div>
<div class="cl pp"><div class=cp>Peso palete</div><div class=cv>KG</div></div>
</div>`}
function barras(el){el.querySelectorAll('svg.bc').forEach(s=>{try{JsBarcode(s,s.dataset.v,{format:'CODE128',displayValue:false,margin:0,width:2,height:60});
  const w=s.getAttribute('width'),h=s.getAttribute('height');if(!s.getAttribute('viewBox')&&w&&h)s.setAttribute('viewBox','0 0 '+parseFloat(w)+' '+parseFloat(h));s.removeAttribute('width');s.removeAttribute('height');s.setAttribute('preserveAspectRatio','none')}catch(e){}})}
function previa(){const w=document.getElementById('pw');if(!w||!cur())return;
  const n=Math.max(1,parseInt(F.ini)||1);w.innerHTML=etq(n);barras(w);
  const e=w.firstElementChild,k=Math.min(1,w.clientWidth/e.offsetWidth);e.style.transform='scale('+k+')';w.style.height=(e.offsetHeight*k)+'px';
  const lt=document.getElementById('lt'),v=document.getElementById('vl'),tt=document.getElementById('tt');
  const fi=Math.max(n,parseInt(F.fim)||n);if(lt)lt.innerHTML=F.ordem?`Lote impresso: <b>${esc(F.ordem)}</b> · Sublotes: <b>${pad(n,2)}${fi>n?' a '+pad(fi,2):''}</b>`:'Informe o nº da ordem (é o lote impresso na etiqueta).';
  if(v)v.innerHTML=`Validade: <b>${fmt(validade(F.fab,Number(F.meses)||0))}</b>`;if(tt)tt.value=(Number(F.lastro)||0)*(Number(F.alt)||0)||''}
function set(k,v){F[k]=v;if(['desc','lastro','alt','meses'].includes(k))guarda();previa()}
function troca(id){F.prod=id;carrega(cur());const g=x=>document.getElementById(x);g('ds').value=F.desc;g('la').value=F.lastro;g('al').value=F.alt;g('me').value=F.meses;previa()}
function imprimir(){const p=cur(),ini=parseInt(F.ini),fim=parseInt(F.fim),er=document.getElementById('er');er.textContent='';
  if(!p)return er.textContent='Escolha o produto.';
  if(!p.codigo)return er.textContent='Este produto ainda não tem código cadastrado (Administrador > Produtos e códigos).';
  if(!String(F.ordem).trim())return er.textContent='Informe o número da ordem.';
  if(!(Number(F.qtd)>0))return er.textContent='Informe a quantidade.';
  if(!F.fab)return er.textContent='Informe a data de fabricação.';
  if(!(ini>=1)||!(fim>=ini))return er.textContent='Informe o lote inicial e o lote final (o final não pode ser menor que o inicial).';
  if(fim-ini+1>500)return er.textContent='Máximo de 500 etiquetas por impressão.';
  const f=document.getElementById('folhas');f.innerHTML='';for(let n=ini;n<=fim;n++)f.insertAdjacentHTML('beforeend','<div class=pg>'+etq(n)+'</div>');barras(f);
  setTimeout(()=>window.print(),150)}
function draw(){const P=PR;
A.innerHTML=head()+`<nav><button onclick="location.href='/'">Menu</button><button onclick="sair()">Sair</button></nav><main class=imp><h2>Impressões</h2>
<h3 class=sec style="margin-top:6px">Identificação de pallet</h3>
<div class=f><label>Produto<select id=pr onchange="IMPRESSOES.troca(this.value)">${P.map(p=>`<option value="${p.id}" ${String(p.id)===String(F.prod)?'selected':''}>${esc((p.codigo?p.codigo+' - ':'')+p.nome)}</option>`).join('')}</select></label>
<label>Quantidade<input id=qt type=number min=1 inputmode=numeric value="${esc(F.qtd)}" oninput="IMPRESSOES.set('qtd',this.value)"></label>
<label>Data de fabricação<input id=fa type=date value="${F.fab}" oninput="IMPRESSOES.set('fab',this.value)"></label>
<label>Nº da ordem<input id=or inputmode=numeric value="${esc(F.ordem)}" oninput="IMPRESSOES.set('ordem',this.value.trim())"></label></div>
<div class=f><label>Lote inicial<input id=li type=number min=1 inputmode=numeric value="${esc(F.ini)}" oninput="IMPRESSOES.set('ini',this.value)"></label>
<label>Lote final<input id=lf type=number min=1 inputmode=numeric value="${esc(F.fim)}" oninput="IMPRESSOES.set('fim',this.value)"></label></div>
<p class=hint id=lt></p><p class=hint id=vl></p>
<h3 class=sec>Dados da etiqueta <small style="font-weight:400;color:var(--mut)">(ficam salvos por produto neste aparelho)</small></h3>
<div class=f><label>Descrição<textarea id=ds oninput="IMPRESSOES.set('desc',this.value)">${esc(F.desc)}</textarea></label></div>
<div class=f><label>Qtd por lastro<input id=la type=number min=0 inputmode=numeric value="${esc(F.lastro)}" oninput="IMPRESSOES.set('lastro',this.value)"></label>
<label>Altura (lastros)<input id=al type=number min=0 inputmode=numeric value="${esc(F.alt)}" oninput="IMPRESSOES.set('alt',this.value)"></label>
<label>Total por pallet<input id=tt readonly tabindex=-1></label>
<label>Validade (meses)<input id=me type=number min=1 inputmode=numeric value="${esc(F.meses)}" oninput="IMPRESSOES.set('meses',this.value)"></label></div>
<div class=acoes><button class=big onclick="IMPRESSOES.imprimir()">Imprimir</button><span class=er id=er></span></div>
<h3 class=sec>Prévia <small style="font-weight:400;color:var(--mut)">(primeira etiqueta)</small></h3><div class=pw id=pw></div></main>`;
previa()}
window.addEventListener('resize',()=>{if(document.getElementById('pw'))previa()});
window.IMPRESSOES={set,troca,imprimir,async load(){const L=(await rpcQ('pallet_estado_v2'))||await rpc('pallet_estado');PR=((L&&L.produtos)||[]).slice();if(!PR.length){A.innerHTML=head()+`<nav><button onclick="location.href='/'">Menu</button><button onclick="sair()">Sair</button></nav><main><h2>Impressões</h2><p>Nenhum produto cadastrado.</p></main>`;return}
  if(!cur()){F.prod=PR[0].id;carrega(PR[0])}draw()}};
})();
