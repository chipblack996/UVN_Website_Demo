(() => {
  if (window.matchMedia('(max-width: 900px)').matches) {
    const header = document.querySelector('.site-header');
    if (header) header.style.backdropFilter = 'none';
  }
  const toggle = document.querySelector('.menu-toggle');
  const panel = document.querySelector('#mobile-panel');
  const close = document.querySelector('.menu-close');
  const setMenu = (open) => {
    if (!panel || !toggle) return;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('locked', open);
    if (open) close?.focus(); else toggle.focus();
  };
  toggle?.addEventListener('click', () => setMenu(true));
  close?.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && panel && !panel.hidden) setMenu(false); });
  panel?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

  document.querySelector('.back-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.querySelectorAll('input[name="landing_page"]').forEach((input) => { input.value = location.href; });

  document.querySelectorAll('[data-async-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const status = form.querySelector('.form-status');
      if (!button || !status) return;
      button.disabled = true;
      status.className = 'form-status';
      status.textContent = 'Đang gửi…';
      try {
        const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        const data = await response.json();
        status.textContent = data.message || (response.ok ? 'Đã gửi thành công.' : 'Không thể gửi yêu cầu.');
        status.classList.add(response.ok ? 'success' : 'error');
        if (response.ok) {
          const keep = [...form.querySelectorAll('input[type="hidden"]')].map((input) => [input.name, input.value]);
          form.reset();
          keep.forEach(([name, value]) => { const input = form.querySelector(`input[name="${name}"]`); if (input) input.value = value; });
        }
      } catch {
        status.textContent = 'Kết nối bị gián đoạn. Vui lòng thử lại hoặc gọi hotline.';
        status.classList.add('error');
      } finally { button.disabled = false; }
    });
  });

  const search = document.querySelector('#header-search');
  const suggestions = document.querySelector('#search-suggestions');
  let timer;
  search?.addEventListener('input', () => {
    clearTimeout(timer);
    const q = search.value.trim();
    if (q.length < 2) { if (suggestions) suggestions.hidden = true; return; }
    timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(q)}`);
        const data = await response.json();
        if (!suggestions) return;
        suggestions.innerHTML = data.items.map((item) => `<a href="${item.url}"><span>${item.title}</span><small>${item.type_label}</small></a>`).join('');
        suggestions.hidden = !data.items.length;
      } catch { if (suggestions) suggestions.hidden = true; }
    }, 180);
  });
  document.addEventListener('click', (event) => { if (suggestions && !event.target.closest('.search-box')) suggestions.hidden = true; });

  document.querySelectorAll('.category-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && location.pathname.startsWith(href)) link.setAttribute('aria-current', 'page');
  });

  const mainGallery = document.querySelector('[data-gallery-main]');
  document.querySelectorAll('[data-gallery-thumb]').forEach((button) => button.addEventListener('click', () => {
    if (!mainGallery) return;
    mainGallery.src = button.dataset.src;
    mainGallery.alt = button.dataset.alt || '';
  }));
})();
