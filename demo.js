(() => {
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-async-form]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const status = form.querySelector('.form-status');
    if (form.matches('[data-cart-lead-form]')) {
      const data = new FormData(form);
      const customer = [
        'Họ tên: ' + (data.get('full_name') || ''),
        'Điện thoại: ' + (data.get('phone') || ''),
        'Công ty: ' + (data.get('company') || ''),
        'Email: ' + (data.get('email') || ''),
        'Ngày cần hàng: ' + (data.get('needed_date') || ''),
        '',
        String(data.get('message') || ''),
      ].join('\n');
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(customer).catch(() => {});
      location.href = 'mailto:info@uniformvietnam.vn?subject=' + encodeURIComponent('Yêu cầu báo giá đồng phục') + '&body=' + encodeURIComponent(customer);
      if (status) {
        status.className = 'form-status success';
        status.textContent = 'Đã chuẩn bị nội dung và mở ứng dụng email. Vui lòng kiểm tra rồi bấm Gửi.';
      }
      return;
    }
    if (status) {
      status.className = 'form-status success';
      status.textContent = 'Đây là bản xem trước giao diện. Biểu mẫu chưa gửi dữ liệu.';
    }
  }, true);
})();
