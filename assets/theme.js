/* ============================================================
   PHONESTAND PRO — THEME JAVASCRIPT
   ============================================================ */

// Cart API
const Cart = {
  async add(variantId, quantity = 1) {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.description || 'Error al añadir al carrito');
    }
    return res.json();
  },

  async get() {
    const res = await fetch('/cart.js');
    return res.json();
  }
};

// Cart notification
function showCartNotification() {
  const el = document.getElementById('cart-notification');
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

// Update cart count badge
async function updateCartCount() {
  try {
    const cart = await Cart.get();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = cart.item_count;
      el.dataset.count = cart.item_count;
    });
  } catch (e) {
    // silent fail
  }
}

// Product form — add to cart
function initProductForm() {
  const form = document.getElementById('product-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[data-submit-btn]');
    const variantId = form.querySelector('[name="id"]').value;
    const quantity = parseInt(form.querySelector('[name="quantity"]').value, 10) || 1;

    btn.classList.add('btn--loading');
    btn.disabled = true;

    try {
      await Cart.add(variantId, quantity);
      await updateCartCount();
      showCartNotification();
    } catch (err) {
      alert(err.message || 'Error al añadir al carrito. Inténtalo de nuevo.');
    } finally {
      btn.classList.remove('btn--loading');
      btn.disabled = false;
    }
  });
}

// Buy now
window.buyNow = async function(e, variantId) {
  e.preventDefault();
  const btn = e.currentTarget;
  btn.classList.add('btn--loading');
  btn.disabled = true;
  try {
    await Cart.add(variantId, 1);
    window.location.href = '/checkout';
  } catch (err) {
    alert(err.message || 'Error. Inténtalo de nuevo.');
    btn.classList.remove('btn--loading');
    btn.disabled = false;
  }
};

// Quantity selector
function initQuantitySelectors() {
  document.querySelectorAll('.quantity-selector').forEach(selector => {
    const input = selector.querySelector('.quantity-selector__input');
    const minus = selector.querySelector('[data-minus]');
    const plus = selector.querySelector('[data-plus]');

    minus?.addEventListener('click', () => {
      const v = parseInt(input.value, 10) || 1;
      if (v > 1) input.value = v - 1;
    });
    plus?.addEventListener('click', () => {
      const v = parseInt(input.value, 10) || 1;
      input.value = v + 1;
    });
  });
}

// Image gallery
function initGallery() {
  document.querySelectorAll('.product-gallery').forEach(gallery => {
    const mainImg = gallery.querySelector('.product-gallery__main img');
    const thumbs = gallery.querySelectorAll('.product-gallery__thumb');

    thumbs.forEach((thumb, i) => {
      if (i === 0) thumb.classList.add('active');
      thumb.addEventListener('click', () => {
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');

        if (mainImg) {
          const thumbImg = thumb.querySelector('img');
          const bigSrc = thumbImg.src.replace(/_(100x100|200x200|small|compact|medium)/, '_800x800');
          mainImg.style.opacity = '0';
          setTimeout(() => {
            mainImg.src = bigSrc;
            mainImg.style.opacity = '1';
          }, 150);
        }
      });
    });
  });
}

// Sticky ATC (mobile)
function initStickyATC() {
  const formActions = document.querySelector('.product-form__actions');
  const sticky = document.querySelector('.sticky-atc');
  if (!formActions || !sticky) return;

  const observer = new IntersectionObserver(([entry]) => {
    sticky.classList.toggle('show', !entry.isIntersecting);
  }, { rootMargin: '0px 0px -50px 0px' });

  observer.observe(formActions);

  sticky.querySelector('[data-sticky-atc-btn]')?.addEventListener('click', () => {
    const productForm = document.getElementById('product-form');
    productForm?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

// Sticky header shadow
function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Color swatch selector
function initColorSwatches() {
  const swatches = document.querySelectorAll('.color-swatch');
  if (!swatches.length) return;
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const variantId = swatch.dataset.variantId;
      const colorName = swatch.dataset.colorName;
      const available = swatch.dataset.available === 'true';
      const idInput = document.querySelector('[name="id"]');
      if (idInput) idInput.value = variantId;
      const nameEl = document.getElementById('selected-color-name');
      if (nameEl) nameEl.textContent = colorName;
      document.querySelectorAll('[onclick*="buyNow"]').forEach(btn => {
        btn.setAttribute('onclick', `buyNow(event, '${variantId}')`);
      });
      const submitBtn = document.querySelector('[data-submit-btn]');
      if (submitBtn) {
        submitBtn.disabled = !available;
        submitBtn.innerHTML = available ? '🛒 Añadir al carrito' : 'Agotado';
      }
      const hotBadge = document.getElementById('badge-hot');
      if (hotBadge) {
        const cn = colorName.toLowerCase();
        hotBadge.style.display = (cn.includes('negro') || cn.includes('black')) ? '' : 'none';
      }
      const imageSrc = swatch.dataset.imageSrc;
      if (imageSrc) {
        const mainImg = document.getElementById('main-img');
        if (mainImg) {
          mainImg.style.opacity = '0';
          setTimeout(() => {
            mainImg.src = imageSrc;
            mainImg.style.opacity = '1';
          }, 150);
        }
        document.querySelectorAll('.product-gallery__thumb').forEach(t => t.classList.remove('active'));
      }
    });
  });
}

// Urgency counters
function initUrgency() {
  const stockEl = document.getElementById('stock-count');
  const viewerEl = document.getElementById('viewer-count');
  if (!stockEl && !viewerEl) return;

  // Stock: fixed per session so it looks consistent (5–11)
  const sessionStock = sessionStorage.getItem('urg_stock')
    || String(Math.floor(Math.random() * 7) + 5);
  sessionStorage.setItem('urg_stock', sessionStock);
  if (stockEl) stockEl.textContent = sessionStock;

  // Viewers: starts random (18–34), fluctuates every ~20s
  if (viewerEl) {
    let viewers = Math.floor(Math.random() * 17) + 18;
    viewerEl.textContent = viewers;
    setInterval(() => {
      const delta = Math.random() < 0.5 ? 1 : -1;
      viewers = Math.min(38, Math.max(12, viewers + delta));
      viewerEl.textContent = viewers;
    }, 18000 + Math.random() * 8000);
  }
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initProductForm();
  initQuantitySelectors();
  initGallery();
  initStickyATC();
  initHeaderScroll();
  initColorSwatches();
  initUrgency();
  updateCartCount();
});
