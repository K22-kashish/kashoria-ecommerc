/* KASHORIA FRONTEND STABILITY LAYER v2
   Loaded last on every page. Keeps product, cart, wishlist, category/options,
   quantity, save-for-later, search/filter and checkout data consistent.
*/
(function(){
  'use strict';
  const cfg=window.KASHORIA_CONFIG||{freeShippingAt:1299,shippingFee:80,whatsapp:'917778975203',instagram:'https://www.instagram.com/kashoria_/'};
  const read=(k,f=[])=>{try{const v=localStorage.getItem(k);return v===null?f:JSON.parse(v)}catch(_){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){console.error(e);return false}};
  const money=n=>'₹'+Math.round(Number(n)||0).toLocaleString('en-IN');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const clean=v=>String(v||'').trim().replace(/^\.\//,'').toLowerCase();
  const products=()=>typeof window.getKashoriaProducts==='function'?window.getKashoriaProducts():(Array.isArray(window.KASHORIA_PRODUCTS)?window.KASHORIA_PRODUCTS:[]);
  function resolve(value,image){
    const ps=products(), v=clean(value), im=clean(image);
    if(im){const p=ps.find(x=>clean(x.image)===im);if(p)return p;}
    return ps.find(x=>clean(x.id)===v)||ps.find(x=>clean(x.name)===v)||null;
  }
  function normalizeItem(item){
    const p=resolve(item?.productId||item?.name,item?.image);
    if(!p)return item;
    return {...item,productId:p.id,name:p.name,price:Number(p.price),image:p.image,category:p.category||item.category||''};
  }
  function getCart(){return read('cart',[]).filter(x=>x&&Number(x.price)>0).map(normalizeItem)}
  function getWish(){return read('wishlist',[]).filter(x=>x&&Number(x.price)>0).map(normalizeItem)}
  function saveCart(c){write('cart',c);updateCounts()}
  function toast(m){if(typeof window.kashoriaToast==='function')window.kashoriaToast(m);else console.log('[KASHORIA]',m)}

  window.KASHORIA_FEATURES=window.KASHORIA_FEATURES||{};
  Object.assign(window.KASHORIA_FEATURES,{money,read,write,esc});
  window.kashoriaEscape=esc;

  window.updateKashoriaCounts=function(){
    const c=getCart(),w=getWish();
    const cc=c.reduce((s,x)=>s+(Number(x.quantity)||1),0);
    document.querySelectorAll('[data-cart-count],#cart-count,.cart-count').forEach(e=>e.textContent=cc);
    document.querySelectorAll('[data-wishlist-count],#wishlist-count,.wishlist-count').forEach(e=>e.textContent=w.length);
    write('cart',c);write('wishlist',w);
  };
  window.updateCartCount=window.updateKashoriaCounts;
  window.updateWishlistCount=window.updateKashoriaCounts;
  function updateCounts(){window.updateKashoriaCounts()}

  window.openProduct=function(value,price,image){const p=resolve(value,image);const id=p?.id||value;if(id)location.href='product.html?product='+encodeURIComponent(id)};

  window.addToCart=function(name,price,image,quantity=1,options={}){
    const p=resolve(options.productId||name,image);
    if(p){name=p.name;price=p.price;image=p.image;options={...options,productId:p.id,category:p.category||options.category||''};}
    const safe=Number(price),qty=Math.max(1,Number(quantity)||1);
    if(!name||!Number.isFinite(safe)||safe<=0){toast('This product is currently unavailable.');return false}
    const item={
      productId:String(options.productId||p?.id||''),name:String(name),category:String(options.category||p?.category||''),
      price:safe,image:String(image||''),quantity:qty,color:String(options.color||'As shown in product image'),
      note:String(options.note||''),giftWrap:!!options.giftWrap,giftMessage:String(options.giftMessage||''),
      referenceImage:String(options.referenceImage||'')
    };
    const cart=getCart();
    const same=x=>String(x.productId)===item.productId&&String(x.color||'')===item.color&&String(x.note||'')===item.note&&!!x.giftWrap===item.giftWrap&&String(x.giftMessage||'')===item.giftMessage&&String(x.referenceImage||'')===item.referenceImage;
    const found=cart.find(same);
    if(found)found.quantity=(Number(found.quantity)||1)+qty;else cart.push(item);
    saveCart(cart);window.renderKashoriaDrawer?.();toast(item.name+' added to your cart ♡');return true;
  };

  window.changeQuantity=function(index,delta){const c=getCart();if(!c[index])return;c[index].quantity=Math.max(0,(Number(c[index].quantity)||1)+Number(delta||0));if(c[index].quantity===0)c.splice(index,1);saveCart(c);renderCartPage();window.renderKashoriaDrawer?.()};
  window.increaseQuantity=i=>window.changeQuantity(i,1);
  window.decreaseQuantity=i=>window.changeQuantity(i,-1);
  window.removeFromCart=function(i){const c=getCart();c.splice(i,1);saveCart(c);renderCartPage();window.renderKashoriaDrawer?.();toast('Item removed from cart')};
  window.removeItem=window.removeFromCart;
  window.calculateCartTotal=function(){return getCart().reduce((s,x)=>s+Number(x.price||0)*(Number(x.quantity)||1),0)};
  window.saveForLater=function(i){const c=getCart();if(!c[i])return;const item=c.splice(i,1)[0];const w=getWish();if(!w.some(x=>String(x.productId)===String(item.productId))){w.push({productId:item.productId,name:item.name,category:item.category,price:item.price,image:item.image});write('wishlist',w)}saveCart(c);toast('Saved for later ♡');renderCartPage()};

  window.toggleWishlist=function(name,price,image,button){
    const p=resolve(name,image), id=String(p?.id||'');let w=getWish();
    const idx=w.findIndex(x=>(id&&String(x.productId)===id)||clean(x.image)===clean(image));
    if(idx>=0){w.splice(idx,1);if(button)button.textContent='♡ Wishlist';toast('Removed from wishlist')}
    else{const safe=Number(p?.price??price);if(!Number.isFinite(safe)||safe<=0)return;w.push({productId:id,name:p?.name||name,category:p?.category||'',price:safe,image:p?.image||image});if(button)button.textContent='♥ Added';toast('Saved to wishlist ♡')}
    write('wishlist',w);updateCounts();renderWishlistPage();return true;
  };
  window.removeFromWishlist=function(i){const w=getWish();w.splice(i,1);write('wishlist',w);updateCounts();renderWishlistPage();toast('Removed from wishlist')};

  window.kashoriaCartTotals=function(cart,discount=0){
    const c=Array.isArray(cart)?cart:[];const subtotal=c.reduce((s,x)=>s+Number(x.price||0)*(Number(x.quantity)||1),0);
    const giftWrap=c.reduce((s,x)=>s+(x.giftWrap?40*(Number(x.quantity)||1):0),0);
    const shipping=subtotal>0&&subtotal>=Number(cfg.freeShippingAt)?0:(subtotal>0?Number(cfg.shippingFee):0);
    const d=Math.min(subtotal,Math.max(0,Number(discount)||0));return{subtotal,giftWrap,shipping,discount:d,total:Math.max(0,subtotal-d)+giftWrap+shipping};
  };
  window.kashoriaCoupon=function(code,subtotal){const c=String(code||'').trim().toUpperCase(),s=Number(subtotal)||0;const map={KASHORIA10:['percent',10,'10% off'],WELCOME50:['flat',50,'₹50 off on ₹499+'],HANDMADE15:['percent',15,'15% off']};if(!map[c])return{ok:false,discount:0,message:'Coupon not recognised.'};if(c==='WELCOME50'&&s<499)return{ok:false,discount:0,message:'WELCOME50 works on orders of ₹499 or more.'};const [type,val,label]=map[c];return{ok:true,discount:type==='percent'?Math.round(s*val/100):Math.min(s,val),message:label+' applied ♡',code:c}};

  function renderCartPage(){
    const box=document.getElementById('full-cart');if(!box)return;
    const c=getCart(),discount=Number(sessionStorage.getItem('kashoria_discount')||0),t=window.kashoriaCartTotals(c,discount);
    if(!c.length){box.innerHTML='<div class="k-empty"><div class="k-empty-icon">♡</div><h2>Your cart is empty</h2><p>Find something handmade for yourself or someone you love.</p><a href="shop.html" class="k-primary-btn">Shop Collection</a></div>'}
    else box.innerHTML=c.map((p,i)=>{const cat=p.category?String(p.category).replace(/[-_]/g,' ').replace(/\b\w/g,m=>m.toUpperCase()):'General';return `<div class="k-cart-row"><img src="${esc(p.image)}" alt="${esc(p.name)}"><div><h3>${esc(p.name)}</h3><strong>${money(p.price)}</strong><div class="cart-meta">🗂️ Category: ${esc(cat)}</div><div class="cart-meta">🎨 Colour: ${esc(p.color||'As shown in product image')}</div>${p.note?`<div class="cart-meta">✏️ Note: ${esc(p.note)}</div>`:''}${p.giftWrap?'<div class="cart-meta">🎁 Gift wrapping +₹40</div>':''}${p.giftMessage?`<div class="cart-meta">💌 Gift message: ${esc(p.giftMessage)}</div>`:''}${p.referenceImage?'<div class="cart-meta">📷 Reference photo attached</div>':''}<div class="k-cart-actions"><button onclick="changeQuantity(${i},-1)">−</button><span>${Number(p.quantity)||1}</span><button onclick="changeQuantity(${i},1)">+</button><button onclick="saveForLater(${i})" style="width:auto;padding:0 9px">♡ Save for later</button><button onclick="removeFromCart(${i})" style="width:auto;padding:0 9px">Remove</button></div></div><strong>${money(Number(p.price)*(Number(p.quantity)||1))}</strong></div>`}).join('');
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set('cart-subtotal',money(t.subtotal));set('cart-giftwrap',money(t.giftWrap));set('cart-discount',t.discount?'-'+money(t.discount):money(0));set('cart-shipping',t.shipping?money(t.shipping):'FREE');set('cart-total',money(t.total));
    const prog=document.getElementById('cart-progress');if(prog)prog.innerHTML=t.subtotal>=Number(cfg.freeShippingAt)?'🎉 Free delivery unlocked':'Add '+money(Number(cfg.freeShippingAt)-t.subtotal)+' more for <b>FREE DELIVERY</b>';
    const link=document.getElementById('checkout-link');if(link){link.style.pointerEvents=c.length?'auto':'none';link.style.opacity=c.length?'1':'.5';}
  }
  function renderWishlistPage(){
    const box=document.getElementById('wish-grid');if(!box)return;const w=getWish();
    if(!w.length){box.innerHTML='<div class="k-panel" style="grid-column:1/-1;text-align:center;padding:55px"><div class="k-empty-icon">♡</div><h2>Nothing saved yet</h2><p>Tap the heart on a product to save it.</p><a href="shop.html" class="k-primary-btn">Explore Products</a></div>';return}
    box.innerHTML=w.map((p,i)=>`<article class="k-product-card"><div class="k-product-image"><a href="product.html?product=${encodeURIComponent(p.productId||p.name)}"><img src="${esc(p.image)}" alt="${esc(p.name)}"></a><button class="k-wish" onclick="removeFromWishlist(${i})">♥</button></div><div class="k-product-body"><h3>${esc(p.name)}</h3><div class="k-product-price">${money(p.price)}</div><div class="cart-meta">🗂️ Category: ${esc(String(p.category||'General').replace(/[-_]/g,' '))}</div><div class="k-product-actions"><button class="k-view" onclick="removeFromWishlist(${i})">Remove</button><button class="k-add" data-wish-add="${i}">Add to Cart</button></div></div></article>`).join('');
    box.querySelectorAll('[data-wish-add]').forEach(b=>b.addEventListener('click',()=>{const p=w[Number(b.dataset.wishAdd)];if(addToCart(p.name,p.price,p.image,1,{productId:p.productId,category:p.category}))toast(p.name+' added to your cart ♡')}));
  }
  window.displayCart=renderCartPage;window.displayWishlist=renderWishlistPage;

  // Fix dynamically generated/static product cards without relying on fragile inline JS.
  document.addEventListener('click',function(e){
    const img=e.target.closest('.product-card img,.k-product-card img');
    if(img&&!e.target.closest('button,a')){const card=img.closest('.product-card,.k-product-card');const p=resolve(card?.dataset.productId||card?.dataset.name||img.alt,img.getAttribute('src'));if(p){e.preventDefault();location.href='product.html?product='+encodeURIComponent(p.id)}}
  });

  document.addEventListener('DOMContentLoaded',function(){
    updateCounts();renderCartPage();renderWishlistPage();
    // Re-sync any legacy cart records so category is never lost.
    const c=getCart();write('cart',c);const w=getWish();write('wishlist',w);updateCounts();
  });
})();
