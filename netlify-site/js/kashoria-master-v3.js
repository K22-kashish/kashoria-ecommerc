/* KASHORIA MASTER FRONTEND v3
   Single source of truth for catalog, product options, cart, wishlist and checkout.
*/
(() => {
  'use strict';

  const API_BASE = String(window.KASHORIA_API || '').replace(/\/+$/, '');

  const CFG = Object.assign({
    freeShippingAt: 1299,
    shippingFee: 80,
    giftWrapFee: 40,
    whatsapp: '917778975203',
    instagram: 'https://www.instagram.com/kashoria_/'
  }, window.KASHORIA_CONFIG || {});

  const $ = (id) => document.getElementById(id);
  const money = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const read = (key, fallback=[]) => { try { const v=JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const clean = (v) => String(v ?? '').trim().toLowerCase().replace(/^\.\//,'');
  const categoryName = (v) => String(v || 'General').replace(/[-_]/g,' ').replace(/\b\w/g,m=>m.toUpperCase());

  let catalog = Array.isArray(window.KASHORIA_PRODUCTS) ? window.KASHORIA_PRODUCTS : [];
  let catalogPromise = null;

  function normalizeProduct(p) {
    return {
      ...p,
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
      category: String(p.category ?? ''),
      image: String(p.image ?? 'images/placeholder.jpg.png'),
      price: Number(p.price) || 0,
      stock: Number(p.stock ?? 100),
      description: p.description || ''
    };
  }

  async function loadCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch(API_BASE + '/api/products?limit=500', {headers:{Accept:'application/json'}})
      .then(r => { if(!r.ok) throw new Error('Product API '+r.status); return r.json(); })
      .then(d => {
        if (Array.isArray(d?.products) && d.products.length) catalog = d.products.map(normalizeProduct);
        else if (Array.isArray(catalog)) catalog = catalog.map(normalizeProduct);
        return catalog;
      })
      .catch(() => Array.isArray(catalog) ? catalog.map(normalizeProduct) : []);
    return catalogPromise;
  }

  function findProduct(value, image='') {
    const v=clean(value), im=clean(image);
    return catalog.find(p => im && clean(p.image) === im)
      || catalog.find(p => clean(p.id) === v)
      || catalog.find(p => clean(p.name) === v)
      || null;
  }

  const palette = {
    phonecharms:['As shown in product image','Lavender','Dusty Pink','Sky Blue','Sage Green','Cream'],
    keychains:['As shown in product image','Blush Pink','Lavender','Baby Blue','Butter Yellow','Sage Green'],
    bagcharms:['As shown in product image','Dusty Pink','Lavender','Sage Green','Sky Blue','Cream'],
    hairaccessories:['As shown in product image','Dusty Pink','Lavender','Butter Yellow','Sage Green','Baby Blue'],
    bouquets:['As shown in product image','Pink & Cream','Lavender & White','Peach & Cream','Blue & White','Pastel Mix'],
    phonecases:['As shown in product image','Blush Pink','Lavender','Sage Green','Sky Blue','Cream'],
    flowers:['As shown in product image','Red','Pink','Yellow','Lavender','White'],
    rakhis:['As shown in product image','Red & Cream','Pink & White','Lavender & White','Blue & White','Pastel Mix'],
    gifts:['As shown in product image','Blush Pink','Lavender','Sky Blue','Sage Green','Cream']
  };

  const special = {
    'evil-eye-phone-charm':['As shown in product image','Royal Blue','Navy Blue','Sky Blue','Black & White'],
    'evil-eye-keychain':['As shown in product image','Royal Blue','Navy Blue','Sky Blue','Black & White'],
    'pink-heart-phone-charm':['As shown in product image','Dusty Pink','Baby Pink','Rose Pink','Lavender Pink'],
    '5-heart-purple-phone-charm':['As shown in product image','Deep Purple','Lavender','Lilac','Purple & Cream']
  };

  function fallbackColors(p) {
    return [...(special[p.id] || palette[p.category] || palette.gifts), 'Custom colour']
      .filter((v,i,a)=>a.indexOf(v)===i);
  }

  async function getColors(p) {
    try {
      const r=await fetch(API_BASE + '/api/features/products/'+encodeURIComponent(p.id)+'/options',{headers:{Accept:'application/json'}});
      if(r.ok){
        const d=await r.json();
        if(Array.isArray(d.colors) && d.colors.length) return d.colors.map(x=>String(x));
      }
    } catch {}
    return fallbackColors(p);
  }

  function swatchColor(name) {
    const n=String(name||'').toLowerCase();
    if(n.includes('custom')) return 'linear-gradient(135deg,#e7b6c7,#c6b3df,#b7d8cb)';
    if(n.includes('purple')||n.includes('lavender')||n.includes('lilac')) return '#b69ad8';
    if(n.includes('dusty pink')) return '#d99aaa';
    if(n.includes('blush')) return '#e9a9b9';
    if(n.includes('baby pink')) return '#f5c3cf';
    if(n.includes('rose pink')) return '#df8097';
    if(n.includes('pink')) return '#ef9db3';
    if(n.includes('red')) return '#d85b68';
    if(n.includes('navy')) return '#243f73';
    if(n.includes('royal blue')) return '#426bb3';
    if(n.includes('sky blue')) return '#8ec9e8';
    if(n.includes('blue')) return '#6592c8';
    if(n.includes('sage')) return '#9db89a';
    if(n.includes('green')) return '#78a56f';
    if(n.includes('cream')) return '#f3e2bb';
    if(n.includes('butter yellow')||n.includes('yellow')) return '#f2d36b';
    if(n.includes('peach')) return '#f2b29d';
    if(n.includes('black')) return '#303030';
    if(n.includes('white')) return '#ffffff';
    return '#ded4cf';
  }

  function normalizeCartItems(raw){
    return (Array.isArray(raw)?raw:[]).filter(x=>x).map(x=>{
      const p=findProduct(x.productId||x.name,x.image||'');
      return {
        ...x,
        productId:String(x.productId||p?.id||''),
        name:String(x.name||p?.name||''),
        category:String(x.category||p?.category||''),
        price:Number(x.price)>0?Number(x.price):Number(p?.price)||0,
        image:String(x.image||p?.image||''),
        quantity:Math.max(1,Number(x.quantity)||1),
        color:String(x.color||'As shown in product image')
      };
    }).filter(x=>x.name&&x.price>0);
  }
  function cart() {
    const raw=read('cart',[]), normalized=normalizeCartItems(raw);
    if(JSON.stringify(raw)!==JSON.stringify(normalized)) write('cart',normalized);
    return normalized;
  }
  function wish() { return read('wishlist',[]).filter(x=>x && Number(x.price)>0); }
  function updateCounts() {
    const c=cart(), w=wish();
    const count=c.reduce((s,x)=>s+(Number(x.quantity)||1),0);
    document.querySelectorAll('[data-cart-count],#cart-count,.cart-count').forEach(e=>e.textContent=count);
    document.querySelectorAll('[data-wishlist-count],#wishlist-count,.wishlist-count').forEach(e=>e.textContent=w.length);
  }
  function toast(msg) { if(typeof window.kashoriaToast==='function') window.kashoriaToast(msg); else console.log('[KASHORIA]',msg); }

  function totals(items=cart()) {
    const subtotal=items.reduce((s,x)=>s+(Number(x.price)||0)*(Number(x.quantity)||1),0);
    const giftWrap=items.reduce((s,x)=>s+(x.giftWrap ? CFG.giftWrapFee*(Number(x.quantity)||1) : 0),0);
    const discount=Math.min(subtotal,Math.max(0,Number(sessionStorage.getItem('kashoria_discount')||0)));
    const shipping=subtotal===0 ? 0 : (subtotal>=CFG.freeShippingAt ? 0 : CFG.shippingFee);
    return {subtotal,giftWrap,discount,shipping,total:Math.max(0,subtotal-discount)+giftWrap+shipping};
  }

  window.KASHORIA_FEATURES=Object.assign(window.KASHORIA_FEATURES||{}, {money,esc,read,write});
  window.kashoriaCartTotals=totals;
  window.updateKashoriaCounts=updateCounts;
  window.updateCartCount=updateCounts;
  window.updateWishlistCount=updateCounts;

  window.openProduct = function(value, price, image) {
    const p=findProduct(value,image);
    const id=p?.id || value;
    if(id) location.href='product.html?product='+encodeURIComponent(id);
  };

  window.addToCart = function(name, price, image, quantity=1, options={}) {
    const p=findProduct(options.productId || name,image);
    const item={
      productId:String(options.productId || p?.id || ''),
      name:String(p?.name || name || ''),
      category:String(options.category || p?.category || ''),
      price:Number(p?.price ?? price) || 0,
      image:String(p?.image || image || ''),
      quantity:Math.max(1,Number(quantity)||1),
      color:String(options.color || 'As shown in product image'),
      note:String(options.note || ''),
      giftWrap:!!options.giftWrap,
      giftMessage:String(options.giftMessage || ''),
      referenceImage:String(options.referenceImage || '')
    };
    if(!item.name || item.price<=0){toast('Product is unavailable.');return false;}
    const c=cart();
    const same=x=>String(x.productId)===item.productId && x.color===item.color && x.note===item.note && !!x.giftWrap===item.giftWrap && x.giftMessage===item.giftMessage && x.referenceImage===item.referenceImage;
    const old=c.find(same);
    if(old) old.quantity += item.quantity; else c.push(item);
    write('cart',c); updateCounts();
    if(typeof window.renderKashoriaDrawer==='function') window.renderKashoriaDrawer();
    toast(item.name+' added to cart ♡');
    return true;
  };

  window.changeQuantity=function(i,delta){const c=cart();if(!c[i])return;c[i].quantity=Math.max(0,(Number(c[i].quantity)||1)+Number(delta));if(!c[i].quantity)c.splice(i,1);write('cart',c);updateCounts();renderCartPage();window.renderKashoriaDrawer?.();};
  window.increaseQuantity=i=>changeQuantity(i,1);
  window.decreaseQuantity=i=>changeQuantity(i,-1);
  window.removeFromCart=function(i){const c=cart();c.splice(i,1);write('cart',c);updateCounts();renderCartPage();window.renderKashoriaDrawer?.();};
  window.removeItem=window.removeFromCart;

  window.toggleWishlist=function(name,price,image,button){
    const p=findProduct(name,image), id=String(p?.id||''); const w=wish();
    const i=w.findIndex(x=>String(x.productId)===id || clean(x.image)===clean(image));
    if(i>=0){w.splice(i,1);if(button)button.textContent='♡ Wishlist';toast('Removed from wishlist');}
    else {w.push({productId:id,name:p?.name||name,category:p?.category||'',price:Number(p?.price??price)||0,image:p?.image||image});if(button)button.textContent='♥ Added';toast('Saved to wishlist ♡');}
    write('wishlist',w);updateCounts();renderWishlistPage();return true;
  };
  window.removeFromWishlist=function(i){const w=wish();w.splice(i,1);write('wishlist',w);updateCounts();renderWishlistPage();};

  function renderCartPage(){
    const box=$('full-cart');if(!box)return;
    const c=cart(),t=totals(c);
    if(!c.length){box.innerHTML='<div class="k-empty"><div class="k-empty-icon">♡</div><h2>Your cart is empty</h2><p>Add a handmade favourite to get started.</p><a href="shop.html" class="k-primary-btn">Shop Collection</a></div>';}else{
      box.innerHTML=c.map((x,i)=>`<div class="k-cart-row"><img src="${esc(x.image)}" alt="${esc(x.name)}"><div><h3>${esc(x.name)}</h3><strong>${money(x.price)}</strong><div class="cart-meta">Category: ${esc(categoryName(x.category))}</div><div class="cart-meta" style="display:flex;align-items:center;gap:7px"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;border:1px solid #d8cbc5;background:${swatchColor(x.color)}"></span><span>Colour: <b>${esc(x.color)}</b></span></div>${x.note?`<div class="cart-meta">Note: ${esc(x.note)}</div>`:''}${x.giftWrap?`<div class="cart-meta">Gift wrapping: +${money(CFG.giftWrapFee)} × quantity</div>`:''}${x.giftMessage?`<div class="cart-meta">Gift message: ${esc(x.giftMessage)}</div>`:''}<div class="k-cart-actions"><button onclick="changeQuantity(${i},-1)">−</button><span>${Number(x.quantity)||1}</span><button onclick="changeQuantity(${i},1)">+</button><button onclick="removeFromCart(${i})">Remove</button></div></div><strong>${money(x.price*(Number(x.quantity)||1))}</strong></div>`).join('');
    }
    const set=(id,v)=>{if($(id))$(id).textContent=v;};
    set('cart-subtotal',money(t.subtotal));set('cart-giftwrap',money(t.giftWrap));set('cart-discount',t.discount?'-'+money(t.discount):money(0));set('cart-shipping',t.shipping?money(t.shipping):'FREE');set('cart-total',money(t.total));
    if($('cart-progress'))$('cart-progress').innerHTML=t.subtotal>=CFG.freeShippingAt?'🎉 Free delivery unlocked':t.subtotal?`Add ${money(CFG.freeShippingAt-t.subtotal)} more for <b>FREE DELIVERY</b>`:`Add ${money(CFG.freeShippingAt)}+ to unlock <b>FREE DELIVERY</b>`;
  }

  function renderWishlistPage(){
    const box=$('wish-grid');if(!box)return;const w=wish();
    if(!w.length){box.innerHTML='<div class="k-panel" style="grid-column:1/-1;text-align:center;padding:55px"><div class="k-empty-icon">♡</div><h2>Nothing saved yet</h2><p>Tap the heart on a product to save it.</p><a href="shop.html" class="k-primary-btn">Explore Products</a></div>';return;}
    box.innerHTML=w.map((x,i)=>`<article class="k-product-card"><div class="k-product-image"><a href="product.html?product=${encodeURIComponent(x.productId||x.name)}"><img src="${esc(x.image)}" alt="${esc(x.name)}"></a><button class="k-wish" onclick="removeFromWishlist(${i})">♥</button></div><div class="k-product-body"><h3>${esc(x.name)}</h3><div class="k-product-price">${money(x.price)}</div><div class="cart-meta">Category: ${esc(categoryName(x.category))}</div><div class="k-product-actions"><button class="k-view" onclick="removeFromWishlist(${i})">Remove</button><button class="k-add" data-wish-add="${i}">Add to Cart</button></div></div></article>`).join('');
    box.querySelectorAll('[data-wish-add]').forEach(b=>b.onclick=()=>{const x=w[Number(b.dataset.wishAdd)];addToCart(x.name,x.price,x.image,1,{productId:x.productId,category:x.category});});
  }

  async function initProductPage(){
    if(!$('product-name') || !location.pathname.toLowerCase().endsWith('product.html')) return;
    const id=new URLSearchParams(location.search).get('product');
    const list=await loadCatalog(); const p=list.find(x=>x.id===id)||list.find(x=>x.name===id)||findProduct(id);
    if(!p){$('product-name').textContent='Product not found';return;}
    document.title=p.name+' | KASHORIA';
    $('product-name').textContent=p.name; if($('product-price'))$('product-price').textContent=money(p.price);if($('product-image')){$('product-image').src=p.image;$('product-image').alt=p.name;}if($('product-description'))$('product-description').textContent=p.description||'A beautiful handmade crochet creation, carefully crafted with love.';
    const colors=await getColors(p), select=$('product-color'), sw=$('color-swatches');
    if(sw){
      const title=sw.previousElementSibling;
      if(title && !title.dataset.colorTitle){title.textContent='Choose Colour';title.dataset.colorTitle='1';}
    }
    if(select)select.innerHTML=colors.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if(sw){
      sw.innerHTML=colors.map((c,i)=>`<button type="button" class="k-color-swatch ${i===0?'active':''}" data-color="${esc(c)}" title="${esc(c)}"><span></span><b>${esc(c)}</b></button>`).join('');
      sw.querySelectorAll('.k-color-swatch').forEach(b=>{const s=b.querySelector('span');s.style.background=swatchColor(b.dataset.color);s.style.backgroundColor=swatchColor(b.dataset.color);b.onclick=()=>{if(select){select.value=b.dataset.color;select.dispatchEvent(new Event('change'));}};});
    }
    const customBox=$('custom-color-box'), customInput=$('custom-color-input'), preview=$('custom-color-preview'), img=$('product-image');
    function apply(){
      const value=select?.value||colors[0]||'As shown in product image';
      const custom=value==='Custom colour'||value.startsWith('Custom:');if(customBox)customBox.hidden=!custom;
      sw?.querySelectorAll('.k-color-swatch').forEach(b=>b.classList.toggle('active',b.dataset.color===value));
      const variants={'5-heart-phone-charm':{'Dusty Pink':'images/5 heart pink phone charm.jpeg','Baby Pink':'images/5 heart pink phone charm.jpeg','Rose Pink':'images/5 heart pink phone charm.jpeg','Deep Purple':'images/5 heart purple phone charm.jpeg','Lavender':'images/5 heart purple phone charm.jpeg','Lilac':'images/5 heart purple phone charm.jpeg','Purple & Cream':'images/5 heart purple phone charm.jpeg'},'pink-heart-phone-charm':{'Dusty Pink':'images/5 heart pink phone charm.jpeg','Baby Pink':'images/5 heart pink phone charm.jpeg','Rose Pink':'images/5 heart pink phone charm.jpeg','Lavender Pink':'images/5 heart purple phone charm.jpeg'}};
      if(variants[p.id]?.[value] && img)img.src=variants[p.id][value];
      if(preview)preview.textContent=custom?('Selected colour: '+value.replace(/^Custom:\s*/,'')):'';
    }
    select?.addEventListener('change',apply);customInput?.addEventListener('input',()=>{const v=customInput.value.trim();if(v&&select){let o=[...select.options].find(x=>x.dataset.custom==='1');if(!o){o=document.createElement('option');o.dataset.custom='1';select.appendChild(o);}o.value='Custom: '+v;o.textContent=o.value;select.value=o.value;}apply();});apply();
    let qty=1;if($('quantity'))$('quantity').textContent='1';$('increase')?.addEventListener('click',()=>{qty++;$('quantity').textContent=qty;});$('decrease')?.addEventListener('click',()=>{qty=Math.max(1,qty-1);$('quantity').textContent=qty;});
    const options=()=>({productId:p.id,category:p.category,color:select?.value||'As shown in product image',note:$('custom-note')?.value.trim()||'',giftWrap:!!$('gift-wrap-product')?.checked,giftMessage:$('gift-message-product')?.value.trim()||'',referenceImage:$('reference-image')?.dataset.dataUrl||''});
    $('cart-button')?.addEventListener('click',()=>addToCart(p.name,p.price,p.image,qty,options()),{once:true});
    $('buy-button')?.addEventListener('click',()=>{if(addToCart(p.name,p.price,p.image,qty,options()))location.href='checkout.html';},{once:true});
    $('wishlist-button')?.addEventListener('click',()=>toggleWishlist(p.name,p.price,p.image,$('wishlist-button')),{once:true});
  }

  function renderCheckout(){
    if(!$('checkout-form'))return;
    const c=cart(),t=totals(c),box=$('co-items');
    if(box)box.innerHTML=c.length?c.map(x=>`<div class="k-checkout-item" style="display:flex;gap:12px;padding:12px 0;border-bottom:1px dashed #eadfd9"><img src="${esc(x.image)}" alt="${esc(x.name)}" style="width:58px;height:58px;object-fit:cover;border-radius:12px"><div style="flex:1"><strong>${esc(x.name)}</strong><div class="cart-meta">Category: ${esc(categoryName(x.category))}</div><div class="cart-meta" style="display:flex;align-items:center;gap:7px"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;border:1px solid #d8cbc5;background:${swatchColor(x.color)}"></span><span>Colour: <b>${esc(x.color)}</b></span></div><div class="cart-meta">Quantity: ${Number(x.quantity)||1}</div>${x.giftWrap?`<div class="cart-meta">Gift wrapping: +${money(CFG.giftWrapFee)} × quantity</div>`:''}</div><strong>${money(Number(x.price)*(Number(x.quantity)||1))}</strong></div>`).join(''):'<div class="k-empty" style="padding:25px;text-align:center"><p>Your cart is empty.</p><a href="shop.html" class="k-primary-btn">Shop Collection</a></div>';
    const set=(id,v)=>{if($(id))$(id).textContent=v;};set('co-sub',money(t.subtotal));set('co-discount',t.discount?'-'+money(t.discount):money(0));set('co-giftwrap',money(t.giftWrap));set('co-ship',t.shipping?money(t.shipping):'FREE');set('co-total',money(t.total));
    const submit=$('checkout-form').querySelector('button[type="submit"]');if(submit){submit.disabled=!c.length;submit.textContent=c.length?'Place Order ♡':'Cart is Empty';submit.style.pointerEvents='auto';submit.style.cursor=c.length?'pointer':'not-allowed';}
  }

  function validateCheckoutForm(form){
    const fields=[
      ['co-name','Please enter your full name.'],
      ['co-phone','Please enter your 10-digit phone number.'],
      ['co-email','Please enter a valid email address.'],
      ['co-address','Please enter your delivery address.'],
      ['co-city','Please enter your city.'],
      ['co-pincode','Please enter your 6-digit pincode.']
    ];
    for(const [id,msg] of fields){
      const el=$(id); const value=String(el?.value||'').trim();
      if(!value){toast(msg);el?.focus();return false;}
    }
    const phone=String($('co-phone')?.value||'').replace(/\D/g,'');
    if(phone.length!==10){toast('Phone number must contain exactly 10 digits.');$('co-phone')?.focus();return false;}
    const pin=String($('co-pincode')?.value||'').replace(/\D/g,'');
    if(pin.length!==6){toast('Pincode must contain exactly 6 digits.');$('co-pincode')?.focus();return false;}
    const email=String($('co-email')?.value||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast('Please enter a valid email address.');$('co-email')?.focus();return false;}
    return true;
  }

 async function submitCheckout(e) {
  e.preventDefault();

  const c = cart();

  if (!c.length) {
    toast("Your cart is empty");
    return;
  }

  const form = e.currentTarget;

  if (!validateCheckoutForm(form)) return;

  const button = form.querySelector('button[type="submit"]');

  if (button) {
    button.disabled = true;
    button.textContent = "Placing Order…";
    button.style.pointerEvents = "auto";
  }

  try {
    const customer = {
      name: $("co-name")?.value.trim() || "",
      phone: $("co-phone")?.value.trim() || "",
      email: $("co-email")?.value.trim() || "",
      address: $("co-address")?.value.trim() || "",
      city: $("co-city")?.value.trim() || "",
      pincode: $("co-pincode")?.value.trim() || ""
    };

    const paymentMethod =
      document.querySelector('input[name="payment"]:checked')?.value === "UPI"
        ? "UPI"
        : "COD";

    const orderNote = $("co-order-note")?.value.trim() || "";
    const couponCode = sessionStorage.getItem("kashoria_coupon") || "";
    const t = totals(c);

    // Save the order in MySQL through the existing KASHORIA API.
    const payload = {
      customer,
      paymentMethod,
      couponCode,
      giftMessage: c.map(x => x.giftMessage || "").filter(Boolean).join(" | "),
      orderNote,
      items: c.map(x => ({
        productId: x.productId,
        quantity: Number(x.quantity) || 1,
        color: x.color || "As shown in product image",
        note: x.note || "",
        giftWrap: !!x.giftWrap,
        giftMessage: x.giftMessage || "",
        referenceImage: x.referenceImage || ""
      }))
    };

    const response = await fetch(API_BASE + "/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        "Could not place the order. Please try again."
      );
    }

    const serverOrder = data.order || {};
    const orderNumber =
      serverOrder.orderNumber ||
      data.orderNumber ||
      ("KASHORIA-" + Date.now());

    const finalTotal =
      Number(serverOrder.total) ||
      Number(serverOrder.total_amount) ||
      Number(t.total) ||
      0;

    // Complete message that you can paste into KASHORIA Instagram DM.
    const orderDetails = [
      "✨ KASHORIA NEW ORDER ✨",
      "",
      "🆔 ORDER NUMBER",
      orderNumber,
      "",
      "🛍️ ORDER DETAILS",
      "━━━━━━━━━━━━━━━━━━",

      ...c.map((item, index) => {
        const qty = Number(item.quantity) || 1;
        const itemTotal = (Number(item.price) || 0) * qty;

        return [
          `${index + 1}. ${item.name}`,
          `   Colour: ${item.color || "As shown in product image"}`,
          `   Quantity: ${qty}`,
          `   Price: ${money(item.price)} each`,
          `   Product Total: ${money(itemTotal)}`,
          item.note ? `   Custom Note: ${item.note}` : "",
          item.giftWrap ? "   🎁 Gift Wrap: Yes" : "",
          item.giftMessage ? `   Gift Message: ${item.giftMessage}` : ""
        ].filter(Boolean).join("\n");
      }),

      "",
      "💰 PAYMENT & TOTAL",
      "━━━━━━━━━━━━━━━━━━",
      `Subtotal: ${money(t.subtotal)}`,
      `Discount: ${t.discount ? "-" + money(t.discount) : money(0)}`,
      `Gift Wrap: ${money(t.giftWrap)}`,
      `Delivery: ${t.shipping ? money(t.shipping) : "FREE"}`,
      `GRAND TOTAL: ${money(finalTotal)}`,
      "",
      "👤 CUSTOMER DETAILS",
      "━━━━━━━━━━━━━━━━━━",
      `Name: ${customer.name}`,
      `Phone: ${customer.phone}`,
      `Email: ${customer.email}`,
      "",
      "📍 DELIVERY ADDRESS",
      "━━━━━━━━━━━━━━━━━━",
      `Address: ${customer.address}`,
      `City: ${customer.city}`,
      `Pincode: ${customer.pincode}`,
      "",
      `💳 Payment Method: ${paymentMethod}`,
      couponCode ? `🏷️ Coupon: ${couponCode}` : "",
      orderNote ? `📝 Order Note: ${orderNote}` : "",
      "",
      "💗 Ordered from KASHORIA Website"
    ].filter(Boolean).join("\n");

    // Keep a backup of the complete successful order in the browser.
    localStorage.setItem(
      "kashoria_last_order",
      JSON.stringify({
        ...serverOrder,
        orderNumber,
        customer,
        paymentMethod,
        items: c,
        totals: {
          ...t,
          serverTotal: finalTotal
        },
        message: orderDetails,
        createdAt: new Date().toISOString()
      })
    );

    localStorage.setItem("kashoria_instagram_order", orderDetails);

    // Copy the complete order so it can be pasted into Instagram.
    let copied = false;

    try {
      await navigator.clipboard.writeText(orderDetails);
      copied = true;
    } catch (copyError) {
      console.warn("Clipboard API unavailable:", copyError);

      try {
        const temp = document.createElement("textarea");
        temp.value = orderDetails;
        temp.style.position = "fixed";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        copied = document.execCommand("copy");
        temp.remove();
      } catch (_) {}
    }

    // Only clear the cart AFTER the order was successfully saved.
    localStorage.removeItem("cart");
    sessionStorage.removeItem("kashoria_coupon");
    sessionStorage.removeItem("kashoria_discount");
    updateCounts();

    toast(
      copied
        ? "Order saved! Details copied. Opening Instagram…"
        : "Order saved! Opening Instagram…"
    );

    // Open your KASHORIA Instagram page.
    setTimeout(() => {
      window.open(
        CFG.instagram || "https://www.instagram.com/kashoria_/",
        "_blank",
        "noopener,noreferrer"
      );

      // Show the normal confirmation page in the current tab.
      location.href =
        "order-confirmation.html?order=" +
        encodeURIComponent(orderNumber);
    }, 700);

  } catch (err) {
    console.error("KASHORIA CHECKOUT:", err);

    toast(
      err.message ||
      "Could not place the order. Please check your details and try again."
    );

    if (button) {
      button.disabled = false;
      button.textContent = "Place Order ♡";
      button.style.pointerEvents = "auto";
      button.style.cursor = "pointer";
    }
  }
}
  function wireProductCards(){
    document.addEventListener('click',e=>{const img=e.target.closest('.product-card img,.k-product-card img');if(!img||e.target.closest('button,a'))return;const card=img.closest('.product-card,.k-product-card');const p=findProduct(card?.dataset.productId||card?.dataset.name||img.alt,img.getAttribute('src'));if(p){e.preventDefault();location.href='product.html?product='+encodeURIComponent(p.id);}});
  }

  async function init(){
    // Render immediately from localStorage, then refresh product prices/options from API.
    updateCounts();renderCartPage();renderWishlistPage();renderCheckout();wireProductCards();
    const form=$('checkout-form');
    if(form&&!form.dataset.masterBound){form.dataset.masterBound='1';form.addEventListener('submit',submitCheckout);}
    const couponBtn=$('apply-coupon');
    if(couponBtn&&!couponBtn.dataset.masterBound){
      couponBtn.dataset.masterBound='1';
      couponBtn.addEventListener('click',()=>{
        const code=String($('coupon')?.value||'').trim().toUpperCase();
        const subtotal=totals(cart()).subtotal;
        let discount=0;
        // Keep compatibility with the project's existing coupon helper when available.
        try{
          const result=typeof window.kashoriaCoupon==='function'?window.kashoriaCoupon(code,subtotal):null;
          if(result?.ok){discount=Number(result.discount)||0;sessionStorage.setItem('kashoria_coupon',code);}
          else {sessionStorage.removeItem('kashoria_coupon');}
        }catch(_){sessionStorage.removeItem('kashoria_coupon');}
        sessionStorage.setItem('kashoria_discount',String(Math.min(subtotal,Math.max(0,discount))));
        renderCartPage();renderCheckout();
        if($('coupon-message'))$('coupon-message').textContent=discount?`Coupon ${code} applied ♡`:(code?'Coupon not valid':'');
      });
    }
    await loadCatalog();
    // Re-normalize old cart records using the API catalog, then render again.
    const normalized=cart();write('cart',normalized);updateCounts();renderCartPage();renderCheckout();
    await initProductPage();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
