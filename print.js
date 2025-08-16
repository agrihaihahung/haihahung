const money = n => (Number(n)||0).toLocaleString('vi-VN');
function loadPayload(){ try{ const raw = localStorage.getItem('order_print_payload'); return raw ? JSON.parse(raw) : null; }catch(e){ return null; } }

function subtotal(rows){
  let sum = 0, kg = 0;
  for(const r of rows){
    sum += Number(r.amount||0);
    kg += Number(r.qty||0) * Number(r.kgPer||0);
  }
  return {sum, kg};
}
function rowHtml(r, idx){
  const tongKL = Number(r.qty||0) * Number(r.kgPer||0);
  return `<tr>
    <td class="c">${idx}</td>
    <td>${r.sys||''}</td>
    <td>${r.code||''}</td>
    <td>${r.name||''}</td>
    <td class="c">${r.color||''}</td>
    <td class="c">${r.unit||'Thanh'}</td>
    <td class="r">${money(r.qty)}</td>
    <td class="r">${money(r.kgPer)}</td>
    <td class="r">${money(tongKL)}</td>
    <td class="r">${money(r.price)}</td>
    <td class="r">${money(r.amount)}</td>
  </tr>`;
}
function headerRow(title, amount){
  return `<tr class="sec">
    <td colspan="10"><b>${title}</b></td>
    <td class="r b">${money(amount)}</td>
  </tr>`;
}

function render(){
  const d = loadPayload();
  if(!d){ document.body.innerHTML = '<div style="padding:20px">Không có dữ liệu in. Hãy quay lại trang đơn hàng.</div>'; return; }
  document.getElementById('mCustomer').textContent = d.customer || '';
  document.getElementById('mPhone').textContent = d.phone || '';
  document.getElementById('mDate').textContent = d.dateText || '';
  const tb = document.getElementById('pBody');

  const all = Array.isArray(d.rows) ? d.rows : [];
  const mains = all.filter(r => (r.kind||'main') !== 'acc');
  const accs  = all.filter(r => (r.kind||'main') === 'acc');

  let out = '';
  let idx = 1;
  let totalKgAll = 0;

  if(mains.length){
    const st = subtotal(mains);
    out += headerRow('NHÔM (Hệ chính)', st.sum);
    for(const r of mains){ out += rowHtml(r, idx++); totalKgAll += Number(r.qty||0) * Number(r.kgPer||0); }
  }
  if(accs.length){
    const st = subtotal(accs);
    out += headerRow('PHỤ KIỆN', st.sum);
    for(const r of accs){ out += rowHtml(r, idx++); totalKgAll += Number(r.qty||0) * Number(r.kgPer||0); }
  }

  tb.innerHTML = out || '<tr><td colspan="11" class="c">(Chưa có dòng)</td></tr>';

  // If payload supplied subtotal/discount/grand, use them; else compute
  const subProvided = Number(d.subtotal||0) > 0 || (mains.length+accs.length)>0;
  const subtotalAll = (Number(d.subtotal||0) || (subtotal(mains).sum + subtotal(accs).sum));
  const discount = Number(d.discount||0);
  const grand = (Number(d.grand||0) || (subtotalAll - discount));

  document.getElementById('pTotalKg').textContent = money(totalKgAll);
  document.getElementById('pSubtotal').textContent = money(subtotalAll);
  document.getElementById('pDiscount').textContent = money(discount);
  document.getElementById('pGrand').textContent = money(grand);
}
document.addEventListener('DOMContentLoaded', render);
