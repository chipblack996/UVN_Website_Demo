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

  const backTop = document.querySelector('.back-top');
  const updateBackTop = () => backTop?.classList.toggle('is-visible', window.scrollY > 640);
  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', updateBackTop, { passive: true });
  updateBackTop();
  document.querySelectorAll('input[name="landing_page"]').forEach((input) => { input.value = location.href; });

  document.addEventListener('click', (event) => {
    const actionLink = event.target.closest?.('[data-local-action]');
    if (!actionLink) return;
    const action = actionLink.dataset.localAction || 'unknown';
    if (typeof window.gtag === 'function') window.gtag('event', 'local_action', { action_name: action, link_url: actionLink.href });
    if (typeof window.fbq === 'function') window.fbq('trackCustom', 'LocalAction', { action_name: action });
  });

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
          const interest = form.querySelector('[name="product_interest"]')?.value || 'general';
          const source = form.querySelector('[name="source"]')?.value || 'website';
          if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { lead_source: source, product_interest: interest });
          if (typeof window.fbq === 'function') window.fbq('track', 'Lead', { content_name: interest, content_category: source });
          if (form.matches('[data-cart-lead-form]')) {
            localStorage.removeItem('uvn-request-cart-v1');
            document.dispatchEvent(new CustomEvent('request-cart-updated'));
          }
          if (form.matches('[data-mobile-lead-form]')) {
            try { localStorage.setItem('uvn-lead-prompt-state', JSON.stringify({ submitted: true })); } catch {}
            setTimeout(() => { const promptEl = form.closest('.mobile-lead-prompt'); if (promptEl) promptEl.hidden = true; }, 1400);
          }
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

  (() => {
    const prompt = document.querySelector('#mobile-lead-prompt');
    if (!prompt) return;
    const STORAGE_KEY = 'uvn-lead-prompt-state';
    const DISMISS_DAYS = 7;
    const isMobile = () => window.matchMedia('(max-width: 640px)').matches;
    let state = null;
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { state = null; }
    if (state?.submitted) return;
    if (state?.dismissedAt && Date.now() - state.dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    if (!isMobile()) return;

    setTimeout(() => {
      if (!isMobile()) return;
      prompt.hidden = false;
    }, 20000);

    prompt.querySelector('[data-mobile-lead-close]')?.addEventListener('click', () => {
      prompt.hidden = true;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now() })); } catch {}
    });
  })();

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

  const cartStorageKey = 'uvn-request-cart-v1';
  const htmlEscape = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
  const readCart = () => {
    try {
      const value = JSON.parse(localStorage.getItem(cartStorageKey) || '[]');
      return Array.isArray(value) ? value.slice(0, 30) : [];
    } catch { return []; }
  };
  const writeCart = (items) => {
    try { localStorage.setItem(cartStorageKey, JSON.stringify(items.slice(0, 30))); } catch { /* Storage can be unavailable in private mode. */ }
    document.dispatchEvent(new CustomEvent('request-cart-updated'));
  };

  const cartDrawer = document.querySelector('[data-request-cart]');
  const cartBackdrop = document.querySelector('[data-request-cart-backdrop]');
  const cartItems = document.querySelector('[data-request-cart-items]');
  const cartEmpty = document.querySelector('[data-request-cart-empty]');
  const cartForm = document.querySelector('[data-cart-lead-form]');
  const setCartOpen = (open) => {
    if (!cartDrawer || !cartBackdrop) return;
    cartDrawer.hidden = !open;
    cartBackdrop.hidden = !open;
    document.body.classList.toggle('request-cart-open', open);
    if (open) document.querySelector('[data-request-cart-close]')?.focus();
  };
  const renderCart = () => {
    const items = readCart();
    const total = items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
    document.querySelectorAll('[data-request-cart-count]').forEach((badge) => {
      badge.textContent = String(items.length);
      badge.hidden = items.length === 0;
    });
    if (cartEmpty) cartEmpty.hidden = items.length > 0;
    if (cartForm) cartForm.hidden = items.length === 0;
    if (!cartItems) return;
    cartItems.innerHTML = items.map((item, index) => `<article class="request-cart-item">
      <img src="${htmlEscape(item.image)}" alt="" width="82" height="82">
      <div><div class="request-cart-item-head"><strong>${htmlEscape(item.productName)}</strong><button type="button" data-cart-remove="${index}" aria-label="Xóa ${htmlEscape(item.variantCode)}">×</button></div><span class="request-cart-code">Mã mẫu: ${htmlEscape(item.variantCode)}</span><dl>${Object.entries(item.selections || {}).map(([label, value]) => `<div><dt>${htmlEscape(label)}</dt><dd>${htmlEscape(value)}</dd></div>`).join('')}</dl><label class="request-cart-quantity">Số lượng dự kiến <input type="number" min="1" max="1000000" value="${Math.max(1, Number(item.quantity) || 1)}" data-cart-quantity="${index}"></label></div>
    </article>`).join('');
    cartItems.querySelectorAll('[data-cart-remove]').forEach((button) => button.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(button.dataset.cartRemove), 1);
      writeCart(next);
    }));
    cartItems.querySelectorAll('[data-cart-quantity]').forEach((input) => input.addEventListener('change', () => {
      const next = readCart();
      const index = Number(input.dataset.cartQuantity);
      if (next[index]) next[index].quantity = Math.min(1_000_000, Math.max(1, Number(input.value) || 1));
      writeCart(next);
    }));
    if (cartForm) {
      const quantity = cartForm.querySelector('[name="estimated_quantity"]');
      if (quantity) quantity.value = String(Math.min(1_000_000, total));
    }
  };

  document.querySelectorAll('[data-request-cart-open]').forEach((button) => button.addEventListener('click', () => { renderCart(); setCartOpen(true); }));
  document.querySelector('[data-request-cart-close]')?.addEventListener('click', () => setCartOpen(false));
  cartBackdrop?.addEventListener('click', () => setCartOpen(false));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && cartDrawer && !cartDrawer.hidden) setCartOpen(false); });
  document.addEventListener('request-cart-updated', renderCart);
  renderCart();

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-cart-lead-form]')) return;
    const items = readCart();
    const interest = items.map((item) => item.variantCode).join(', ').slice(0, 200);
    const lines = items.map((item, index) => {
      const options = Object.entries(item.selections || {}).map(([label, value]) => `${label}: ${value}`).join('; ');
      return `${index + 1}. ${item.productName} — ${item.variantCode} — ${options} — SL: ${item.quantity}`;
    });
    const note = form.querySelector('[name="cart_note"]')?.value.trim();
    const productInterest = form.querySelector('[name="product_interest"]');
    const message = form.querySelector('[name="message"]');
    if (productInterest) productInterest.value = interest;
    if (message) message.value = [`GIỎ YÊU CẦU (${items.length} mẫu)`, ...lines, note ? `Ghi chú: ${note}` : ''].filter(Boolean).join('\n').slice(0, 2000);
  }, true);

  const mainGallery = document.querySelector('[data-gallery-main]');
  const configurator = document.querySelector('[data-variant-configurator]');
  const selectionPanel = configurator?.querySelector('[data-variant-selection]');
  const helper = configurator?.querySelector('[data-variant-helper]');
  const optionGroups = configurator?.querySelector('[data-variant-option-groups]');
  const variantCode = configurator?.querySelector('[data-variant-code]');
  const addToCart = configurator?.querySelector('[data-add-request-cart]');
  const variantStatus = configurator?.querySelector('[data-variant-status]');
  const resetVariant = configurator?.querySelector('[data-variant-reset]');
  let selectedVariant = null;
  let selectedOptions = {};

  const updateAddButton = () => {
    if (!addToCart || !selectedVariant) return;
    addToCart.disabled = selectedVariant.optionGroups.some((group) => !selectedOptions[group.name]);
  };
  const showVariant = (button) => {
    const code = button.dataset.variantCode || '';
    let groups = [];
    try { groups = JSON.parse(button.dataset.optionGroups || '[]'); } catch { groups = []; }
    if (!code || !Array.isArray(groups) || !groups.length) {
      selectedVariant = null;
      selectedOptions = {};
      if (selectionPanel) selectionPanel.hidden = true;
      if (helper) helper.hidden = false;
      if (resetVariant) resetVariant.hidden = true;
      return;
    }
    selectedVariant = { code, image: button.dataset.src, optionGroups: groups };
    selectedOptions = {};
    groups.forEach((group) => { if (group.values?.length === 1) selectedOptions[group.name] = group.values[0]; });
    if (variantCode) variantCode.textContent = code;
    if (helper) helper.hidden = true;
    if (selectionPanel) selectionPanel.hidden = false;
    if (resetVariant) resetVariant.hidden = false;
    if (variantStatus) variantStatus.textContent = '';
    if (optionGroups) {
      optionGroups.innerHTML = groups.map((group, groupIndex) => `<fieldset class="variant-option-group"><legend>${htmlEscape(group.name)}</legend><div>${group.values.map((value, valueIndex) => {
        const selected = group.values.length === 1 && valueIndex === 0;
        return `<button type="button" data-option-group="${htmlEscape(group.name)}" data-option-value="${htmlEscape(value)}" aria-pressed="${selected}">${htmlEscape(value)}</button>`;
      }).join('')}</div></fieldset>`).join('');
      optionGroups.querySelectorAll('[data-option-group]').forEach((option) => option.addEventListener('click', () => {
        const name = option.dataset.optionGroup;
        option.closest('.variant-option-group')?.querySelectorAll('button').forEach((peer) => peer.setAttribute('aria-pressed', String(peer === option)));
        selectedOptions[name] = option.dataset.optionValue;
        updateAddButton();
      }));
    }
    updateAddButton();
  };

  document.querySelectorAll('[data-gallery-thumb]').forEach((button) => button.addEventListener('click', () => {
    if (mainGallery) {
      mainGallery.src = button.dataset.src;
      mainGallery.alt = button.dataset.alt || '';
    }
    document.querySelectorAll('[data-gallery-thumb]').forEach((thumb) => {
      const active = thumb === button;
      thumb.classList.toggle('active', active);
      thumb.setAttribute('aria-pressed', String(active));
    });
    showVariant(button);
  }));
  resetVariant?.addEventListener('click', () => document.querySelector('[data-gallery-thumb]')?.click());
  addToCart?.addEventListener('click', () => {
    if (!selectedVariant || !configurator || addToCart.disabled) return;
    const quantity = Math.min(1_000_000, Math.max(1, Number(configurator.querySelector('[data-variant-quantity]')?.value) || 1));
    const item = {
      productId: Number(configurator.dataset.productId),
      productName: configurator.dataset.productName,
      productSlug: configurator.dataset.productSlug,
      variantCode: selectedVariant.code,
      image: selectedVariant.image,
      selections: selectedOptions,
      quantity,
    };
    const key = `${item.productSlug}:${item.variantCode}:${JSON.stringify(item.selections)}`;
    const items = readCart();
    const existing = items.find((entry) => entry.key === key);
    if (existing) existing.quantity = Math.min(1_000_000, Number(existing.quantity || 0) + quantity);
    else items.push({ ...item, key });
    writeCart(items);
    if (variantStatus) variantStatus.textContent = `Đã thêm mẫu ${item.variantCode} vào giỏ hàng.`;
    setCartOpen(true);
  });
})();
