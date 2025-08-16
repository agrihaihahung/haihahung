(function setToday(){
  const el = document.getElementById('today');
  if(!el) return; const d = new Date();
  el.textContent = `Ngày ${String(d.getDate()).padStart(2,'0')} Tháng ${String(d.getMonth()+1).padStart(2,'0')} Năm ${d.getFullYear()}`;
})();

const DATA_URL = 'data.json';

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

let bySystem = {}; 
const body = document.getElementById('itemsBody');

function indexData(records){
  bySystem = records.reduce((acc, r) => {
    const k = norm(r['Hệ Nhôm'] ?? r['He Nhom'] ?? r['Hệ']);
    if (!k) return acc; (acc[k] = acc[k] || []).push(r); return acc;
  }, {});
}

function fillSystemSelect(sel){
  const systems = Object.keys(bySystem).sort();
  while (sel.options.length) sel.remove(0);
  sel.appendChild(opt('', '— Hệ —'));
  systems.forEach(s=> sel.appendChild(opt(s,s)));
}

function createRow(){
  const tpl = document.getElementById('rowTpl');
  const tr = tpl.content.firstElementChild.cloneNode(true);
  wireRow(tr); body.appendChild(tr); renumber(); return tr;
}

function renumber(){
  [...body.querySelectorAll('tr')].forEach((tr,i)=>{ tr.querySelector('.serial').textContent = i+1; });
}

function getParts(tr){
  return {
    sys: tr.querySelector('.sys'), code: tr.querySelector('.code'), iname: tr.querySelector('.iname'),
    icolor: tr.querySelector('.icolor'), qty: tr.querySelector('.qty'), price: tr.querySelector('.price'),
    total: tr.querySelector('.total'), unit: tr.querySelector('.unit')
  };
}

function onSystemChange(tr){
  const { sys, code, iname, icolor, total } = getParts(tr);
  iname.value = ''; total.textContent = '—'; tr.removeAttribute('data-kg'); tr.removeAttribute('data-total');
  while (code.options.length) code.remove(0); code.appendChild(opt('', '— Mã hàng —'));
  while (icolor.options.length) icolor.remove(0); icolor.appendChild(opt('', '— Màu —'));
  const list = bySystem[norm(sys.value)] || []; const seen = new Set();
  list.forEach(r=>{ const m = norm(r['Mã Hàng hóa'] ?? r['Mã hàng'] ?? r['Ma hang']); if (!m || seen.has(m)) return; seen.add(m); code.appendChild(opt(m, m)); });
}

function onCodeChange(tr){
  const { sys, code, iname, icolor, price } = getParts(tr);
  const list = bySystem[norm(sys.value)] || [];
  const variants = list.filter(r => norm(r['Mã Hàng hóa'] ?? r['Mã hàng'] ?? r['Ma hang']) === norm(code.value));
  if (!variants.length) return;
  const first = variants[0];
  const name  = first['Tên Hàng hóa'] ?? first['Ten Hang hoa'] ?? first['Tên hàng'] ?? '';
  const kg    = toNumber(first['Khối lượng (kg/thanh)'] ?? first['Khoi luong (kg/thanh)'] ?? first['Kg/thanh']);
  iname.value = name; tr.dataset.kg = kg;
  while (icolor.options.length) icolor.remove(0);
  const colors = [...new Set(variants.map(r => norm(r['Màu'] ?? r['Mau'])).filter(Boolean))];
  icolor.appendChild(opt('', colors.length ? '— Chọn màu —' : '— Màu —'));
  colors.forEach(c => icolor.appendChild(opt(c,c))); if (colors.length === 1) icolor.value = colors[0];
  const byColor = variants.find(r => norm(r['Màu'] ?? r['Mau']) === norm(icolor.value)) || first;
  const pAuto = toNumber(byColor['Đơn giá'] ?? byColor['Don gia']); if(!toNumber(price.value)) price.value = pAuto ? String(pAuto) : '';
  sanitize(price); computeRow(tr);
}

function onColorChange(tr){
  const { sys, code, icolor, price } = getParts(tr);
  const list = bySystem[norm(sys.value)] || [];
  const row = list.find(r => norm(r['Mã Hàng hóa'] ?? r['Mã hàng'] ?? r['Ma hang']) === norm(code.value)
                         && norm(r['Màu'] ?? r['Mau']) === norm(icolor.value));
  const p = toNumber(row && (row['Đơn giá'] ?? row['Don gia'])); if(!toNumber(price.value)) price.value = p ? String(p) : '';
  sanitize(price); computeRow(tr);
}

function sanitize(input){ const n = toNumber(input.value); input.value = n ? String(n) : ''; }

