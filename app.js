// === APP.JS — full featured ===

// 1) Today label
(function setToday(){
  const el = document.getElementById('today');
  if(!el) return;
  const d = new Date();
  el.textContent = `Ngày ${String(d.getDate()).padStart(2,'0')} Tháng ${String(d.getMonth()+1).padStart(2,'0')} Năm ${d.getFullYear()}`;
  console.log("[init] Today label:", el.textContent);
})();

const DATA_URL = 'data.json';

// 2) Utilities
function toNumber(v){
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const raw = String(v ?? ''); if (!raw) return 0;
  let s = raw.replace(/[^\d.,-]/g, '').trim();
  const lastDot = s.lastIndexOf('.'); const lastCom = s.lastIndexOf(',');
  if (lastDot !== -1 && lastCom !== -1){
    const decIsComma = lastCom > lastDot;
    if (decIsComma){ s = s.replace(/\./g,''); s = s.replace(/,/g,'.'); } else { s = s.replace(/,/g,''); }
  } else {
    if (s.includes('.') && !s.includes(',')) if ((s.match(/\./g)||[]).length>1) s = s.replace(/\./g,'');
    if (s.includes(',') && !s.includes('.')) s = s.replace(/,/g,'.');
  }
  const n = Number(s); return Number.isFinite(n) ? n : 0;
}
const money = n => (Number(n)||0).toLocaleString('vi-VN');
const norm  = s => String(s ?? '').trim();
const opt   = (v,l) => { const o=document.createElement('option'); o.value=v; o.textContent=l; return o; };

