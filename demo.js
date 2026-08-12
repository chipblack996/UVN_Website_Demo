(() => {
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-async-form]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const status = form.querySelector('.form-status');
    if (status) {
      status.className = 'form-status success';
      status.textContent = 'Đây là bản xem trước giao diện. Biểu mẫu chưa gửi dữ liệu.';
    }
  }, true);
})();