function computeRow(tr){
  const { qty, price, total } = getParts(tr);
  const kg = toNumber(tr.dataset.kg); const dongia = toNumber(price.value); const sl = toNumber(qty.value || 1);
  const tt = Math.round(kg * dongia * sl); total.textContent = (kg && dongia && sl) ? money(tt) : '—';
  tr.dataset.total = String(tt || 0); recomputeSummary();
}

function adjustQty(tr, delta){
  const { qty } = getParts(tr);
  const cur = toNumber(qty.value || 1);
  const v = Math.max(1, cur + delta);
  qty.value = String(v);
  computeRow(tr);
}

function wireRow(tr){
  const { sys, code, price, icolor, qty } = getParts(tr);
  fillSystemSelect(sys);
  sys.addEventListener('change', () => onSystemChange(tr));
  code.addEventListener('change', () => onCodeChange(tr));
  icolor.addEventListener('change', () => onColorChange(tr));
  price.addEventListener('input',  () => { sanitize(price); computeRow(tr); });
  qty.addEventListener('input',    () => { sanitize(qty);   computeRow(tr); });
  qty.addEventListener('keydown',  (e)=>{ if(e.key==='Enter'){ e.preventDefault(); createRow().querySelector('.sys').focus(); }});
  const decBtn = tr.querySelector('.qty-dec');
  const incBtn = tr.querySelector('.qty-inc');
  if(decBtn) decBtn.addEventListener('click', ()=> adjustQty(tr, -1));
  if(incBtn) incBtn.addEventListener('click', ()=> adjustQty(tr, +1));
  tr.querySelector('.btn-del').addEventListener('click', ()=>{ tr.remove(); renumber(); recomputeSummary(); });
}

function recomputeSummary(){
  const subtotal = [...body.querySelectorAll('tr')].map(tr => toNumber(tr.dataset.total)).reduce((a,b)=>a+b,0);
  const dAbs = Math.max(0, toNumber(document.getElementById('discountAmount').value));
  const grand = Math.max(0, subtotal - dAbs);
  document.getElementById('sum_subtotal').textContent = money(subtotal);
  document.getElementById('sum_grand').textContent    = money(grand);
  document.getElementById('card_subtotal').textContent = money(subtotal);
  document.getElementById('card_grand').textContent    = money(grand);
}

