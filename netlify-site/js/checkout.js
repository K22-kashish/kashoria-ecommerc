/* KASHORIA CHECKOUT - cart, discount, gift wrap and delivery totals */
(function(){
  'use strict';

  const cfg = window.KASHORIA_CONFIG || { freeShippingAt: 1299, shippingFee: 80 };
  const money = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function readCart(){
    try {
      const raw = JSON.parse(localStorage.getItem('cart') || '[]');
      return Array.isArray(raw) ? raw.filter(x => x && Number(x.price) > 0 && Number(x.quantity) > 0) : [];
    } catch (_) { return []; }
  }

  function getDiscount(){
    return Math.max(0, Number(sessionStorage.getItem('kashoria_discount') || 0));
  }

  function getCoupon(){
    return String(sessionStorage.getItem('kashoria_coupon') || '').trim().toUpperCase();
  }

  function totals(cart){
    if (typeof window.kashoriaCartTotals === 'function') {
      return window.kashoriaCartTotals(cart, getDiscount());
    }
    const subtotal = cart.reduce((s,x)=>s + Number(x.price || 0) * (Number(x.quantity) || 1), 0);
    const giftWrap = cart.reduce((s,x)=>s + (x.giftWrap ? 40 * (Number(x.quantity)||1) : 0), 0);
    const shipping = subtotal ? (subtotal >= Number(cfg.freeShippingAt) ? 0 : Number(cfg.shippingFee)) : 0;
    const discount = Math.min(subtotal, getDiscount());
    return { subtotal, giftWrap, shipping, discount, total: Math.max(0, subtotal - discount) + giftWrap + shipping };
  }

  function set(id, value){
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function render(){
    const cart = readCart();
    const box = document.getElementById('co-items');
    const t = totals(cart);

    if (box) {
      if (!cart.length) {
        box.innerHTML = '<div class="k-empty" style="padding:25px 5px;text-align:center"><div class="k-empty-icon">♡</div><p>Your cart is empty.</p><a href="shop.html" class="k-primary-btn">Shop Collection</a></div>';
      } else {
        box.innerHTML = cart.map(item => {
          const qty = Number(item.quantity) || 1;
          const category = String(item.category || 'General').replace(/[-_]/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
          const color = item.color || 'As shown in product image';
          return `
            <div class="k-checkout-item" style="display:flex;gap:12px;padding:12px 0;border-bottom:1px dashed #eadfd9;align-items:flex-start">
              <img src="${esc(item.image || '')}" alt="${esc(item.name)}" style="width:58px;height:58px;object-fit:cover;border-radius:12px">
              <div style="flex:1;min-width:0">
                <strong>${esc(item.name)}</strong>
                <div class="cart-meta">Category: ${esc(category)}</div>
                <div class="cart-meta">Colour: ${esc(color)}</div>
                ${item.note ? `<div class="cart-meta">Note: ${esc(item.note)}</div>` : ''}
                ${item.giftWrap ? '<div class="cart-meta">Gift wrapping: +₹40</div>' : ''}
                ${item.giftMessage ? `<div class="cart-meta">Gift message: ${esc(item.giftMessage)}</div>` : ''}
                <div class="cart-meta">Quantity: ${qty}</div>
              </div>
              <strong>${money(Number(item.price) * qty)}</strong>
            </div>`;
        }).join('');
      }
    }

    set('co-sub', money(t.subtotal));
    set('co-discount', t.discount ? '-' + money(t.discount) : money(0));
    set('co-giftwrap', t.giftWrap ? money(t.giftWrap) : money(0));
    set('co-ship', t.shipping ? money(t.shipping) : 'FREE');
    set('co-total', money(t.total));

    const coupon = getCoupon();
    const couponEl = document.getElementById('co-coupon');
    if (couponEl) {
      couponEl.textContent = coupon ? `Coupon ${coupon} applied ♡` : '';
    }

    const button = document.querySelector('#checkout-form button[type="submit"]');
    if (button) button.disabled = !cart.length;
  }

  async function uploadReferences(items){
    if (!window.KASHORIA_API_CLIENT) return items;
    for (const item of items) {
      if (String(item.referenceImage || '').startsWith('data:image/')) {
        const response = await window.KASHORIA_API_CLIENT.request('/api/features/upload-reference', {
          method: 'POST',
          body: JSON.stringify({ dataUrl: item.referenceImage })
        });
        item.referenceImage = response.url;
      }
    }
    return items;
  }

  async function submitOrder(event){
    event.preventDefault();

    const cart = readCart();
    if (!cart.length) {
      window.kashoriaToast?.('Your cart is empty');
      render();
      return;
    }

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Placing order…';

    try {
      const t = totals(cart);
      const couponCode = getCoupon();
      const items = await uploadReferences(cart.map(x => ({...x})));

      let applied = { code: couponCode, discount: getDiscount() };
      if (couponCode && window.KASHORIA_API_CLIENT) {
        try {
          applied = await window.KASHORIA_API_CLIENT.request('/api/features/coupons/validate', {
            method: 'POST',
            body: JSON.stringify({ code: couponCode, subtotal: t.subtotal })
          });
        } catch (_) {
          applied = { code: couponCode, discount: getDiscount() };
        }
      }

      const payload = {
        customer: {
          name: document.getElementById('co-name').value.trim(),
          phone: document.getElementById('co-phone').value.trim(),
          email: document.getElementById('co-email').value.trim(),
          address: document.getElementById('co-address').value.trim(),
          city: document.getElementById('co-city').value.trim(),
          pincode: document.getElementById('co-pincode').value.trim()
        },
        paymentMethod: document.querySelector('input[name="payment"]:checked')?.value === 'UPI' ? 'UPI' : 'COD',
        couponCode: applied.code || couponCode || '',
        giftMessage: items.map(x => x.giftMessage || '').filter(Boolean).join(' | '),
        orderNote: document.getElementById('co-order-note')?.value.trim() || '',
        items
      };

      if (!window.KASHORIA_API_CLIENT) throw new Error('Checkout API is not available');

      const data = await window.KASHORIA_API_CLIENT.request('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!data?.order?.orderNumber) throw new Error('Order was not created correctly');

      localStorage.setItem('kashoria_last_order', JSON.stringify(data.order));
      localStorage.removeItem('cart');
      sessionStorage.removeItem('kashoria_coupon');
      sessionStorage.removeItem('kashoria_discount');

      location.href = 'order-confirmation.html?order=' + encodeURIComponent(data.order.orderNumber);
    } catch (error) {
      console.error('KASHORIA CHECKOUT ERROR:', error);
      window.kashoriaToast?.(error.message || 'Could not place order');
      button.disabled = false;
      button.textContent = 'Place Order ♡';
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    render();
    const form = document.getElementById('checkout-form');
    if (form && !form.dataset.checkoutBound) {
      form.dataset.checkoutBound = '1';
      form.addEventListener('submit', submitOrder);
    }
  });

  window.renderKashoriaCheckout = render;
})();
