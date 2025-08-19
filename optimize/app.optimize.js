// === AUTH POPUP ===
(function authGate(){
  const AUTH = { users: [{u:'admin', p:'12341234'}], remember: 'session' };

  const qs = new URLSearchParams(location.search);
  if (qs.get('logout') === '1'){
    try{ sessionStorage.removeItem('opt_authed'); localStorage.removeItem('opt_authed'); }catch(e){}
  }

  const storage = AUTH.remember === 'local' ? localStorage : sessionStorage;
  try{
    if (storage.getItem('opt_authed') === '1'){
      const b = document.getElementById('authBackdrop');
      if (b) b.classList.add('hidden');
      window.__authLoaded = true;
      return;
    }
  }catch(e){}

  const b = document.getElementById('authBackdrop');
  const form = document.getElementById('authForm');
  const u = document.getElementById('authUser');
  const p = document.getElementById('authPass');
  const ebox = document.getElementById('authErr');
  const btn = document.getElementById('authLogin');

  function check(uin, pin){ return AUTH.users.some(x => x.u === String(uin) && x.p === String(pin)); }
  function login(){
    const uval = (u&&u.value||'').trim();
    const pval = (p&&p.value||'').trim();
    if (check(uval, pval)){
      try{ storage.setItem('opt_authed','1'); }catch(e){}
      if (b) b.classList.add('hidden');
      setTimeout(()=>document.getElementById('stockLength')&&document.getElementById('stockLength').focus(), 0);
    }else{
      if (ebox) ebox.textContent = 'Sai tài khoản hoặc mật khẩu.';
      if (p) p.select();
    }
  }
  if (btn) btn.addEventListener('click', (ev)=>{ ev.preventDefault(); login(); });
  if (form) form.addEventListener('submit', (ev)=>{ ev.preventDefault(); login(); });
  try{ window.__tryAuth = login; window.__authLoaded = true; }catch(e){}
  if (u) u.focus();
})();