function exportCsv(){
  const headers = ['STT','Hệ nhôm','Mã hàng','Tên hàng / Quy cách','Màu nhôm','ĐVT','Số lượng','Đơn giá','Thành tiền'];
  const lines = [headers.join(',')];
  [...body.querySelectorAll('tr')].forEach((tr,i)=>{
    const { sys, code, iname, icolor, qty, price } = getParts(tr);
    const tt = toNumber(tr.dataset.total);
    const row = [i+1, sys.value, code.value, iname.value, icolor.value, 'Thanh', qty.value, price.value, tt];
    lines.push(row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
  });
  const blob = new Blob(['\ufeff' + lines.join('\\n')], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `don-hang-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(a.href);
}

function importData(){
  const input = document.getElementById('importFile');
  input.onchange = async () => {
    const file = input.files[0]; if(!file) return;
    const text = await file.text();
    try{
      let rows = [];
      if (file.name.endsWith('.json')){
        rows = JSON.parse(text);
      } else {
        const lines = text.split(/\\r?\\n/).filter(l=>l.trim().length);
        if (!lines.length) return;
        const start = lines[0].toLowerCase().includes('stt') ? 1 : 0;
        for (let i=start;i<lines.length;i++){
          const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s=>s.replace(/^"|"$/g,''));
          if (cols.length < 9) continue;
          rows.push({ sys: cols[1], code: cols[2], name: cols[3], color: cols[4], unit: cols[5]||'Thanh', qty: Number(cols[6]||1), price: Number(cols[7]||0) });
        }
      }
      body.innerHTML='';
      for(const r of rows){
        const tr = createRow();
        const { sys, code, iname, icolor, qty, price } = getParts(tr);
        sys.value = r.sys||''; onSystemChange(tr);
        code.value = r.code||''; onCodeChange(tr);
        icolor.value = r.color||''; onColorChange(tr);
        iname.value = r.name||'';
        qty.value = r.qty||1; price.value = r.price||'';
        computeRow(tr);
      }
      renumber(); recomputeSummary();
    }catch(e){ alert('Không đọc được file import.'); console.error(e); }
    input.value='';
  };
  input.click();
}

async function init(){
  try{
    const res = await fetch(DATA_URL); const js = await res.json(); const records = js.Data || js || [];
    indexData(records);
  } catch(e){ console.error('Không tải được data.json', e); }
  createRow();
  document.getElementById('discountAmount').addEventListener('input', recomputeSummary);
  document.getElementById('addRowBtn').addEventListener('click', ()=>{ createRow(); });
  document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
  document.getElementById('importBtn').addEventListener('click', importData);
  document.getElementById('printBtn').addEventListener('click', ()=>{
    const payload = collectForPrint();
    localStorage.setItem('order_print_payload', JSON.stringify(payload));
    window.open('print.html','_blank');
  });
}

function collectForPrint(){
  const rows = [...body.querySelectorAll('tr')].map((tr,i)=>{
    const { sys, code, iname, icolor, qty, price } = getParts(tr);
    const kg = Number(tr.dataset.kg||0);
    return { stt:i+1, sys:sys.value, code:code.value, name:iname.value, color:icolor.value, unit:'Thanh', qty:Number(qty.value||1), kgPer:kg, price:Number(price.value||0), amount:Number(tr.dataset.total||0) };
  }).filter(r=>r.sys||r.code||r.name);
  const subtotal = rows.reduce((a,r)=>a+r.amount,0);
  const discount = Math.max(0, Number(document.getElementById('discountAmount').value||0));
  const grand = Math.max(0, subtotal - discount);
  return { customer:document.getElementById('customer').value, phone:document.getElementById('phone').value, dateText:document.getElementById('today').textContent, rows, subtotal, discount, grand };
}

document.addEventListener('DOMContentLoaded', init);

// ===== PHỤ KIỆN =====
let ACCESSORIES = [];
async function loadAccessories(){
  try{
    const res = await fetch('phukien.json', {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    ACCESSORIES = await res.json();
  }catch(e){ console.warn('Không tải được phukien.json', e); ACCESSORIES = []; }
}
function uniqueAccessorySystems(){
  return Array.from(new Set(ACCESSORIES.map(x=> String(x.system||'').trim()).filter(Boolean)));
}
function renderAccessoryList(system, q=''){
  const list = document.getElementById('pkList');
  if(!list) return;
  const norm = t => String(t||'').toLowerCase();
  const rows = ACCESSORIES.filter(x => (!system || x.system===system) &&
    (norm(x.code).includes(norm(q)) || norm(x.name).includes(norm(q))));
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
  const dlg = document.getElementById('pkModal');
  if(!dlg) return;
  const selSys = document.getElementById('pkSystem');
  const search = document.getElementById('pkSearch');
  const closeBtn = document.getElementById('pkClose');
  if(closeBtn) closeBtn.onclick = ()=> dlg.close();
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
      const qty = 1;
      picked.push({
        system: cb.dataset.system, code: cb.dataset.code, name: cb.dataset.name,
        unit: cb.dataset.unit || 'Cái', price: Number(cb.dataset.price||0), qty,
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
    tr.dataset.kg = 1; // để thành tiền = đơn giá * SL cho phụ kiện
    ensureOption(sys, a.system||'', a.system||''); if(sys) sys.value = a.system || '';
    ensureOption(code, a.code||'', a.code||'');   if(code) code.value = a.code || '';
    if(iname) iname.value = a.name || '';
    if(unit) unit.value = a.unit || 'Cái';
    if(qty)  qty.value  = String(1);
    if(price)price.value= String(a.price||0);
    computeRow(tr);
  }
}
function setupAccessoryUI(){
  loadAccessories();
  const btn = document.getElementById('addAccessoryBtn');
  if(btn){ btn.addEventListener('click', openAccessoryPicker); }
  const ok = document.getElementById('pkSelect');
  if(ok){ ok.addEventListener('click', ()=>{ const picked = collectSelectedAccessories(); addAccessoriesToOrder(picked); document.getElementById('pkModal').close(); }); }
}
document.addEventListener('DOMContentLoaded', setupAccessoryUI);
function collectForPrint(){
  const rows = [...body.querySelectorAll('tr')].map((tr,i)=>{
    const { sys, code, iname, icolor, qty, price } = getParts(tr);
    const kg = Number(tr.dataset.kg||0);
    const unitVal = tr.querySelector('.unit')?.value || 'Thanh';
    const codeVal = code.value || '';
    const sysVal  = sys.value || '';
    const kind = tr.dataset.kind || (/^(pk|phukien)/i.test(codeVal) || /^phukien/i.test(sysVal) ? 'acc' : 'main');
    return { stt:i+1, sys:sysVal, code:codeVal, name:iname.value,
      color:icolor.value, unit:unitVal, qty:Number(qty.value||1), kgPer:kg,
      price:Number(price.value||0), amount:Number(tr.dataset.total||0), kind };
  }).filter(r=>r.sys||r.code||r.name);
  const subtotal = rows.reduce((a,r)=>a+r.amount,0);
  const discount = Math.max(0, Number(document.getElementById('discountAmount').value||0));
  const grand = Math.max(0, subtotal - discount);
  return { customer:customer.value, phone:phone.value, dateText:today.textContent, rows, subtotal, discount, grand };
}
