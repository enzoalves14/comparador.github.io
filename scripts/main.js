if(!localStorage.getItem('token')){
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // ---------- Utilidades ----------
    const $ = (sel, el=document) => el.querySelector(sel);
    const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
    const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const clamp = (n,min,max) => Math.max(min, Math.min(max, n));
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }

    const save = (k, v) => { try { localStorage.setItem('proto-'+k, JSON.stringify(v)); } catch(e){} };
    const load = (k, d=null) => { try { const v = localStorage.getItem('proto-'+k); return v? JSON.parse(v): d; } catch(e){ return d; } };

    function downloadAsFile(filename, content, mime){
      const blob = new Blob([content], {type: mime});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    }

    // ---------- Mocks ----------
    const DEFAULT_STORES = [
      { id: 'a', name: 'Mercado Solar', distanceKm: 1.2 },
      { id: 'b', name: 'Super Estrela', distanceKm: 3.8 },
      { id: 'c', name: 'Hiper Cometa', distanceKm: 6.0 },
    ];
    const DEFAULT_PRODUCTS = [
      { id: 'arroz5kg', name: 'Arroz 5kg', unit: 'pct', category: 'Grãos' },
      { id: 'feijao1kg', name: 'Feijão 1kg', unit: 'pct', category: 'Grãos' },
      { id: 'leite1l', name: 'Leite 1L', unit: 'un', category: 'Laticínios' },
      { id: 'oleo900ml', name: 'Óleo 900ml', unit: 'un', category: 'Mercearia' },
      { id: 'acucar1kg', name: 'Açúcar 1kg', unit: 'pct', category: 'Mercearia' },
      { id: 'cafe500g', name: 'Café 500g', unit: 'pct', category: 'Mercearia' },
      { id: 'papelhig6', name: 'Papel Higiênico 6un', unit: 'fd', category: 'Higiene' },
      { id: 'sabaoPo1kg', name: 'Sabão em Pó 1kg', unit: 'pct', category: 'Limpeza' },
    ];
    const DEFAULT_PRICES = {
      a: {arroz5kg:27.9, feijao1kg:8.49, leite1l:4.39, oleo900ml:6.59, acucar1kg:4.99, cafe500g:18.9, papelhig6:15.5, sabaoPo1kg:12.9},
      b: {arroz5kg:29.5, feijao1kg:7.99, leite1l:4.19, oleo900ml:6.99, acucar1kg:4.59, cafe500g:17.5, papelhig6:14.9, sabaoPo1kg:13.9},
      c: {arroz5kg:26.9, feijao1kg:8.79, leite1l:4.69, oleo900ml:6.49, acucar1kg:4.79, cafe500g:19.5, papelhig6:16.9, sabaoPo1kg:12.5}
    };
    function initCache(){
      if(!load('stores')) save('stores', DEFAULT_STORES);
      if(!load('products')) save('products', DEFAULT_PRODUCTS);
      if(!load('prices')) save('prices', DEFAULT_PRICES);
    }
    initCache();

    // ---------- Estado ----------
    let stores = load('stores', DEFAULT_STORES);
    let products = load('products', DEFAULT_PRODUCTS);
    let priceMap = load('prices', DEFAULT_PRICES);
    let cart = load('cart', []); // [{productId, qty}]
    let selectedStores = load('selectedStores', stores.map(s=>s.id));

    // ---------- Render ----------
    function renderCategories(){
      const cats = ['Todas', ...Array.from(new Set(products.map(p=>p.category)))];
      const pills = cats.map(c => `<button class="pill" data-cat="${c}">${c}</button>`).join('');
      $('#catPills').innerHTML = pills;
      const current = load('cat', 'Todas');
      $$(".pill").forEach(b=>{ if(b.dataset.cat===current) b.classList.add('active'); b.onclick=()=>{ save('cat', b.dataset.cat); renderProducts(); markCatActive(); }; });
      function markCatActive(){ $$(".pill").forEach(x=>x.classList.toggle('active', x.dataset.cat===load('cat','Todas'))); }
    }

    function renderProducts(){
      const q = ($('#searchInput').value||'').toLowerCase();
      const cat = load('cat','Todas');
      const list = products.filter(p => p.name.toLowerCase().includes(q) && (cat==='Todas' || p.category===cat));
      const html = list.map(p => {
        const priceBadges = stores.map(s=>{
          const price = priceMap?.[s.id]?.[p.id];
          return `<span class="badge">${s.name.split(' ')[0]}: ${price!=null? brl(price): '—'}</span>`;
        }).join('');
        return `<div class="product">
          <div class="row product-header">
              <div style="font-weight:600">${p.name}</div>
              <div class="meta">${p.category} · ${p.unit}</div>
            </div>
            <button class="btn" data-add="${p.id}">Adicionar</button>
          </div>
          <div class="badges">${priceBadges}</div>
        </div>`;
      }).join('');
      $('#productsGrid').innerHTML = html || `<div class="hint">Nenhum item encontrado.</div>`;
      $$('[data-add]').forEach(b => b.onclick = () => addToCart(b.dataset.add,1));
    }

    function renderCart(){
      if(!cart.length){
        $('#cartEmpty').hidden = false; $('#cartTableWrap').hidden = true; return;
      }
      $('#cartEmpty').hidden = true; $('#cartTableWrap').hidden = false;
      const rows = cart.map(i=>{
        const p = products.find(x=>x.id===i.productId);
        const prices = stores.map(s=> ({ s, price: priceMap?.[s.id]?.[i.productId] ?? null }));
        const available = prices.filter(x=>x.price!=null);
        const best = available.sort((a,b)=>a.price-b.price)[0];
        const bestTxt = best? `${brl(best.price)} <span class="hint">(${best.s.name})</span>` : '<span class="hint">—</span>';
        return `<tr>
          <td>${p?.name||'-'}</td>
          <td><input type="number" min="0" value="${i.qty}" data-qty="${i.productId}" style="width:80px" /></td>
          <td>${bestTxt}</td>
          <td><button class="btn ghost" data-remove="${i.productId}">Remover</button></td>
        </tr>`;
      }).join('');
      $('#cartBody').innerHTML = rows;
      $$('[data-qty]').forEach(inp => inp.onchange = (e)=> updateQty(inp.dataset.qty, Number(e.target.value||0)));
      $$('[data-remove]').forEach(btn => btn.onclick = ()=> removeFromCart(btn.dataset.remove));
    }

    function renderStores(){
      const html = stores.map(s=>{
        const checked = selectedStores.includes(s.id) ? 'checked' : '';
        return `<label class="store ${''}">
          <div>
            <div style="font-weight:600">${s.name}</div>
            <div class="hint">${s.distanceKm} km</div>
          </div>
          <input type="checkbox" data-store="${s.id}" ${checked} />
        </label>`;
      }).join('');
      $('#storesList').innerHTML = html;
      $$('[data-store]').forEach(cb => cb.onchange = ()=> toggleStore(cb.dataset.store));

      // editor selects
      $('#priceStore').innerHTML = stores.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
      $('#priceProd').innerHTML = products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    }

    function totalsByStore(){
      const out = {};
      for(const s of stores){
        if(!selectedStores.includes(s.id)) continue;
        let total=0, missing=0;
        for(const item of cart){
          const price = priceMap?.[s.id]?.[item.productId];
          if(price==null){ missing++; continue; }
          total += price * item.qty;
        }
        out[s.id] = { total, missing };
      }
      return out;
    }

    function renderCompare(){
      const totals = totalsByStore();
      const entries = Object.entries(totals);
      $('#compareWrap').innerHTML = entries.length? '' : '<div class="hint">Selecione ao menos um mercado para ver os totais.</div>';
      if(!entries.length) { $('#bestWrap').textContent = ''; return; }
      const valid = entries.filter(([id,v])=> v.missing===0);
      const pool = valid.length? valid: entries;
      const best = pool.sort((a,b)=> a[1].total - b[1].total)[0];
      const [bestId, bestVal] = best || [];

      // list cards
      const cards = stores.filter(s=>selectedStores.includes(s.id)).map(s=>{
        const t = totals[s.id] || {total:0, missing:0};
        const bestClass = s.id===bestId? 'best' : '';
        return `<div class="store ${bestClass}">
          <div>
            <div style="font-weight:600">${s.name}</div>
            <div class="hint">${s.distanceKm} km · ${t.missing} itens faltando</div>
          </div>
          <div style="text-align:right">
            <div class="kpi">${brl(t.total)}</div>
            ${s.id===bestId? '<div class="hint">Mais barato</div>': ''}
          </div>
        </div>`;
      }).join('');
      $('#compareWrap').innerHTML = cards;

      // savings
      const others = entries.filter(([id])=> id!==bestId && (totals[id].missing===bestVal.missing));
      const second = others.sort((a,b)=> a[1].total - b[1].total)[0]?.[1]?.total || null;
      const savings = (second!=null)? Math.max(0, second - bestVal.total) : 0;
      const bestName = stores.find(x=>x.id===bestId)?.name || '';
      $('#bestWrap').innerHTML = `Melhor opção: <b>${bestName}</b>${bestVal?.missing? ` · <span class="hint">${bestVal.missing} itens sem preço</span>`:''}<br>Economia potencial: <b class="kpi good">${brl(savings)}</b>`;
    }

    function renderAll(){
      renderCategories();
      renderProducts();
      renderCart();
      renderStores();
      renderCompare();
      save('stores', stores); save('products', products); save('prices', priceMap); save('cart', cart); save('selectedStores', selectedStores);
    }

    // ---------- Ações ----------
    function addToCart(productId, qty=1){
      const found = cart.find(i=>i.productId===productId);
      if(found){ found.qty = clamp(found.qty + qty, 0, 999); }
      else { cart.push({ productId, qty: clamp(qty,1,999) }); }
      renderCart(); renderCompare(); save('cart', cart);
    }

    function updateQty(productId, qty){
      qty = clamp(Number(qty)||0, 0, 999);
      cart = cart.map(i=> i.productId===productId? {...i, qty}: i).filter(i=> i.qty>0);
      renderCart(); renderCompare(); save('cart', cart);
    }

    function removeFromCart(productId){
      cart = cart.filter(i=> i.productId!==productId);
      renderCart(); renderCompare(); save('cart', cart);
    }

    function toggleStore(id){
      if(selectedStores.includes(id)) selectedStores = selectedStores.filter(x=>x!==id); else selectedStores.push(id);
      renderStores(); renderCompare(); save('selectedStores', selectedStores);
    }

    // editor
    function slug(str){ return str.toLowerCase().normalize('NFD').replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-'); }

    $('#addStore').onclick = ()=>{
      const name = $('#storeName').value.trim(); if(!name) return;
      const id = slug(name + Math.random().toString(36).slice(2,6));
      const distanceKm = Number($('#storeDist').value||0);
      stores.push({ id, name, distanceKm });
      selectedStores.push(id);
      $('#storeName').value=''; $('#storeDist').value='';
      renderStores(); renderCompare(); save('stores', stores); save('selectedStores', selectedStores);
    };

    $('#addProd').onclick = ()=>{
      const name = $('#prodName').value.trim(); if(!name) return;
      const unit = $('#prodUnit').value||'un';
      const category = $('#prodCat').value||'Mercearia';
      const id = slug(name);
      products.push({ id, name, unit, category });
      $('#prodName').value='';
      renderProducts(); renderStores(); save('products', products);
    };

    $('#setPrice').onclick = ()=>{
      const s = $('#priceStore').value; const p = $('#priceProd').value; const val = Number($('#priceVal').value);
      if(!s || !p || !val) return;
      priceMap[s] = {...(priceMap[s]||{}), [p]: val};
      $('#priceVal').value='';
      renderProducts(); renderCompare(); save('prices', priceMap);
    };

    // filtros
    $('#searchInput').oninput = ()=> renderProducts();
    $('#btnAllStores').onclick = ()=>{ selectedStores = stores.map(s=>s.id); renderStores(); renderCompare(); save('selectedStores', selectedStores); };
    $('#btnNoStores').onclick = ()=>{ selectedStores = []; renderStores(); renderCompare(); save('selectedStores', selectedStores); };

    // export/import
    $('#exportJsonBtn').onclick = ()=>{
      downloadAsFile('comparador-data.json', JSON.stringify({stores, products, priceMap, cart}, null, 2), 'application/json');
    };
    $('#exportCsvBtn').onclick = ()=>{
      const header = ['Mercado','Distância (km)','Itens faltando','Total (R$)'];
      const totals = totalsByStore();
      const rows = stores.filter(s=>selectedStores.includes(s.id)).map(s=>[
        s.name,
        String(s.distanceKm),
        String(totals[s.id]?.missing ?? 0),
        (totals[s.id]?.total ?? 0).toFixed(2).replace('.', ',')
      ]);
      const csv = [header, ...rows].map(r=>r.join(',')).join('\n');
      downloadAsFile('comparacao.csv', csv, 'text/csv');
    };
    $('#importFile').onchange = (e)=>{
      const f = e.target.files?.[0]; if(!f) return;
      const reader = new FileReader();
      reader.onload = (ev)=>{ try{ const data = JSON.parse(ev.target.result);
        if(data.stores) stores = data.stores; if(data.products) products = data.products; if(data.priceMap) priceMap = data.priceMap; if(data.cart) cart = data.cart;
        renderAll();
      }catch(err){ alert('Arquivo inválido'); }};
      reader.readAsText(f);
    };
    $('#clearBtn').onclick = ()=>{ if(confirm('Limpar carrinho e dados locais?')){ cart=[]; save('cart', cart); renderCart(); renderCompare(); }};

     $('#menuToggle').onclick = () => {
     $('#menu').classList.toggle('open');
    };
    // back to top
    $('#scrollTop').onclick = ()=> window.scrollTo({top:0, behavior:'smooth'});
async function loadGreeting(){
      try{
        const res = await fetch('/me');
        if(!res.ok) return;
        const user = await res.json();
        if(user?.name) $('#greeting').textContent = `Olá, ${user.name}`;
      }catch(err){ console.error(err); }
    }

    // init
    renderAll();
    loadGreeting();
});
