(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const money = n => new Intl.NumberFormat('vi-VN', {maximumFractionDigits:0}).format(Math.round(Number(n)||0)) + ' ₫';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = v => Number(v)||0;
  function numberWords(n) {
    if (!n) return 'Không đồng';
    const digits=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
    const read3=x=>{let s='',h=Math.floor(x/100),t=Math.floor(x%100/10),u=x%10;if(h)s+=digits[h]+' trăm';else if(t||u)s+='không trăm';if(t>1)s+=' '+digits[t]+' mươi';else if(t===1)s+=' mười';else if(u&&h)s+=' lẻ';if(u){if(t>1&&u===1)s+=' mốt';else if(t>0&&u===5)s+=' lăm';else s+=' '+digits[u]}return s.trim()};
    const units=['',' nghìn',' triệu',' tỷ',' nghìn tỷ',' triệu tỷ'];let groups=[];while(n>0){groups.unshift(n%1000);n=Math.floor(n/1000)}
    return groups.map((g,i)=>g?read3(g)+(units[groups.length-i-1]||''):'').filter(Boolean).join(' ').replace(/\s+/g,' ').trim()+' đồng';
  }
  function getPayload() {
    try { return JSON.parse(localStorage.getItem('haihahung_quote_print') || 'null'); } catch { return null; }
  }
  function set(id, value, fallback='—') { const el=$(id); if(el) el.textContent=(value===undefined||value===null||value==='')?fallback:String(value); }
  function row(item,i,kind) {
    const qty=num(item.qty), price=num(item.price), total=kind==='aluminum' ? qty*num(item.weight)*price : qty*price;
    const name=item.name || (kind==='aluminum'?'Nhôm thanh':'Phụ kiện');
    if(kind==='aluminum') {
      const weight=num(item.weight), totalWeight=qty*weight;
      const fmt=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3}).format(n);
      return `<tr><td class="center">${i+1}</td><td>${esc(item.system||'—')}</td><td>${esc(item.code||'')}</td><td><strong>${esc(name)}</strong>${item.spec?`<br><span class="muted-spec">${esc(item.spec)}</span>`:''}</td><td class="center">${esc(item.color||'—')}</td><td class="center">${esc(item.unit||'Thanh')}</td><td class="num">${fmt(qty)}</td><td class="num">${weight?fmt(weight):'—'}</td><td class="num">${weight?fmt(totalWeight):'—'}</td><td class="num">${money(price)}</td><td class="num">${money(total)}</td></tr>`;
    }
    return `<tr><td class="center">${i+1}</td><td>${esc(item.code)}</td><td><strong>${esc(name)}</strong></td><td>${esc(item.group||item.spec||'—')}</td><td class="center">${esc(item.unit||'Cái')}</td><td class="num">${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(qty)}</td><td class="num">${money(price)}</td><td class="num">${money(total)}</td></tr>`;
  }
  function init() {
    const p=getPayload();
    if(!p) {
      set('quoteDate',new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date()));
      $('aluminumBody').innerHTML='<tr><td colspan="11" class="center">Chưa nhận được dữ liệu báo giá. Hãy quay lại màn hình lập báo giá và chọn “In / PDF”.</td></tr>';
      $('accessorySection').hidden=true;
      $('aluminumEmpty').style.display='none';
      return;
    }
    const q=p.quote||{}, c=p.customer||{}, company=p.company||{}, totals=p.totals||{};
    set('quoteCode',q.code);set('footerCode',q.code);
    const d=q.date?new Date(q.date+'T00:00:00'):new Date();
    set('quoteDate',new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d));
    set('customerName',c.name);set('customerPhone',c.phone);set('customerContact',c.contact);
    set('customerAddress',c.address);set('salesperson',q.salesperson);set('validity',(q.validityDays||15)+' ngày');
    set('quoteNotes',p.notes,'Báo giá có hiệu lực theo thời hạn nêu trên.');
    set('deliveryTime',p.deliveryTime,'Theo thỏa thuận');set('paymentTerms',p.paymentTerms,'Theo thỏa thuận');
    const aluminum=Array.isArray(p.aluminum)?p.aluminum:[];
    const accessories=Array.isArray(p.accessories)?p.accessories:[];
    $('aluminumBody').innerHTML=aluminum.map((x,i)=>row(x,i,'aluminum')).join('');
    $('aluminumEmpty').style.display=aluminum.length?'none':'block';
    $('aluminumTotal').textContent=money(totals.aluminumTotal ?? aluminum.reduce((s,x)=>s+num(x.qty)*num(x.weight)*num(x.price),0));
    const totalAluminumWeight=aluminum.reduce((s,x)=>s+num(x.qty)*num(x.weight),0);
    $('aluminumWeightTotal').textContent=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3}).format(totalAluminumWeight)+' kg';
    const include=p.accessoriesIncluded!==false;
    $('accessorySection').hidden=!include;
    if(include) {
      $('accessoryBody').innerHTML=accessories.map((x,i)=>row(x,i,'accessory')).join('');
      $('accessoryEmpty').style.display=accessories.length?'none':'block';
      $('accessoryTotal').textContent=money(totals.accessoryTotal ?? accessories.reduce((s,x)=>s+num(x.qty)*num(x.price),0));
    }
    const subtotal=num(totals.subtotal) || num(totals.aluminumTotal)+num(totals.accessoryTotal);
    const discount=num(totals.discount ?? p.discount?.amount);
    const vatRate=num(p.vatRate);
    const taxable=Math.max(0,subtotal-discount);
    const vat=num(totals.vat) || taxable*vatRate/100;
    const grand=num(totals.grand) || taxable+vat;
    set('subtotal',money(subtotal));set('discount',money(discount));set('vatRate',vatRate);
    const discountLabel=$('discountLabel');if(discountLabel)discountLabel.textContent=p.discount?.accessoriesOnly?'Chiết khấu phụ kiện':'Chiết khấu';
    set('vatAmount',money(vat));set('grandTotal',money(grand));set('amountWords',numberWords(Math.round(grand)));
  }
  $('printBtn').addEventListener('click',()=>window.print());
  $('backBtn').addEventListener('click',()=>history.back());
  window.addEventListener('load',init);
})();