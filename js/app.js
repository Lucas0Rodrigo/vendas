const $=s=>document.querySelector(s),PRICE=10;
const ic=n=>`<svg class="ic"><use href="#i-${n}"/></svg>`;
let D={kits:[],sales:[],repassado:0},sha=null;
const C=JSON.parse(localStorage.getItem('cfg')||'null')||{owner:location.hostname.endsWith('github.io')?location.hostname.split('.')[0]:'',repo:location.pathname.split('/')[1]||'',token:''};
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const brl=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>new Date().toISOString().slice(0,10);
const fmt=d=>d?d.split('-').reverse().join('/'):'';
const days=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const qty=s=>s.items.reduce((a,i)=>a+i.q,0);
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2800)}
const H=()=>({Accept:'application/vnd.github+json',...(C.token&&{Authorization:'Bearer '+C.token})});
const url=f=>`https://api.github.com/repos/${C.owner}/${C.repo}/contents/${f}`;
async function get(f){
  const r=await fetch(url(f)+'?t='+Date.now(),{headers:H(),cache:'no-store'});
  if(r.status==404)return{sha:null,data:null};
  if(!r.ok)throw Error('Erro ao ler '+f+' ('+r.status+')');
  const j=await r.json();
  return{sha:j.sha,data:JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\n/g,'')),c=>c.charCodeAt(0))))};
}
const put=(f,o,sha)=>{const b={message:'atualiza '+f,content:btoa(unescape(encodeURIComponent(JSON.stringify(o,null,1))))};if(sha)b.sha=sha;return fetch(url(f),{method:'PUT',headers:H(),body:JSON.stringify(b)})};
const base=x=>{x=Object.assign({kits:[],sales:[],repassado:0},x||{});if(!x.v){x.kits.forEach(k=>k.e=(k.e||0)-x.sales.reduce((a,s)=>a+s.items.filter(i=>i.k==k.n).reduce((y,i)=>y+i.q,0),0));x.v=2}return x};
async function load(){D=base((await get('dados.json')).data)}
let pending=[],saving=false,HS={auto:[],manual:[]};
function mark(){const b=$('#sv');b.classList.toggle('dirty',pending.length>0);b.querySelector('span').textContent=pending.length?'Salvar alterações':'Salvo'}
function mut(fn){if(!C.token){toast('Configure o token na aba Config');return Promise.resolve()}fn(D);pending.push(fn);mark();render();return Promise.resolve()}
async function snap(type){
  for(let t=0;t<2;t++){
    const r=await get('saves.json'),S=Object.assign({auto:[],manual:[]},r.data||{});
    S[type].unshift({t:new Date().toISOString(),d:JSON.parse(JSON.stringify(D))});S[type]=S[type].slice(0,10);
    const p=await put('saves.json',S,r.sha);if(p.ok){HS=S;return}if(p.status!=409&&p.status!=422)return;
  }
}
async function flush(type){
  if(saving||(type=='auto'&&!pending.length))return;
  if(!C.token)return toast('Configure o token na aba Config');
  saving=true;$('#sv').disabled=true;
  try{
    for(let t=0;t<3;t++){
      const r=await get('dados.json');D=base(r.data);
      if(pending.length){
        pending.forEach(fn=>fn(D));
        const p=await put('dados.json',D,r.sha);
        if(p.status==409||p.status==422)continue;
        if(!p.ok)throw Error('Erro ao salvar ('+p.status+')');
      }
      pending=[];await snap(type);toast(type=='auto'?'Autosave ✓':'Salvo ✓');break;
    }
  }catch(e){toast(e.message);await load().catch(()=>{});pending.forEach(fn=>fn(D))}
  saving=false;$('#sv').disabled=false;mark();render();
}
async function loadSaves(){try{HS=Object.assign({auto:[],manual:[]},(await get('saves.json')).data||{})}catch(e){toast(e.message)}renderSaves()}
function renderSaves(){[['manual','#sm'],['auto','#sa']].forEach(([k,id])=>$(id).innerHTML=HS[k].map((s,i)=>`<div class="rk"><span><b>${new Date(s.t).toLocaleString('pt-BR')}</b><br><small class="mut">${s.d.sales.length} vendas · ${s.d.kits.length} kits · repassado ${brl(s.d.repassado||0)}</small></span><button data-a="rs" data-k="${k}" data-i="${i}">Restaurar</button></div>`).join('')||'<p class="mut">Nenhum save ainda.</p>')}
const sold=n=>D.sales.reduce((a,s)=>a+s.items.filter(i=>i.k==n).reduce((x,i)=>x+i.q,0),0);
const key=a=>a.map(x=>x.toLowerCase()).sort().join('|');
const rk=(a,f)=>a.length?a.map((x,i)=>`<div class="rk"><i>${i+1}</i>${f(x)}</div>`).join(''):'<p class="mut">Sem dados ainda.</p>';
let cart={},flt='',qs='';
const left=n=>(D.kits.find(x=>x.n==n)||{}).e||0;
function renderCart(){
  const ks=Object.keys(cart).map(Number).filter(n=>cart[n]>0),t=ks.reduce((a,n)=>a+cart[n],0);
  $('#cart').innerHTML=`<h3>${t} kit(s)</h3><div class="items">`+(ks.map(n=>{const k=D.kits.find(x=>x.n==n);return `<div class="ci"><span>${cart[n]} × Kit ${n}<small>${esc(k?k.f.join(', '):'')}</small></span><b>${brl(cart[n]*PRICE)}</b><button type="button" data-a="m" data-i="${n}">−</button><button type="button" data-a="p" data-i="${n}">+</button></div>`}).join('')||'<p class="mut">Toque em um kit para adicionar</p>')+'</div>';
  $('#tot').textContent=brl(t*PRICE);
  document.querySelectorAll('.tile').forEach(e=>{const q=cart[e.dataset.i]||0;e.classList.toggle('sel',q>0);e.querySelector('.bd').textContent=q||''});
}
function render(){
  const S=D.sales,v=s=>qty(s)*PRICE;
  const total=S.reduce((a,s)=>a+v(s),0),pago=S.filter(s=>s.paid).reduce((a,s)=>a+v(s),0);
  $('#cards').innerHTML=[['cart','Total vendido',total],['cash','Já recebido',pago],['wallet','Em conta',pago-D.repassado],['church','Entregue à igreja',D.repassado],['hour','A receber',total-pago]].map(c=>`<div class="card"><i>${ic(c[0])}</i><div><small>${c[1]}</small><b>${brl(c[2])}</b></div></div>`).join('');
  const B={},F={};
  S.forEach(s=>{const k=s.buyer.trim().toLowerCase(),b=B[k]||(B[k]={n:s.buyer.trim(),k:0,d:[]});b.k+=qty(s);if(s.paid&&s.paidDate)b.d.push(days(s.date,s.paidDate));
    s.items.forEach(i=>{const kit=D.kits.find(x=>x.n==i.k);kit&&kit.f.forEach(f=>{const x=f.trim().toLowerCase();(F[x]=F[x]||{n:f.trim(),q:0}).q+=i.q})})});
  const bl=Object.values(B),dl=bl.filter(b=>b.d.length).map(b=>({n:b.n,m:b.d.reduce((a,x)=>a+x,0)/b.d.length}));
  const dd=m=>m<1?'no mesmo dia':m.toFixed(1).replace('.',',')+' dias';
  $('#top').innerHTML=rk([...bl].sort((a,b)=>b.k-a.k).slice(0,5),b=>`<span>${esc(b.n)}</span><b>${b.k} kit(s)</b>`);
  $('#sab').innerHTML=rk(Object.values(F).sort((a,b)=>b.q-a.q).slice(0,8),f=>`<span>${esc(f.n)}</span><b>${f.q}</b>`);
  $('#lento').innerHTML=rk([...dl].sort((a,b)=>b.m-a.m).slice(0,5),b=>`<span>${esc(b.n)}</span><b>${dd(b.m)}</b>`);
  $('#rapido').innerHTML=rk([...dl].sort((a,b)=>a.m-b.m).slice(0,5),b=>`<span>${esc(b.n)}</span><b>${dd(b.m)}</b>`);
  const ks=[...D.kits].sort((a,b)=>a.n-b.n);
  $('#tiles').innerHTML=ks.map(k=>`<button type="button" class="tile" data-a="p" data-i="${k.n}"><span class="bd"></span><b>Kit ${k.n}</b><small>${esc(k.f.join(', '))}</small><em>em estoque: ${left(k.n)}</em></button>`).join('')||'<p class="mut">Cadastre kits na aba Kits.</p>';
  const L=[...S].reverse().filter(s=>s.buyer.toLowerCase().includes(qs)&&(flt!='np'||!s.paid)&&(flt!='ne'||!s.delivered));
  $('#lista').innerHTML=L.map(s=>`<tr><td data-label="Status"><span class="dot ${s.paid&&s.delivered?'g':s.paid||s.delivered?'m':''}"></span></td><td data-label="Data">${fmt(s.date)}</td><td data-label="Comprador"><b>${esc(s.buyer)}</b></td><td data-label="Kits">${s.items.map(i=>i.q+'× Kit '+i.k).join(', ')}</td><td data-label="Valor"><b>${brl(v(s))}</b></td>
   <td data-label="Pagamento"><button class="${s.paid?'ok':'no'}" data-a="pay" data-i="${s.id}">${s.paid?'✓ '+s.method:'Marcar pago'}</button>${s.paid?` <small>${fmt(s.paidDate)}</small>`:''}</td>
   <td data-label="Entrega"><button class="${s.delivered?'ok':'no'}" data-a="del" data-i="${s.id}">${s.delivered?'✓ Entregue':'Marcar entregue'}</button></td><td data-label=""><button class="bad" data-a="rm" data-i="${s.id}">${ic('trash')}</button></td></tr>`).join('')||'<tr><td colspan="8" class="mut">Nenhuma venda.</td></tr>';
  $('#kitlist').innerHTML=ks.map(k=>`<tr><td data-label="Kit"><b>Kit ${k.n}</b></td><td data-label="Sabores">${esc(k.f.join(' · '))}</td><td data-label="Em estoque"><div class="stk"><button data-a="km" data-i="${k.n}">−</button><input class="qn" type="number" min="0" value="${k.e||0}" data-k="${k.n}"><button data-a="kp" data-i="${k.n}">+</button></div></td><td data-label="Vendidos">${sold(k.n)}</td><td data-label=""><button class="bad" data-a="rk" data-i="${k.n}">${ic('trash')}</button></td></tr>`).join('')||'<tr><td colspan="5" class="mut">Cadastre seu primeiro kit.</td></tr>';
  renderCart();
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x==b));document.querySelectorAll('section').forEach(s=>s.hidden=s.id!=b.dataset.t);$('#tt').textContent=b.querySelector('span').textContent;if(b.dataset.t=='saves')loadSaves()});
$('#busca').oninput=e=>{qs=e.target.value.trim().toLowerCase();render()};$('#flt').onchange=e=>{flt=e.target.value;render()};
$('#fv').paid.onchange=e=>{$('#pg').hidden=!e.target.checked;$('#fv').paidDate.value=today()};
$('#fv').onsubmit=e=>{e.preventDefault();const f=e.target;
  const items=Object.keys(cart).filter(k=>cart[k]>0).map(k=>({k:+k,q:cart[k]}));
  if(!items.length)return toast('Escolha ao menos um kit');
  const s={id:Date.now(),buyer:f.buyer.value.trim(),date:f.date.value,items,paid:f.paid.checked,method:f.paid.checked?f.method.value:'',paidDate:f.paid.checked?f.paidDate.value:'',delivered:f.delivered.checked};
  mut(d=>{d.sales.push(s);s.items.forEach(i=>{const k=d.kits.find(x=>x.n==i.k);if(k)k.e=(k.e||0)-i.q})}).then(()=>{cart={};f.buyer.value='';f.paid.checked=f.delivered.checked=false;$('#pg').hidden=true;f.date.value=today();render()})};
