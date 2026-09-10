(function(){
  'use strict';
  const cfg=window.KASHORIA_CONFIG||{freeShippingAt:1299,shippingFee:80,whatsapp:'917778975203',instagram:'https://www.instagram.com/kashoria_/'};
  const read=(k,f)=>{try{const v=localStorage.getItem(k);return v===null?f:JSON.parse(v)}catch(_){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const products=()=>window.getKashoriaProducts?.()||[];
  function syncCatalogPrices(){ const c=read('cart',[]); if(!Array.isArray(c))return; let changed=false; const ps=products(); const out=c.map(x=>{const p=ps.find(p=>String(p.id)===String(x.productId))||ps.find(p=>String(p.image)===String(x.image))||ps.find(p=>String(p.name).toLowerCase()===String(x.name).toLowerCase()); if(p&&Number(x.price)!==Number(p.price)){changed=true;return {...x,productId:p.id,name:p.name,price:Number(p.price),image:p.image};} return x;}); if(changed)write('cart',out); }
  const money=n=>'₹'+Math.round(Number(n)||0).toLocaleString('en-IN');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  window.KASHORIA_FEATURES={money,read,write,esc};

  // Unified cart implementation: preserves colour/customisation variants.
  window.addToCart=function(name,price,image,quantity=1,options={}){
    let p=window.resolveKashoriaProduct?.(name,image)||null;
    if(p){name=p.name;price=p.price;image=p.image;options={...options,productId:p.id};}
    const safe=Number(price);
    if(!name||!Number.isFinite(safe)||safe<=0){window.kashoriaToast?.('This product is currently unavailable.');return;}
    const color=String(options.color||'As shown in product image').trim();
    const note=String(options.note||'').trim();
    const giftMessage=String(options.giftMessage||'').trim();
    const giftWrap=!!options.giftWrap;
    const refImage=String(options.referenceImage||'').trim();
    const qty=Math.max(1,Number(quantity)||1);
    const cart=read('cart',[]).filter(x=>Number(x?.price)>0);
    const same=x=>String(x.productId||'')===String(options.productId||p?.id||'') && String(x.color||'')===color && String(x.note||'')===note && !!x.giftWrap===giftWrap && String(x.giftMessage||'')===giftMessage && String(x.referenceImage||'')===refImage;
    const found=cart.find(same);
    if(found) found.quantity=(Number(found.quantity)||1)+qty;
    else cart.push({productId:options.productId||p?.id||'',name,price:safe,image,quantity:qty,color,note,giftWrap,giftMessage,referenceImage:refImage});
    write('cart',cart);window.updateKashoriaCounts?.();window.renderKashoriaDrawer?.();window.kashoriaToast?.(name+' added to your cart ♡');
  };

  window.kashoriaCartTotals=function(cart,discount=0){
    const sub=(cart||[]).reduce((s,p)=>s+(Number(p.price)||0)*(Number(p.quantity)||1),0);
    const ship=sub?sub>=Number(cfg.freeShippingAt)?0:Number(cfg.shippingFee):0;
    const giftWrap=(cart||[]).reduce((s,p)=>s+(p.giftWrap?40*(Number(p.quantity)||1):0),0); const d=Math.min(sub,Math.max(0,Number(discount)||0)); return {subtotal:sub,giftWrap,shipping:ship,discount:d,total:Math.max(0,sub-d)+ship+giftWrap};
  };
  window.kashoriaCoupon=function(code,subtotal){
    code=String(code||'').trim().toUpperCase(); subtotal=Number(subtotal)||0;
    const coupons={KASHORIA10:{type:'percent',value:10,label:'10% off'},WELCOME50:{type:'flat',value:50,label:'₹50 off on ₹499+'},HANDMADE15:{type:'percent',value:15,label:'15% off'}};
    const c=coupons[code]; if(!c)return {ok:false,discount:0,message:'Coupon not recognised.'};
    if(code==='WELCOME50'&&subtotal<499)return {ok:false,discount:0,message:'WELCOME50 works on orders of ₹499 or more.'};
    const d=c.type==='percent'?Math.round(subtotal*c.value/100):Math.min(subtotal,c.value);
    return {ok:true,discount:d,message:c.label+' applied ♡'};
  };

  function refreshCartCount(){const c=read('cart',[]);document.querySelectorAll('[data-cart-count],#cart-count,.cart-count').forEach(e=>e.textContent=c.reduce((s,x)=>s+(Number(x.quantity)||1),0));}
  document.addEventListener('DOMContentLoaded',()=>{syncCatalogPrices();refreshCartCount();});

  // Product-page enhancements.
  function productEnhance(){
    if(!document.getElementById('product-name'))return;
    const id=new URLSearchParams(location.search).get('product');
    const p=products().find(x=>x.id===id)||products().find(x=>x.name===id); if(!p)return;
    const detail=document.querySelector('.k-detail-info');
    if(!detail)return;
    const option=detail.querySelector('.k-colour-option');
    if(option&&!document.getElementById('reference-image-box')){
      const box=document.createElement('div');box.className='k-option k-reference-box';box.id='reference-image-box';
      box.innerHTML='<label for="reference-image">Reference photo <span class="k-optional">(optional)</span></label><input id="reference-image" type="file" accept="image/jpeg,image/png,image/webp"><small>Upload a photo if you want us to match a design or colour.</small><div id="reference-preview" class="k-upload-preview"></div>';
      option.insertAdjacentElement('afterend',box);
      const input=box.querySelector('input'), preview=box.querySelector('#reference-preview');
      input.addEventListener('change',()=>{const f=input.files?.[0];if(!f)return;if(f.size>2*1024*1024){input.value='';window.kashoriaToast?.('Please choose an image under 2 MB.');return;}const r=new FileReader();r.onload=()=>{preview.innerHTML='<img src="'+r.result+'" alt="Reference preview">';input.dataset.dataUrl=r.result};r.readAsDataURL(f);});
    }
    if(!document.getElementById('product-gift-options')){
      const box=document.createElement('div');box.className='k-option';box.id='product-gift-options';box.innerHTML='<label class="k-check-row"><input id="gift-wrap-product" type="checkbox"> Add gift wrapping <span>+₹40</span></label><textarea id="gift-message-product" rows="2" maxlength="160" placeholder="Gift message (optional)"></textarea>';
      detail.querySelector('.k-detail-buttons')?.insertAdjacentElement('beforebegin',box);
    }
    // Image zoom/lightbox without changing catalog image mappings.
    const img=document.getElementById('product-image');
    const galleryMap={
      '5-heart-phone-charm':['images/5 heart phone charm.jpeg','images/5 heart pink phone charm.jpeg','images/5 heart purple phone charm.jpeg'],
      'rose-bouquet':['images/rose bouquet.jpg','images/rose bouquet with keychain.jpeg'],
      'rose':['images/rose.jpg','images/rose .jpeg'],
      'lilly-bag-charm':['images/lilly bag charm.jpg','images/light pink lilly bag charm.jpg.jpeg'],
      'daisy-keychain':['images/daisy keychain.jpg','images/daisy keychain2.jpeg'],
      'bow-keychain':['images/bow keychain.jpeg','images/bow keychain.jpg'],
      'butterfly-bag-charm':['images/butterfly bag charm.jpg','images/butterfly bag charm 2.jpg'],
      'mini-flower-bouquet-keychain':['images/mini flower bouquet keychain.jpeg','images/mini flower bouquet keychain2.jpeg']
    };
    if(img){
      const gallery=galleryMap[p.id]||[p.image];
      let galleryBox=document.getElementById('k-product-gallery');
      if(!galleryBox){galleryBox=document.createElement('div');galleryBox.id='k-product-gallery';galleryBox.className='k-product-gallery-controls';img.parentElement.appendChild(galleryBox);}
      galleryBox.innerHTML=gallery.map((src,i)=>'<button type="button" class="k-gallery-thumb '+(i===0?'active':'')+'" data-src="'+esc(src)+'"><img src="'+esc(src)+'" alt="'+esc(p.name)+' view '+(i+1)+'"></button>').join('');
      galleryBox.querySelectorAll('.k-gallery-thumb').forEach(b=>b.addEventListener('click',()=>{img.src=b.dataset.src;galleryBox.querySelectorAll('.k-gallery-thumb').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
      const colorImages={'5-heart-phone-charm':{'Dusty Pink':'images/5 heart pink phone charm.jpeg','Baby Pink':'images/5 heart pink phone charm.jpeg','Rose Pink':'images/5 heart pink phone charm.jpeg','Deep Purple':'images/5 heart purple phone charm.jpeg','Lavender':'images/5 heart purple phone charm.jpeg','Lilac':'images/5 heart purple phone charm.jpeg','Purple & Cream':'images/5 heart purple phone charm.jpeg'}};
      const select=document.getElementById('product-color'); if(select&&colorImages[p.id]){select.addEventListener('change',()=>{const src=colorImages[p.id][select.value];if(src){img.src=src;galleryBox.querySelectorAll('.k-gallery-thumb').forEach(x=>x.classList.toggle('active',x.dataset.src===src));}});}
      if(!img.dataset.zoomBound){img.dataset.zoomBound='1';img.title='Click to zoom';img.addEventListener('click',()=>{const modal=document.createElement('div');modal.className='k-lightbox';modal.innerHTML='<button aria-label="Close">×</button><img src="'+esc(img.src)+'" alt="'+esc(img.alt)+'">';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal||e.target.tagName==='BUTTON')modal.remove()});});}
    }
    // Product add buttons receive the extra options.
    const add=document.getElementById('cart-button'),buy=document.getElementById('buy-button');
    function currentOptions(){
      const select=document.getElementById('product-color');
      return {color:select?.value||'As shown in product image',note:document.getElementById('custom-note')?.value.trim()||'',productId:p.id,referenceImage:document.getElementById('reference-image')?.dataset.dataUrl||'',giftWrap:!!document.getElementById('gift-wrap-product')?.checked,giftMessage:document.getElementById('gift-message-product')?.value.trim()||''};
    }
    function doAdd(go){const qty=Number(document.getElementById('quantity')?.textContent)||1;addToCart(p.name,p.price,p.image,qty,currentOptions());if(go)location.href='checkout.html';}
    if(add&&!add.dataset.featureBound){add.dataset.featureBound='1';add.onclick=()=>doAdd(false);} if(buy&&!buy.dataset.featureBound){buy.dataset.featureBound='1';buy.onclick=()=>doAdd(true);}
  }

  // Inject a quick "Build your gift" link and a tracking link in footer where possible.
  function globalLinks(){
    document.querySelectorAll('.k-footer').forEach(f=>{if(!f.querySelector('[data-feature-links]')){const d=document.createElement('div');d.dataset.featureLinks='1';d.innerHTML='<h4>More</h4><a href="gift-builder.html">Build Your Gift 🎁</a><a href="track-order.html">Track Order 📦</a>';f.querySelector('.k-footer-grid')?.appendChild(d);}});
  }
  document.addEventListener('DOMContentLoaded',()=>{productEnhance();globalLinks();});
})();
