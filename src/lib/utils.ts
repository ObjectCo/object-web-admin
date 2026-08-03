import * as XLSX from 'xlsx';

// 1. 주문 총액 계산 유틸리티
export const calculateOrderTotal = (itemsStr: string | any[]) => {
  try {
    const items = typeof itemsStr === 'string' ? JSON.parse(itemsStr) : itemsStr;
    return items.reduce((sum: number, item: any) => sum + (Number(item.estYards || item.yardage || 0) * Number(item.priceNum || item.basePrice || 0)), 0);
  } catch { 
    return 0; 
  }
};

// 2. 엑셀 다운로드 유틸리티
export const exportToExcel = (data: any[], fileName: string, sheetName: string = "Sheet1") => {
  const wb = XLSX.utils.book_new(); 
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), sheetName); 
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// 3. PDF (명세서/견적서) 인쇄 유틸리티
export const printDocumentPDF = (order: any, documentType: string) => {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const total = calculateOrderTotal(items);
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('팝업 차단이 설정되어 있습니다. 팝업 차단을 해제해주세요.');
    return;
  }
  
  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <title>${documentType} - ${order.profiles?.company}</title>
      <style>
        body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; padding: 40px; color: #111; }
        .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 30px; position: relative; }
        .title { font-size: 32px; font-weight: 900; letter-spacing: 8px; }
        .subtitle { font-size: 12px; color: #666; margin-top: 5px; }
        .info-table { width: 100%; margin-bottom: 30px; font-size: 14px; border-collapse: collapse; }
        .info-table td { padding: 8px; border: 1px solid #e5e5e5; }
        .info-table .bg { background-color: #f8f8f8; font-weight: bold; width: 120px; text-align: center; }
        .item-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
        .item-table th, .item-table td { border: 1px solid #111; padding: 12px 8px; text-align: center; }
        .item-table th { background-color: #f1f5f9; font-weight: bold; font-size: 14px; }
        .total-row td { font-weight: bold; font-size: 15px; background-color: #f8fafc; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
        .stamp { position: absolute; right: 20px; top: 10px; width: 60px; height: 60px; border: 2px solid #ef4444; border-radius: 50%; color: #ef4444; font-weight: bold; display: flex; align-items: center; justify-content: center; font-size: 14px; transform: rotate(-10deg); opacity: 0.8; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${documentType}</div>
        <div class="subtitle">Premium Fabric Sourcing - object.erp</div>
        <div class="stamp">직인생략</div>
      </div>
      <table class="info-table">
        <tr>
          <td class="bg">공급받는 자</td><td><strong>${order.profiles?.company || '-'}</strong> 귀하</td>
          <td class="bg">발급일자</td><td>${new Date().toLocaleDateString('ko-KR')}</td>
        </tr>
        <tr>
          <td class="bg">담당자 / 연락처</td><td>${order.profiles?.name || '-'} / ${order.profiles?.phone || '-'}</td>
          <td class="bg">문서번호</td><td>${order.id.toString().padStart(8, '0')}</td>
        </tr>
      </table>
      <table class="item-table">
        <thead><tr><th>No</th><th>구분</th><th>품번 (Article)</th><th>혼용률 (Comp)</th><th>수량</th><th>단가</th><th>공급가액</th></tr></thead>
        <tbody>
          ${items.map((item: any, i: number) => `
            <tr>
              <td>${i + 1}</td><td>${item.orderType || '스와치'}</td><td><strong>${item.article}</strong></td>
              <td style="font-size: 11px; color:#555;">${item.comp || '-'}</td><td>${item.estYards || item.yardage || 0} ${item.unit || 'Yds'}</td>
              <td>₩${(item.priceNum || item.basePrice || 0).toLocaleString()}</td>
              <td>₩${((item.estYards || item.yardage || 0) * (item.priceNum || item.basePrice || 0)).toLocaleString()}</td>
            </tr>`).join('')}
          <tr class="total-row"><td colspan="6" style="text-align: right; padding-right: 20px;">총 청구 금액 (VAT 별도)</td><td style="color: #4f46e5;">₩${total.toLocaleString()}</td></tr>
        </tbody>
      </table>
      <div class="footer">본 ${documentType}는 object.erp 시스템을 통해 전자적으로 발급되었으며, 법적 효력을 갖습니다.<br/><strong>오브젝트컴퍼니 (Object Company)</strong></div>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { 
    printWindow.print(); 
    printWindow.close(); 
  }, 300);
};