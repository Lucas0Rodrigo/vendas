const $=s=>document.querySelector(s);
const C=JSON.parse(localStorage.getItem('cfg')||'null')||{owner:location.hostname.split('.')[0],repo:location.pathname.split('/')[1],token:''};
const brl=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
async function go(){
  $('#u').textContent='Atualizando…';
  try{
    const r=await fetch(`https://api.github.com/repos/${C.owner}/${C.repo}/contents/dados.json?t=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/vnd.github.raw+json',...(C.token&&{Authorization:'Bearer '+C.token})}});
    if(!r.ok)throw Error('Erro '+r.status);
    const d=await r.json(),S=d.sales||[],K=d.kits||[];
    const sold=n=>S.reduce((a,s)=>a+s.items.filter(i=>i.k==n).reduce((x,i)=>x+i.q,0),0);
    const kits=K.reduce((a,k)=>a+(d.v?(k.e||0):(k.e||0)-sold(k.n)),0);
    const pago=S.filter(s=>s.paid).reduce((a,s)=>a+s.items.reduce((x,i)=>x+i.q,0)*10,0);
    $('#t').textContent=kits*3;$('#k').textContent=kits+' kit(s) de 3 trufas';$('#c').textContent=brl(pago-(d.repassado||0));
    $('#u').textContent='Atualizado às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }catch(e){$('#u').textContent='Não consegui atualizar ('+e.message+')'}
}
$('#r').onclick=go;go();setInterval(go,120000);