$('#fk').onsubmit=e=>{e.preventDefault();const f=e.target,fl=[...new Set(f.f.value.split(',').map(x=>x.trim()).filter(Boolean))];
  if(!fl.length)return;
  mut(d=>{const ex=d.kits.find(k=>key(k.f)==key(fl));if(ex)ex.e=(ex.e||0)+1;else d.kits.push({n:Math.max(0,...d.kits.map(k=>k.n))+1,f:fl,e:1})}).then(()=>f.f.value='')};
$('#repBtn').onclick=()=>{const x=parseFloat($('#rep').value);if(!(x>0))return toast('Informe um valor');mut(d=>d.repassado=Math.round((d.repassado+x)*100)/100).then(()=>$('#rep').value='')};
$('#fc').onsubmit=e=>{e.preventDefault();const f=e.target;Object.assign(C,{owner:f.owner.value.trim(),repo:f.repo.value.trim(),token:f.token.value.trim()});localStorage.setItem('cfg',JSON.stringify(C));toast('Configuração salva');init()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const i=+b.dataset.i,a=b.dataset.a;
  if(a=='rs'){const s=HS[b.dataset.k][i];if(s&&confirm('Restaurar este save? Depois clique em Salvar para confirmar.')){mut(d=>{const c=base(JSON.parse(JSON.stringify(s.d)));d.v=2;d.kits=c.kits;d.sales=c.sales;d.repassado=c.repassado||0});document.querySelector('nav button').click()}return}
  if(a=='p'){cart[i]=(cart[i]||0)+1;return renderCart()}
  if(a=='m'){cart[i]=Math.max(0,(cart[i]||0)-1);return renderCart()}
  if(a=='pay'){const s=D.sales.find(x=>x.id==i);if(s.paid)mut(d=>Object.assign(d.sales.find(x=>x.id==i),{paid:false,method:'',paidDate:''}));
    else{const pd=prompt('Data do pagamento (AAAA-MM-DD)',today());if(!pd)return;const m=confirm('OK = Pix | Cancelar = Dinheiro')?'Pix':'Dinheiro';mut(d=>Object.assign(d.sales.find(x=>x.id==i),{paid:true,method:m,paidDate:pd}))}}
  if(a=='del')mut(d=>{const s=d.sales.find(x=>x.id==i);s.delivered=!s.delivered});
  if(a=='rm'&&confirm('Apagar esta venda?'))mut(d=>{const s=d.sales.find(x=>x.id==i);if(!s)return;s.items.forEach(it=>{const k=d.kits.find(x=>x.n==it.k);if(k)k.e=(k.e||0)+it.q});d.sales=d.sales.filter(x=>x.id!=i)});
  if(a=='km'||a=='kp')mut(d=>{const k=d.kits.find(x=>x.n==i);k.e=Math.max(0,(k.e||0)+(a=='kp'?1:-1))});
  if(a=='rk'&&confirm('Apagar este kit?'))mut(d=>d.kits=d.kits.filter(x=>x.n!=i))});
async function init(){const f=$('#fc');f.owner.value=C.owner;f.repo.value=C.repo;f.token.value=C.token;
  $('#fv').date.value=today();
  if(C.owner&&C.repo)await load().catch(e=>toast(e.message));render()}
init();

document.addEventListener('change',e=>{const t=e.target;if(!t.classList.contains('qn'))return;const n=+t.dataset.k,v=Math.max(0,parseInt(t.value)||0);mut(d=>{d.kits.find(x=>x.n==n).e=v})});

$('#sv').onclick=()=>flush('manual');
setInterval(()=>flush('auto'),60000);
addEventListener('beforeunload',e=>{if(pending.length){e.preventDefault();e.returnValue=''}});
mark();
