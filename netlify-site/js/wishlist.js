
(function(){
"use strict";
let wishlist=[];
function canonical(item){
  try{
    const products=window.getKashoriaProducts?.()||[];
    const image=String(item?.image||"").replace(/^\.\//,"").toLowerCase();
    const name=String(item?.name||"").trim().toLowerCase();
    const match=products.find(p=>String(p.image||"").replace(/^\.\//,"").toLowerCase()===image)
      || products.find(p=>String(p.name||"").trim().toLowerCase()===name);
    if(match) return {...item,name:match.name,price:Number(match.price),image:match.image};
  }catch(_){}
  return item;
}
function load(){
  try{wishlist=JSON.parse(localStorage.getItem("wishlist")||"[]");}catch(_){wishlist=[];}
  if(!Array.isArray(wishlist)) wishlist=[];
  wishlist=wishlist.map(canonical).filter(p=>p && Number(p.price)>0);
  localStorage.setItem("wishlist",JSON.stringify(wishlist));
}
load();
function save(){localStorage.setItem("wishlist",JSON.stringify(wishlist));}
function count(){document.querySelectorAll("#wishlist-count,[data-wishlist-count]").forEach(el=>el.textContent=wishlist.length);}
window.toggleWishlist=function(name,price,image,button){
  wishlist=JSON.parse(localStorage.getItem("wishlist")||"[]");
  const safePrice=Number(price);
  if(!Number.isFinite(safePrice) || safePrice<=0) return;
  const found=wishlist.find(x=>x.name===name || x.image===image);
  if(found){wishlist=wishlist.filter(x=>x.name!==name && x.image!==image);if(button)button.textContent="♡ Wishlist";}
  else{wishlist.push({name,price:safePrice,image:image||""});if(button)button.textContent="♥ Added";}
  save();count();
  if(window.kashoriaToast) window.kashoriaToast(found?"Removed from wishlist":"Saved to wishlist ♡");
};
window.updateWishlistCount=count;
document.addEventListener("DOMContentLoaded",count);
})();