// === FULL OPTIMIZER ===
(function(){
  const chips = document.getElementById('chips');
  const params = new URLSearchParams(location.search);

  const srcBody = document.getElementById('srcBody');
  const msg = document.getElementById('msg');
  const resultsHost = document.getElementById('results');
  const grandEl = document.getElementById('grand');

  chips.innerHTML = `<span class="chip">Optimize Workspace</span><span class="chip">${new Date().toLocaleString()}</span>`;

  function toNum(v){ const n = Number(String(v).replace(/[^\d.-]/g,'')); return isFinite(n)?n:0; }
  function addRow(row){ row=row||{ma:'',len:'',sl:''}; const tr=document.createElement('tr');
    tr.innerHTML = `
      <td><input class="ma" placeholder="VD: 3318"></td>
      <td><input class="desc" placeholder="Mô tả (tuỳ chọn)"></td>
      <td><input class="len" type="number" min="1" step="1" placeholder="mm"></td>
      <td><input class="sl" type="number" min="1" step="1" placeholder="1"></td>
      <td><button class=\"btn\" type=\"button\">Xoá</button></td>`;
    tr.querySelector('button').addEventListener('click', ()=> tr.remove()); srcBody.appendChild(tr); }
  function getRows(){ const rows=[]; srcBody.querySelectorAll('tr').forEach(tr=>{
      const ma=tr.querySelector('.ma').value.trim(); const len=toNum(tr.querySelector('.len').value); const sl=toNum(tr.querySelector('.sl').value);
      if (ma && len>0 && sl>0) rows.push({ma,len,sl}); }); return rows; }
  function groupByMa(items){ const map={}; for (const {ma,len,sl} of items){ if (!map[ma]) map[ma]=[]; for (let i=0;i<sl;i++) map[ma].push(len);} return map; }
  function packFFD(segments, stock, kerf, trim, minLeft){ const res=[]; const segs=segments.slice().sort((a,b)=>b-a);
    for (const L of segs){ let placed=false; for (const s of res){ const capacity=stock-2*trim; const usedNow=s.cuts.reduce((a,b)=>a+b,0)+Math.max(0,s.cuts.length-1)*kerf; const extraKerf=s.cuts.length>0?kerf:0;
        if (usedNow+extraKerf+L<=capacity){ s.cuts.push(L); const usedAfter=s.cuts.reduce((a,b)=>a+b,0)+Math.max(0,s.cuts.length-1)*kerf; s.remaining=Math.max(0,capacity-usedAfter); placed=true; break; } }
      if (!placed){ const capacity=stock-2*trim; res.push({cuts:[L], remaining:Math.max(0,capacity-L)}); } } return res; }
  function run(){ const stock=toNum(document.getElementById('stockLength').value||5950); const kerf=toNum(document.getElementById('kerf').value||0); const trim=toNum(document.getElementById('trim').value||0);
    const items=getRows(); if(!items.length){ msg.textContent='Chưa có dòng hợp lệ.'; resultsHost.innerHTML=''; grandEl.textContent=''; return; } msg.textContent='';
    try{ localStorage.setItem('opt_last', JSON.stringify({stock,kerf,trim,minLeft,algo,items})); }catch(e){}
    const map=groupByMa(items); const keys=Object.keys(map).sort(); let grand=0;
    resultsHost.innerHTML=keys.map(ma=>{ const plans=packFFD(map[ma],stock,kerf,trim); grand+=plans.length;
      const rows=plans.map((p,i)=>{ const totalCuts=p.cuts.reduce((s,x)=>s+x,0); const joints=Math.max(0,p.cuts.length-1); const used=totalCuts+joints*kerf+2*trim; const waste=Math.max(0,stock-used); const wastePct=used>0?(waste/stock*100):0;
        return `<tr><td>${i+1}</td><td class="left">${p.cuts.join(', ')}</td><td>${totalCuts}</td><td>${joints}</td><td>${waste} / ${wastePct.toFixed(2)}%</td><td>${p.remaining}</td></tr>`; }).join('');
      return `<div class="result-block"><div style="font-weight:700;font-size:15px;margin:8px 0">Mã nhôm: ${ma}</div>
        <table><thead><tr><th>Vây số</th><th class="left">Các đoạn cắt (mm)</th><th>Tổng dài cắt</th><th>Số mối cắt</th><th>Hao hụt (mm / %)</th><th>Dư còn lại (mm)</th></tr></thead>
        <tbody>${rows}</tbody><tfoot><tr><td colspan="2" class="left"><b>Tổng số vây</b></td><td colspan="4" class="left"><b>${plans.length}</b></td></tr></tfoot></table></div>`; }).join('');
    grandEl.textContent=`TỔNG SỐ VÂY TOÀN BỘ: ${grand}`; }
  function toCSV(){function renderSummary(allPlans, keys, stock, kerf, trim){
  let bars = 0, totalWaste=0, totalUsed=0, totalStock=0;
  keys.forEach(ma=>{
    const plans = allPlans[ma];
    bars += plans.length;
    totalStock += plans.length * stock;
    plans.forEach(p=>{
      const totalCuts = p.cuts.reduce((s,x)=>s+x,0);
      const joints = Math.max(0, p.cuts.length-1);
      const used = totalCuts + joints*kerf + 2*trim;
      const waste = Math.max(0, stock - used);
      totalUsed += used; totalWaste += waste;
    });
  });
  const util = totalStock ? ((totalUsed/totalStock)*100) : 0;
  const host = document.getElementById('summaryCards');
  if (!host) return;
  host.innerHTML = `
    <div class="card"><div class="t">Số vây tổng</div><div class="v">${bars}</div></div>
    <div class="card"><div class="t">Tổng vật tư (mm)</div><div class="v">${totalStock}</div></div>
    <div class="card"><div class="t">Tổng sử dụng (mm)</div><div class="v">${totalUsed}</div></div>
    <div class="card"><div class="t">Tổng hao hụt (mm)</div><div class="v">${totalWaste}</div></div>
    <div class="card"><div class="t">Tỉ lệ sử dụng</div><div class="v">${util.toFixed(2)}%</div></div>
  `;
}
 const stock=toNum(document.getElementById('stockLength').value||5950); const kerf=toNum(document.getElementById('kerf').value||0); const trim=toNum(document.getElementById('trim').value||0);
    const items=getRows(); if(!items.length){ alert('Chưa có dữ liệu.'); return; } const map=groupByMa(items); const keys=Object.keys(map).sort(); const lines=[];
    lines.push(['Ma nhom','Mo ta','Vay so','Cac doan (mm)','Tong dai cat','So moi cat','Hao hut (mm)','Hao hut (%)','Du con lai (mm)'].join(','));
    keys.forEach(ma=>{ const plans=packFFD(map[ma],stock,kerf,trim); plans.forEach((p,i)=>{ const totalCuts=p.cuts.reduce((s,x)=>s+x,0); const joints=Math.max(0,p.cuts.length-1);
      const used=totalCuts+joints*kerf+2*trim; const waste=Math.max(0,stock-used); const wastePct=used>0?(waste/stock*100):0; lines.push([ma,i+1,`"${p.cuts.join(' ')}"`,totalCuts,joints,waste,wastePct.toFixed(2),p.remaining].join(',')); }); });
    const blob=new Blob([lines.join('\\n')],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ket-qua-toi-uu.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),500); }

// === SHEET PASTE ===
(function sheetLikeInput(){
  let activeCell = {row:0, col:0}; // 0:ma,1:desc,2:len,3:sl
  function colIndexFromInput(inp){
    if (inp.classList.contains('ma')) return 0;
    if (inp.classList.contains('desc')) return 1;
    if (inp.classList.contains('len')) return 2;
    if (inp.classList.contains('sl')) return 3;
    return 0;
  }
  function ensureRows(n){
    while (srcBody.querySelectorAll('tr').length < n){
      addRow();
    }
  }
  // Track focus
  srcBody.addEventListener('focusin', (e)=>{
    const inp = e.target.closest('input'); if (!inp) return;
    const tr = inp.closest('tr'); if (!tr) return;
    const r = Array.from(srcBody.children).indexOf(tr);
    activeCell = {row:r, col:colIndexFromInput(inp)};
  });
  // Paste 2D block
  srcBody.addEventListener('paste', (e)=>{
    const inp = e.target.closest('input'); if (!inp) return;
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (!text) return;
    e.preventDefault();
    const rows = text.replace(/\r/g,'').split('\n').filter(x=>x.trim().length>0).map(line=>line.split(/\t|,/));
    const startRow = activeCell.row;
    const startCol = activeCell.col;
    ensureRows(startRow + rows.length);
    let filled = 0, prevMa = '';
    for (let i=0;i<rows.length;i++){
      const tr = srcBody.children[startRow + i];
      const cells = [ tr.querySelector('.ma'), tr.querySelector('.desc'), tr.querySelector('.len'), tr.querySelector('.sl') ];
      for (let j=0;j<rows[i].length && (startCol+j)<cells.length; j++){
        let val = rows[i][j].trim();
        const cell = cells[startCol + j];
        if (!cell) continue;
        if (cell.classList.contains('len')){
          val = String(val).replace(/mm/i,'');
          cell.value = Number(val.replace(/[^\d.-]/g,''))||'';
        }else if (cell.classList.contains('sl')){
          cell.value = Number(String(val).replace(/[^\d.-]/g,''))||'';
        }else{
          cell.value = val;
        }
        filled++;
      }
      // Fill forward MA if empty
      const maInp = tr.querySelector('.ma');
      if (maInp && !maInp.value.trim() && prevMa) maInp.value = prevMa;
      prevMa = tr.querySelector('.ma')?.value.trim() || prevMa;
    }
    msg.textContent = `Đã dán ${rows.length} dòng (${filled} ô).`;
  });
})();

  document.getElementById('btnAddRow').addEventListener('click', ()=> addRow());
  document.getElementById('btnPaste').addEventListener('click', async ()=>{ try{ const text=await navigator.clipboard.readText();
      const rows=text.trim().split(/\\r?\\n/).map(l=>l.split(/\\t|,|\\s{2,}/)); rows.forEach(cols=>{ const ma=(cols[0]||'').trim(); let len=toNum(cols[1]||0);
        if (!len && /mm\\b/i.test(cols[1]||'')){ len=toNum(String(cols[1]).replace(/mm/i,'')); } const sl=toNum(cols[2]||1); if (ma && len>0 && sl>0) addRow({ma,len,sl}); });
    }catch(e){ alert('Không đọc được clipboard. Có thể dán trực tiếp vào các ô trong bảng.'); } });
  document.getElementById('btnImportCsv').addEventListener('click', ()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv';
    inp.addEventListener('change', ()=> inp.files&&inp.files[0] && (function(file){ const reader=new FileReader(); reader.onload=()=>{ const text=String(reader.result||'');
      const rows=text.trim().split(/\\r?\\n/).map(l=>l.split(/\\t|,|\\s{2,}/)); rows.forEach(cols=>{ const ma=(cols[0]||'').trim(); let len=toNum(cols[1]||0);
        if (!len && /mm\\b/i.test(cols[1]||'')){ len=toNum(String(cols[1]).replace(/mm/i,'')); } const sl=toNum(cols[2]||1); if (ma && len>0 && sl>0) addRow({ma,len,sl}); }); }; reader.readAsText(file,'utf-8'); })(inp.files[0]) ); inp.click(); });
  document.getElementById('btnRun').addEventListener('click', run);
  document.getElementById('btnClear').addEventListener('click', ()=>{ srcBody.innerHTML=''; resultsHost.innerHTML=''; grandEl.textContent=''; msg.textContent=''; });
  document.getElementById('btnPrint').addEventListener('click', ()=> window.print());
  document.getElementById('btnCsv').addEventListener('click', toCSV);

  try{ const last=JSON.parse(localStorage.getItem('opt_last')||'null'); if (last){ document.getElementById('stockLength').value= last.stock ?? 5950;
      document.getElementById('kerf').value= last.kerf ?? 0; document.getElementById('trim').value= last.trim ?? 0; (last.items||[]).forEach(addRow);
    } else { addRow({ma:'K55-DO', len:1200, sl:4}); addRow({ma:'K55-DO', len:850, sl:2}); addRow({ma:'K55-NEP', len:600, sl:5}); } }catch(e){ addRow(); }
})();
function packBFD(segments, stock, kerf, trim, minLeft){
  const res = [];
  const segs = segments.slice().sort((a,b)=>b-a);
  const capacity = stock - 2*trim;
  for (const L of segs){
    let bestIdx = -1, bestLeft = Infinity;
    for (let i=0;i<res.length;i++){
      const s = res[i];
      const usedNow = s.cuts.reduce((a,b)=>a+b,0) + Math.max(0, s.cuts.length-1)*kerf;
      const extraKerf = s.cuts.length>0 ? kerf : 0;
      const leftAfter = capacity - (usedNow + extraKerf + L);
      if (leftAfter >= Math.max(0, minLeft||0) && leftAfter < bestLeft){
        bestLeft = leftAfter; bestIdx = i;
      }
    }
    if (bestIdx>=0){
      const s = res[bestIdx];
      s.cuts.push(L);
      const usedAfter = s.cuts.reduce((a,b)=>a+b,0) + Math.max(0, s.cuts.length-1)*kerf;
      s.remaining = Math.max(0, capacity - usedAfter);
    } else {
      res.push({cuts:[L], remaining: Math.max(0, capacity - L)});
    }
  }
  return res;
}
