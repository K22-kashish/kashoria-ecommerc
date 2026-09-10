
(function(){
"use strict";
window.filterCategory=window.filterCategory||function(category,button){
  const norm=v=>String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const target=norm(category);
  document.querySelectorAll(".categories button").forEach(b=>b.classList.remove("active"));
  if(button)button.classList.add("active");
  let n=0;
  document.querySelectorAll(".product-card").forEach(card=>{
    const ok=target==="all"||norm(card.dataset.category)===target;
    card.style.display=ok?"":"none"; if(ok)n++;
  });
  const s=document.getElementById("categoryStatus"); if(s)s.textContent=target==="all"?"Showing all products":`Showing ${n} product${n===1?"":"s"}`;
};
window.searchProducts=window.searchProducts||function(){
  const q=(document.getElementById("search")?.value||"").toLowerCase().trim();
  const active=document.querySelector(".categories button.active");
  const matchCat=(active?.getAttribute("onclick")||"").match(/filterCategory\('([^']+)/);
  const cat=(matchCat?matchCat[1]:"all").toLowerCase().replace(/[^a-z0-9]/g,"");
  let n=0;
  document.querySelectorAll(".product-card").forEach(card=>{
    const name=(card.dataset.name||"").toLowerCase();
    const ok=name.includes(q)&&(cat==="all"||String(card.dataset.category||"").toLowerCase().replace(/[^a-z0-9]/g,"")===cat);
    card.style.display=ok?"":"none"; if(ok)n++;
  });
  const s=document.getElementById("categoryStatus"); if(s)s.textContent=q?`${n} matching product${n===1?"":"s"}`:"Showing all products";
};
window.openProduct=function(value, legacyPrice, legacyImage){
  const resolver=window.resolveKashoriaProduct;
  const product=typeof resolver==="function"
    ? resolver(value, legacyImage)
    : null;

  if(product){
    location.href="product.html?product="+encodeURIComponent(product.id);
    return;
  }

  // Legacy fallback: never pass an unknown product to the detail page
  // when we can identify it from its image.
  if(legacyImage){
    location.href="product.html?product="+encodeURIComponent(value||"");
  }else{
    location.href="shop.html";
  }
};
document.addEventListener("DOMContentLoaded",()=>{
  const search=document.getElementById("search");
  if(search)search.addEventListener("input",window.searchProducts);
});
})();