// 3) Normalize / matching helpers
function _rmAccents(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D'); }
function vnNoAccent(s){ return _rmAccents(String(s||'').toLowerCase()).replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim(); }
function nameTokens(s){ return new Set(vnNoAccent(s).split(' ').filter(Boolean)); }
function jaccard(a, b){ const inter=[...a].filter(x=>b.has(x)).length; const union=new Set([...a,...b]).size||1; return inter/union; }
function codeNormVariants(s){
  const raw = String(s||'').toUpperCase().trim();
  let a = raw.replace(/^N-/, '').replace(/[\s_]/g,'').replace(/-/g,'');
  const b = a.replace(/^K(\d{2,3})S/, 'K$1'); // K55S -> K55
  return {raw, a, b};
}

// 4) Catalog (from data.json)
let bySystem = {}; // sys => rows[]
let CATALOG  = []; // {sys, code, name, kg, price, tokens, codeA, codeB}
const body = document.getElementById('itemsBody') || document.querySelector('#orderTable tbody') || document.body;

function indexData(records){
  console.log("[data] Indexing records, count:", (records||[]).length);
  bySystem = (records||[]).reduce((acc, r) => {
    const k = norm(r['Hệ Nhôm'] ?? r['He Nhom'] ?? r['Hệ']);
    if (!k) return acc; (acc[k] = acc[k] || []).push(r); return acc;
  }, {});
  CATALOG = [];
  for(const sys in bySystem){
    for(const r of bySystem[sys]){
      const code = String(r['Mã Hàng hóa'] ?? r['Mã hàng'] ?? r['Ma hang'] ?? '').trim();
      const name = String(r['Tên Hàng hóa'] ?? r['Tên hàng'] ?? '').trim();
      const price= toNumber(r['Đơn giá'] ?? r['Don gia']);
      const kg   = toNumber(r['Khối lượng (kg/thanh)'] ?? r['Khoi luong (kg/thanh)'] ?? r['Kg/thanh']);
      if(!code && !name) continue;
      const {a:codeA, b:codeB} = codeNormVariants(code);
      CATALOG.push({ sys, code, name, price, kg, tokens: nameTokens(name), codeA, codeB });
    }
  }
  console.log("[data] Systems:", Object.keys(bySystem));
  console.log("[data] Catalog size:", CATALOG.length);
}

// 5) Table helpers
function createRow(){
  const tpl = document.getElementById('rowTpl');
  const tr = tpl?.content?.firstElementChild?.cloneNode(true) || document.createElement('tr');
  if(!tpl){
    tr.innerHTML = `<td class="serial"></td>
      <td><select class="sys"></select></td>
      <td><select class="code"></select></td>
      <td><input class="iname"></td>
      <td class="qty-cell"><button class="qty-dec">-</button><input class="qty" value="1" type="number" min="1"><button class="qty-inc">+</button></td>
      <td><input class="price" type="number" min="0"></td>
      <td class="total">—</td>
      <td><button class="btn-del">X</button></td>`;
  }
  wireRow(tr); body.appendChild(tr); renumber(); return tr;
}
function renumber(){ [...body.querySelectorAll('tr')].forEach((tr,i)=> tr.querySelector('.serial') && (tr.querySelector('.serial').textContent = i+1)); }
function getParts(tr){
  return {
    sys: tr.querySelector('.sys'), code: tr.querySelector('.code'), iname: tr.querySelector('.iname'),
    icolor: tr.querySelector('.icolor'), unit: tr.querySelector('.unit'),
    qty: tr.querySelector('.qty'), price: tr.querySelector('.price'), total: tr.querySelector('.total')
  };
}
function fillSystemSelect(sel){
  if(!sel) return;
  const systems = Object.keys(bySystem).sort();
  while (sel.options?.length) sel.remove(0);
  sel.appendChild(opt('', '— Hệ —'));
  systems.forEach(s=> sel.appendChild(opt(s,s)));
}
function onSystemChange(tr){
  const { sys, code, iname, icolor, total } = getParts(tr);
  if(iname) iname.value = ''; if(total) total.textContent = '—'; tr.removeAttribute('data-kg'); tr.removeAttribute('data-total');
  if(code){ while (code.options.length) code.remove(0); code.appendChild(opt('', '— Mã hàng —')); }
  if(icolor){ while (icolor.options.length) icolor.remove(0); icolor.appendChild(opt('', '— Màu —')); }
  const list = bySystem[norm(sys?.value)] || []; const seen = new Set();
  list.forEach(r=>{ const m = norm(r['Mã Hàng hóa'] ?? r['Mã hàng'] ?? r['Ma hang']); if (!m || seen.has(m)) return; seen.add(m); code?.appendChild(opt(m, m)); });
}
function onCodeChange(tr){
  const { sys, code, iname, icolor, price } = getParts(tr);
  const list = bySystem[norm(sys?.value)] || [];
  const variants = list.filter(r => norm(r['Mã Hàng hóa'] ?? r['Mã hàng'] ?? r['Ma hang']) === norm(code?.value));
  if (!variants.length){ return; }
  const first = variants[0];
  const name  = first['Tên Hàng hóa'] ?? first['Ten Hang hoa'] ?? first['Tên hàng'] ?? '';
  const kg    = toNumber(first['Khối lượng (kg/thanh)'] ?? first['Khoi luong (kg/thanh)'] ?? first['Kg/thanh']);
  if(iname) iname.value = name; tr.dataset.kg = kg;
  if(icolor){
    while (icolor.options.length) icolor.remove(0);
    const colors = [...new Set(variants.map(r => norm(r['Màu'] ?? r['Mau'])).filter(Boolean))];
    icolor.appendChild(opt('', colors.length ? '— Chọn màu —' : '— Màu —'));
    colors.forEach(c => icolor.appendChild(opt(c,c))); if (colors.length === 1) icolor.value = colors[0];
  }
  const byColor = variants.find(r => norm(r['Màu'] ?? r['Mau']) === norm(icolor?.value)) || first;
  const pAuto = toNumber(byColor['Đơn giá'] ?? byColor['Don gia']); if(price && !toNumber(price.value)) price.value = pAuto ? String(pAuto) : '';
  if(price) sanitize(price); computeRow(tr);
}
function onColorChange(tr){
  const { sys, code, icolor, price } = getParts(tr);
  const list = bySystem[norm(sys?.value)] || [];
  const row = list.find(r => norm(r['Mã Hàng hóa'] ?? r['Mã hàng'] ?? r['Ma hang']) === norm(code?.value)
                         && norm(r['Màu'] ?? r['Mau']) === norm(icolor?.value));
  const p = toNumber(row && (row['Đơn giá'] ?? row['Don gia'])); if(price && !toNumber(price.value)) price.value = p ? String(p) : '';
  if(price) sanitize(price); computeRow(tr);
}
function sanitize(input){ const n = toNumber(input?.value); if(input) input.value = n ? String(n) : ''; }
function computeRow(tr){
  const { qty, price, total } = getParts(tr);
  const kg = toNumber(tr.dataset.kg); const dongia = toNumber(price?.value); const sl = toNumber(qty?.value || 1);
  const isAcc = tr.dataset.kind === 'acc';
  const tt = isAcc ? Math.round(dongia * sl) : Math.round(kg * dongia * sl);
  if(total) total.textContent = (dongia && sl && (isAcc || kg)) ? money(tt) : '—';
  tr.dataset.total = String(tt || 0);
  recomputeSummary();
}
function adjustQty(tr, delta){
  const { qty } = getParts(tr);
  const cur = toNumber(qty?.value || 1);
  const v = Math.max(1, cur + delta);
  if(qty) qty.value = String(v);
  computeRow(tr);
}
function wireRow(tr){
  const { sys, code, price, icolor, qty } = getParts(tr);
  fillSystemSelect(sys);
  sys?.addEventListener('change', () => onSystemChange(tr));
  code?.addEventListener('change', () => onCodeChange(tr));
  icolor?.addEventListener('change', () => onColorChange(tr));
  price?.addEventListener('input',  () => { sanitize(price); computeRow(tr); });
  qty?.addEventListener('input',    () => { sanitize(qty);   computeRow(tr); });
  qty?.addEventListener('keydown',  (e)=>{ if(e.key==='Enter'){ e.preventDefault(); createRow().querySelector('.sys')?.focus(); }});
  tr.querySelector('.qty-dec')?.addEventListener('click', ()=> adjustQty(tr, -1));
  tr.querySelector('.qty-inc')?.addEventListener('click', ()=> adjustQty(tr, +1));
  tr.querySelector('.btn-del')?.addEventListener('click', ()=>{ tr.remove(); renumber(); recomputeSummary(); });
}
function recomputeSummary(){
  const subtotal = [...body.querySelectorAll('tr')].map(tr => toNumber(tr.dataset.total)).reduce((a,b)=>a+b,0);
  const dAbs = Math.max(0, toNumber(document.getElementById('discountAmount')?.value));
  const grand = Math.max(0, subtotal - dAbs);
  const s1=document.getElementById('sum_subtotal'), s2=document.getElementById('sum_grand');
  const c1=document.getElementById('card_subtotal'), c2=document.getElementById('card_grand');
  if(s1) s1.textContent = money(subtotal); if(s2) s2.textContent = money(grand);
  if(c1) c1.textContent = money(subtotal); if(c2) c2.textContent = money(grand);
}

// 6) CSV export
function exportCsv(){
  const headers = ['STT','Hệ nhôm','Mã hàng','Tên hàng / Quy cách','Màu nhôm','ĐVT','Số lượng','Đơn giá','Thành tiền'];
  const lines = [headers.join(',')];
  [...body.querySelectorAll('tr')].forEach((tr,i)=>{
    const { sys, code, iname, icolor, qty, price, unit } = getParts(tr);
    const tt = toNumber(tr.dataset.total);
    const row = [i+1, sys?.value||'', code?.value||'', iname?.value||'', icolor?.value||'', (unit?.value||'Thanh'), qty?.value||1, price?.value||0, tt];
    lines.push(row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
  });
  const blob = new Blob(['\ufeff' + lines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `don-hang-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(a.href);
}

// 7) Matching logic
function guessSystemByCode(code){
  const c = String(code||'').trim();
  if(!c) return '';
  for (const sys in bySystem){
    if ((bySystem[sys]||[]).some(r => String(r['Mã hàng']||r['Mã Hàng hóa']||r['Ma hang']||'').trim() === c)){
      return sys;
    }
  }
  return '';
}
function findBestByCodeOrName(code, name, minName=0.5){
  const {a:codeA, b:codeB} = codeNormVariants(code);
  // 1) code exact variant
  let hit = CATALOG.find(x => x.codeA === codeA) || CATALOG.find(x => x.codeB === codeB);
  if (hit) return { sys: hit.sys, code: hit.code, via: 'code_exact' };
  // 2) name similarity
  const qTokens = nameTokens(name);
  let best = null, bestScore = 0;
  for (const row of CATALOG){
    let s = jaccard(qTokens, row.tokens);
    if (vnNoAccent(row.name).includes(vnNoAccent(name))) s = Math.max(s, 0.95); // ưu tiên chứa cụm
    if (s > bestScore){ bestScore = s; best = row; }
  }
  if (best && bestScore >= minName) return { sys: best.sys, code: best.code, via: `name_${bestScore.toFixed(2)}` };
  return null;
}
function existsInCatalog(code){
  const {a:codeA, b:codeB} = codeNormVariants(code);
  return CATALOG.some(x => x.codeA === codeA || x.codeB === codeB);
}

// 8) Import (XLSX A=STT, B=Name, C=Code, D=Qty), robust sheet auto-detect, skip MISS
function ensureImportInput(){
  let input = document.getElementById('importFile');
  if(!input){
    input = document.createElement('input');
    input.type = 'file'; input.id = 'importFile';
    input.accept = '.xlsx,.csv,.json'; input.hidden = true;
    document.body.appendChild(input);
  }
  return input;
}
async function importData(){
  const input = ensureImportInput();
  input.onchange = async () => {
    const file = input.files[0]; if(!file){ console.warn("[import] No file selected"); return; }
    console.log("[import] Start:", file.name, file.type, "size:", file.size);
    try{
      let parsed = [];
      if (file.name.toLowerCase().endsWith('.xlsx')){
        if (typeof XLSX === 'undefined'){ alert("Thiếu thư viện XLSX."); return; }
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type:'array' });
        const names = wb.SheetNames || [];
        console.log("[import] Workbook sheets:", names);
        if(!names.length){ alert("File Excel không có sheet."); input.value=''; return; }

        // pick the sheet with the most data in A3:D
        let best = {name:null, count: -1};
        for (const name of names){
          const ws = wb.Sheets[name];
          let rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          rows = rows.slice(2).map(r => (r||[]).slice(0,4));
          const cnt = rows.filter(r => (r[0]||r[1]||r[2]||r[3])).length;
          console.log(`[import] Probe "${name}": A3:D rows =`, cnt, rows.slice(0,2));
          if (cnt > best.count){ best = {name, count: cnt}; }
        }
        if (!best.name || best.count <= 0){ alert("Không thấy dữ liệu trong A3:D của các sheet."); input.value=''; return; }

        // use the best sheet
        const ws = wb.Sheets[best.name];
        let rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        rows = rows.slice(2).map(r => (r||[]).slice(0,4)); // A..D
        console.log(`[import] Use sheet "${best.name}" rows:`, rows.length, rows.slice(0,5));

        // map: A=STT, B=Name, C=Code, D=Qty; price=0
        parsed = rows
          .map(r => ({ code:String(r[2]||'').trim(), name:String(r[1]||'').trim(), qty:toNumber(r[3]||1), price:0, sys:'', matched:false }))
          .filter(x => x.code || x.name);

        // fuzzy match/ code match
        parsed = parsed.map(r => {
          let sys = r.sys || '';
          let code = r.code;
          const found = findBestByCodeOrName(code, r.name, 0.5);
          if (found){
            code = found.code;
            if (!sys) sys = found.sys;
            r.matched = true;
            console.log('[match]', r.name, '=>', code, '(', sys, ') via', found.via);
          } else if (code && existsInCatalog(code)) {
            if (!sys) sys = guessSystemByCode(code);
            r.matched = true;
            console.log('[match-by-code-only]', r.name, '=>', code, '(', sys, ')');
          } else {
            console.warn('[match MISS]', r.name, '| code:', r.code);
          }
          return { ...r, code, sys, matched: r.matched };
        });
      } else {
        alert("Nút này chỉ hỗ trợ Excel (.xlsx). CSV/JSON vui lòng dùng nút riêng.");
        input.value=''; return;
      }

      console.log("[import] Parsed rows:", parsed.length);
      
      // Fill table: only matched
      const toAdd = parsed.filter(x => x.matched);
      body.innerHTML='';
      for(const r of toAdd){
        const tr = createRow();
        const { sys, code, iname, qty, price } = getParts(tr);
        if(sys){ sys.value = r.sys || ''; onSystemChange(tr); }
        if(code){ code.value = r.code || ''; onCodeChange(tr); }
        if(iname) iname.value = r.name || '';
        if(qty)  qty.value  = r.qty || 1;
        if(price)price.value= r.price ? String(r.price) : price.value;
        computeRow(tr);
      }
      renumber(); recomputeSummary();
      console.log("[import] Done. Rows added:", toAdd.length, "| skipped (miss):", parsed.length - toAdd.length);
    }catch(e){
      alert('Không đọc được file import. Xem console để biết chi tiết.');
      console.error("[import] ERROR:", e);
    }
    input.value='';
  };
  input.click();
}

// 9) Accessories (optional UI)
let ACCESSORIES = [];
async function loadAccessories(){
  try{
    const res = await fetch('phukien.json', {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    ACCESSORIES = await res.json();
    console.log("[acc] Loaded accessories:", ACCESSORIES.length);
  }catch(e){ console.warn('Không tải được phukien.json', e); ACCESSORIES = []; }
}
function uniqueAccessorySystems(){ return Array.from(new Set(ACCESSORIES.map(x=> String(x.system||'').trim()).filter(Boolean))); }
function renderAccessoryList(system, q=''){
  const list = document.getElementById('pkList'); if(!list) return;
  const lower = t => String(t||'').toLowerCase();
  const rows = ACCESSORIES.filter(x => (!system || x.system===system) &&
    (lower(x.code).includes(lower(q)) || lower(x.name).includes(lower(q))));
  if(!rows.length){ list.innerHTML = '<div style="padding:10px;color:#9aa3b2">Chưa có phụ kiện phù hợp.</div>'; return; }
  list.innerHTML = rows.map((x,i)=>{
    const price = Number(x.price||0).toLocaleString('vi-VN');
    return `<div class="pk-item">
      <input type="checkbox" class="pk-check" id="pk_${i}"
             data-code="${x.code||''}" data-system="${x.system||''}" data-name="${x.name||''}"
             data-unit="${x.unit||''}" data-price="${x.price||0}" data-grp="${x.grp||''}">
      <label for="pk_${i}"><b>${x.code||''}</b> — ${x.name||''}
        <span style="color:#94a3b8">(${x.system||''})</span><br><i>${x.unit||''}</i> · <b>${price}</b></label>
    </div>`;
  }).join('');
}
function openAccessoryPicker(){
  const dlg = document.getElementById('pkModal'); if(!dlg) return;
  const selSys = document.getElementById('pkSystem');
  const search = document.getElementById('pkSearch');
  const closeBtn = document.getElementById('pkClose'); closeBtn && (closeBtn.onclick = ()=> dlg.close());
  const systems = uniqueAccessorySystems();
  if(selSys){
    selSys.innerHTML = '<option value="">— Theo hệ —</option>' + systems.map(s=>`<option value="${s}">${s}</option>`).join('');
    const firstSys = document.querySelector('#itemsBody .sys')?.value || '';
    if(firstSys && systems.includes(firstSys)) selSys.value = firstSys;
    selSys.onchange = ()=> renderAccessoryList(selSys.value, search?.value || '');
  }
  if(search){ search.oninput = ()=> renderAccessoryList(selSys?.value || '', search.value); }
  renderAccessoryList(selSys?.value || '', '');
  dlg.showModal();
}
function collectSelectedAccessories(){
  const items = Array.from(document.querySelectorAll('#pkList .pk-item'));
  const picked = [];
  for(const it of items){
    const cb = it.querySelector('.pk-check');
    if(cb && cb.checked){
      picked.push({
        system: cb.dataset.system, code: cb.dataset.code, name: cb.dataset.name,
        unit: cb.dataset.unit || 'Cái', price: Number(cb.dataset.price||0), qty: 1,
        grp: cb.dataset.grp || ''
      });
    }
  }
  return picked;
}
function ensureOption(sel, value, label){
  if(!sel) return;
  if([...sel.options].some(o=>o.value===value)) return;
  const o = document.createElement('option'); o.value = value; o.textContent = label || value; sel.appendChild(o);
}
function addAccessoriesToOrder(picked){
  if(!picked.length) return;
  for(const a of picked){
    const tr = createRow();
    const { sys, code, iname, qty, price, unit } = getParts(tr);
    tr.dataset.kind = 'acc'; tr.dataset.grp = a.grp || '';
    tr.dataset.kg = 1; // phụ kiện: thành tiền = đơn giá * SL
    ensureOption(sys, a.system||'', a.system||''); if(sys) sys.value = a.system || '';
    ensureOption(code, a.code||'', a.code||'');   if(code) code.value = a.code || '';
    if(iname) iname.value = a.name || '';
    if(unit) unit.value = a.unit || 'Cái';
    if(qty)  qty.value  = String(1);
    if(price)price.value= String(a.price||0);
    computeRow(tr);
  }
  console.log("[acc] Added accessories:", picked.length);
}
function setupAccessoryUI(){
  loadAccessories();
  const btn = document.getElementById('addAccessoryBtn');
  btn && btn.addEventListener('click', openAccessoryPicker);
  const ok = document.getElementById('pkSelect');
  ok && ok.addEventListener('click', ()=>{
    const picked = collectSelectedAccessories();
    addAccessoriesToOrder(picked);
    document.getElementById('pkModal')?.close();
  });
}

// 10) Print integration
function collectForPrint(){
  const rows = [...document.querySelectorAll('#itemsBody tr')].map((tr,i)=>{
    const { sys, code, iname, icolor, unit, qty, price } = getParts(tr);
    const kgPer = Number(tr.dataset.kg || 0);
    const amount= Number(tr.dataset.total || 0);
    const kind  = tr.dataset.kind || 'main';
    return {
      stt: i+1,
      sys: sys?.value || '',
      code: code?.value || '',
      name: iname?.value || '',
      color: icolor?.value || '',
      unit: unit?.value || 'Thanh',
      qty: Number(qty?.value || 1),
      kgPer, price: Number(price?.value || 0), amount, kind
    };
  }).filter(r => r.sys || r.code || r.name);

  const subtotal = rows.reduce((s,r)=> s + Number(r.amount||0), 0);
  const discount = Number(document.getElementById('discountAmount')?.value || 0);
  const grand    = Math.max(0, subtotal - discount);

  return {
    customer: document.getElementById('customer')?.value || '',
    phone:    document.getElementById('phone')?.value || '',
    dateText: document.getElementById('today')?.textContent || '',
    rows, subtotal, discount, grand
  };
}

// 11) Init
async function init(){
  try{
    const res = await fetch(DATA_URL, {cache:'no-store'});
    if(!res.ok) throw new Error("HTTP "+res.status);
    const js = await res.json(); 
    const records = js.Data || js || [];
    indexData(records);
  } catch(e){ console.error('[init] Không tải được data.json', e); }
  createRow();

  // Buttons
  document.getElementById('addRowBtn')?.addEventListener('click', ()=>{ createRow(); });
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportCsv);
  document.getElementById('discountAmount')?.addEventListener('input', recomputeSummary);

  const importBtn = document.getElementById('importBtn');
  importBtn && importBtn.addEventListener('click', (e)=>{ e.preventDefault(); importData(); });

  const printBtn = document.getElementById('printBtn');
  if (printBtn){
    printBtn.addEventListener('click', ()=>{
      const payload = collectForPrint();
      try{ localStorage.setItem('order_print_payload', JSON.stringify(payload)); }catch(e){}
      window.open('print.html','_blank');
    });
  }

  setupAccessoryUI();
  console.log("[init] App ready");
}

document.addEventListener('DOMContentLoaded', init);
