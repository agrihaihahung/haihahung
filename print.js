const money = n => (Number(n)||0).toLocaleString('vi-VN');
function loadPayload(){ try{ const raw = localStorage.getItem('order_print_payload'); return raw ? JSON.parse(raw) : null; }catch(e){ return null; } }
function render(){
  const d = loadPayload();
  if(!d){ document.body.innerHTML = '<div style="padding:20px">Không có dữ liệu in. Hãy quay lại trang đơn hàng.</div>'; return; }
  document.getElementById('mCustomer').textContent = d.customer || '';
  document.getElementById('mPhone').textContent = d.phone || '';
  document.getElementById('mDate').textContent = d.dateText || '';
  const tb = document.getElementById('pBody');
  let totalKg = 0;
  tb.innerHTML = (d.rows||[]).map(r=>{
    const tongKL = r.qty * (Number(r.kgPer)||0);
    totalKg += tongKL;
    return `<tr>
      <td class="c">${r.stt}</td>
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
  }).join('') || '<tr><td colspan="11" class="c">(Chưa có dòng)</td></tr>';
  document.getElementById('pTotalKg').textContent = money(totalKg);
  document.getElementById('pSubtotal').textContent = money(d.subtotal||0);
  document.getElementById('pDiscount').textContent = money(d.discount||0);
  document.getElementById('pGrand').textContent = money(d.grand||0);
}
document.addEventListener('DOMContentLoaded', render);
