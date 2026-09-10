(function(){
  'use strict';

  const all = window.getKashoriaProducts ? window.getKashoriaProducts() : [];
  const id = new URLSearchParams(location.search).get('product');
  const product = all.find(p => p.id === id) || all.find(p => p.name === id);
  const $ = key => document.getElementById(key);

  const palettes = {
    phonecharms: ['As shown in product image','Lavender','Dusty Pink','Sky Blue','Sage Green','Cream'],
    keychains: ['As shown in product image','Blush Pink','Lavender','Baby Blue','Butter Yellow','Sage Green'],
    bagcharms: ['As shown in product image','Dusty Pink','Lavender','Sage Green','Sky Blue','Cream'],
    hairaccessories: ['As shown in product image','Dusty Pink','Lavender','Butter Yellow','Sage Green','Baby Blue'],
    bouquets: ['As shown in product image','Pink & Cream','Lavender & White','Peach & Cream','Blue & White','Pastel Mix'],
    phonecases: ['As shown in product image','Blush Pink','Lavender','Sage Green','Sky Blue','Cream'],
    flowers: ['As shown in product image','Red','Pink','Yellow','Lavender','White'],
    rakhis: ['As shown in product image','Red & Cream','Pink & White','Lavender & White','Blue & White','Pastel Mix'],
    gifts: ['As shown in product image','Blush Pink','Lavender','Sky Blue','Sage Green','Cream']
  };

  const extra = {
    'evil-eye-phone-charm':['As shown in product image','Royal Blue','Navy Blue','Sky Blue','Black & White'],
    'evil-eye-keychain':['As shown in product image','Royal Blue','Navy Blue','Sky Blue','Black & White'],
    'pink-heart-phone-charm':['As shown in product image','Dusty Pink','Baby Pink','Rose Pink','Lavender Pink'],
    '5-heart-purple-phone-charm':['As shown in product image','Deep Purple','Lavender','Lilac','Purple & Cream']
  };

  const imageVariants = {
    '5-heart-phone-charm': {
      'Dusty Pink':'images/5 heart pink phone charm.jpeg',
      'Baby Pink':'images/5 heart pink phone charm.jpeg',
      'Rose Pink':'images/5 heart pink phone charm.jpeg',
      'Deep Purple':'images/5 heart purple phone charm.jpeg',
      'Lavender':'images/5 heart purple phone charm.jpeg',
      'Lilac':'images/5 heart purple phone charm.jpeg',
      'Purple & Cream':'images/5 heart purple phone charm.jpeg'
    },
    'pink-heart-phone-charm': {
      'Dusty Pink':'images/5 heart pink phone charm.jpeg',
      'Baby Pink':'images/5 heart pink phone charm.jpeg',
      'Rose Pink':'images/5 heart pink phone charm.jpeg',
      'Lavender Pink':'images/5 heart purple phone charm.jpeg'
    },
    '5-heart-purple-phone-charm': {
      'Deep Purple':'images/5 heart purple phone charm.jpeg',
      'Lavender':'images/5 heart purple phone charm.jpeg',
      'Lilac':'images/5 heart purple phone charm.jpeg',
      'Purple & Cream':'images/5 heart purple phone charm.jpeg',
      'Dusty Pink':'images/5 heart pink phone charm.jpeg'
    },
    'rose-bouquet': {
      'Pink & Cream':'images/rose bouquet.jpg',
      'Peach & Cream':'images/rose bouquet.jpg'
    },
    'butterfly-bag-charm': {
      'Sky Blue':'images/blue butterfly bag charm.jpg',
      'Lavender':'images/butterfly bag charm.jpg'
    }
  };

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function fallbackColors(p){
    return [...(extra[p.id] || p.colors || palettes[p.category] || palettes.gifts), 'Custom colour']
      .filter((v,i,a)=>a.indexOf(v)===i);
  }

  async function loadColors(p){
    try {
      const d = await window.KASHORIA_API_CLIENT?.request('/api/features/products/'+encodeURIComponent(p.id)+'/options');
      if (Array.isArray(d?.colors) && d.colors.length) return d.colors;
    } catch (_) {}
    return fallbackColors(p);
  }

  function colorValue(name){
    const n = String(name || '').toLowerCase();
    if (n.includes('purple') || n.includes('lavender') || n.includes('lilac')) return '#b59ad9';
    if (n.includes('dusty pink') || n.includes('blush') || n.includes('baby pink') || n.includes('rose pink')) return '#e6a5b5';
    if (n.includes('pink')) return '#ef9fb5';
    if (n.includes('red')) return '#d85b68';
    if (n.includes('blue') || n.includes('navy') || n.includes('royal')) return '#5f88c7';
    if (n.includes('sky')) return '#8fc8e8';
    if (n.includes('sage') || n.includes('green')) return '#9eb89b';
    if (n.includes('cream') || n.includes('butter')) return '#f3dfae';
    if (n.includes('yellow')) return '#f0cf61';
    if (n.includes('black')) return '#333333';
    if (n.includes('white')) return '#ffffff';
    if (n.includes('peach')) return '#f2b29d';
    if (n.includes('custom')) return 'linear-gradient(135deg,#f2d5df,#c8b5df,#b9d8d0)';
    return '#eee8e4';
  }

  function renderReviews(list){
    const box=$('review-list');
    if(!box)return;
    box.innerHTML=list.length ? list.map(r=>`<div class="k-review"><strong>${esc(r.reviewer_name||r.name)} · ${'★'.repeat(Number(r.rating)||5)}</strong><p>${esc(r.review_text||r.text)}</p>${r.photo_url||r.photo?`<img class="k-review-photo-img" src="${esc(r.photo_url||r.photo)}" alt="Customer review photo">`:''}<small>${new Date(r.created_at||r.date||Date.now()).toLocaleDateString('en-IN')}</small></div>`).join('') : '<p>No reviews yet. Be the first to share your experience ♡</p>';
  }

  async function loadReviews(){
    if(!id)return;
    try {
      const d=await window.KASHORIA_API_CLIENT?.request('/api/reviews/'+encodeURIComponent(id));
      renderReviews(d?.reviews||[]);
    } catch (_) {
      renderReviews(JSON.parse(localStorage.getItem('kashoria_reviews_'+id)||'[]'));
    }
  }

  async function main(){
    if(!product){
      if($('product-name')) $('product-name').textContent='Product not found';
      return;
    }

    document.title=product.name+' | KASHORIA';
    if($('product-name')) $('product-name').textContent=product.name;
    if($('product-price')) $('product-price').textContent='₹'+(Number(product.price)||0);
    if($('product-image')) { $('product-image').src=product.image; $('product-image').alt=product.name; }
    if($('product-description')) $('product-description').textContent=product.description || 'A beautiful handmade crochet creation, carefully crafted with love. Made with attention to detail and packed especially for you.';

    const colors = await loadColors(product);
    const select=$('product-color'), swatches=$('color-swatches'), customBox=$('custom-color-box'), customInput=$('custom-color-input'), preview=$('custom-color-preview'), img=$('product-image');

    if(select){
      select.innerHTML=colors.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
      const custom=[...select.options].find(o=>o.value==='Custom colour');
      if(custom) custom.textContent='Custom colour — enter your colour';
    }

    if(swatches){
      swatches.innerHTML=colors.map((c,i)=>`
        <button type="button" class="k-color-swatch ${i===0?'active':''}" data-color="${esc(c)}" title="${esc(c)}" style="--swatch:${colorValue(c)}">
          <span></span>
          <b>${esc(c)}</b>
        </button>`).join('');

      swatches.querySelectorAll('.k-color-swatch').forEach(button=>{
        button.addEventListener('click',()=>{
          if(select){
            select.value=button.dataset.color;
            select.dispatchEvent(new Event('change',{bubbles:true}));
          }
        });
      });
    }

    function applyImageForColor(color){
      const src=imageVariants[product.id]?.[color];
      if(src && img) img.src=src;
    }

    function sync(){
      const value=select?.value || 'As shown in product image';
      const custom=value==='Custom colour' || value.startsWith('Custom:');
      if(customBox) customBox.hidden=!custom;
      swatches?.querySelectorAll('.k-color-swatch').forEach(b=>b.classList.toggle('active',b.dataset.color===value));
      applyImageForColor(value);
    }

    select?.addEventListener('change',sync);

    customInput?.addEventListener('input',()=>{
      const v=customInput.value.trim();
      if(v && select){
        let o=[...select.options].find(x=>x.dataset.customValue==='true');
        if(!o){
          o=document.createElement('option');
          o.dataset.customValue='true';
          select.appendChild(o);
        }
        o.value='Custom: '+v;
        o.textContent=o.value;
        select.value=o.value;
      }
      if(preview) preview.textContent=v?'Selected colour: '+v:'';
      sync();
    });

    sync();

    let qty=1;
    const q=$('quantity');
    $('increase')?.addEventListener('click',()=>{qty++;if(q)q.textContent=qty;});
    $('decrease')?.addEventListener('click',()=>{if(qty>1)qty--;if(q)q.textContent=qty;});

    function opts(){
      return {
        color:select?.value || 'As shown in product image',
        note:$('custom-note')?.value.trim() || '',
        productId:product.id,
        category:product.category || '',
        referenceImage:$('reference-image')?.dataset.dataUrl || '',
        giftWrap:!!$('gift-wrap-product')?.checked,
        giftMessage:$('gift-message-product')?.value.trim() || ''
      };
    }

    function add(go){
      const success=window.addToCart?.(product.name,Number(product.price),product.image,qty,opts());
      if(success !== false && go) setTimeout(()=>location.href='checkout.html',120);
    }

    const cb=$('cart-button'), bb=$('buy-button');
    if(cb && !cb.dataset.featureBound){ cb.dataset.featureBound='1'; cb.onclick=()=>add(false); }
    if(bb && !bb.dataset.featureBound){ bb.dataset.featureBound='1'; bb.onclick=()=>add(true); }

    $('whatsapp-order')?.addEventListener('click',()=>{
      const o=opts();
      const number=window.KASHORIA_CONFIG?.whatsapp || '';
      window.open('https://wa.me/'+number+'?text='+encodeURIComponent(`Hi KASHORIA! I want to order ${product.name} (₹${Number(product.price)||0})\nColour: ${o.color}${o.note?'\nNote: '+o.note:''}`),'_blank');
    });

    $('wishlist-button')?.addEventListener('click',()=>window.toggleWishlist?.(product.name,product.price,product.image,$('wishlist-button')));

    const related=all.filter(p=>p.id!==product.id&&p.category===product.category).slice(0,4),rc=$('related-products');
    if(rc) rc.innerHTML=related.map(p=>`<a class="k-related-card" href="product.html?product=${encodeURIComponent(p.id)}"><img src="${esc(p.image)}" alt="${esc(p.name)}"><strong>${esc(p.name)}</strong><span>₹${Number(p.price)||0}</span></a>`).join('');

    loadReviews();
  }

  $('review-form')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const photo=$('review-photo')?.files?.[0];
    if(photo&&photo.size>2*1024*1024){window.kashoriaToast?.('Review photo must be under 2 MB');return;}
    const fd=new FormData();
    fd.append('name',$('review-name').value.trim());
    fd.append('rating',$('review-rating').value);
    fd.append('text',$('review-text').value.trim());
    if(photo)fd.append('photo',photo);
    try {
      await window.KASHORIA_API_CLIENT.request('/api/reviews/'+encodeURIComponent(id),{method:'POST',body:fd});
      e.target.reset();window.kashoriaToast?.('Thank you for your review ♡');location.reload();
    } catch(err) { window.kashoriaToast?.(err.message||'Could not submit review'); }
  });

  main();
})();
