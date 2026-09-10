
(function(){
"use strict";
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
function sync(){ cart = JSON.parse(localStorage.getItem("cart") || "[]"); }
function saveCart(){ localStorage.setItem("cart", JSON.stringify(cart)); }
function updateCartCount(){
  const count = cart.reduce((s,p)=>s+(Number(p.quantity)||1),0);
  document.querySelectorAll("#cart-count,[data-cart-count]").forEach(el=>el.textContent=count);
}
function toast(m){ if(window.kashoriaToast) window.kashoriaToast(m); else alert(m); }
window.addToCart = function(name, price, image, quantity=1, options={}){
  sync();
  const safePrice = Number(price);
  const itemPrice = Number.isFinite(safePrice) && safePrice > 0 ? safePrice : 0;
  const color = String(options.color || "As shown in product image").trim();
  const note = String(options.note || "").trim();
  const productId = String(options.productId || "").trim();
  const same = x => x.name===name && (x.color||"As shown in product image")===color && (x.note||"")===note;
  const p=cart.find(same);
  if(p){
    p.quantity=(Number(p.quantity)||1)+(Number(quantity)||1);
    p.price=itemPrice; p.image=image||p.image; p.productId=productId||p.productId;
  } else cart.push({name,price:itemPrice,image:image||"",quantity:Number(quantity)||1,color,note,productId});
  saveCart(); updateCartCount(); toast(name+" added to your cart ♡");
  if(window.renderKashoriaDrawer) window.renderKashoriaDrawer();
};
window.changeQuantity=function(i,d){
  sync(); if(!cart[i]) return;
  cart[i].quantity=(Number(cart[i].quantity)||1)+d;
  if(cart[i].quantity<=0) cart.splice(i,1);
  saveCart(); updateCartCount();
  if(typeof window.displayCart==="function") window.displayCart();
  if(window.renderKashoriaDrawer) window.renderKashoriaDrawer();
};
window.increaseQuantity=i=>window.changeQuantity(i,1);
window.decreaseQuantity=i=>window.changeQuantity(i,-1);
window.removeFromCart=function(i){
  sync(); cart.splice(i,1); saveCart(); updateCartCount();
  if(typeof window.displayCart==="function") window.displayCart();
  if(window.renderKashoriaDrawer) window.renderKashoriaDrawer();
};
window.calculateCartTotal=function(){ sync(); return cart.reduce((s,p)=>s+(Number(p.price)||0)*(Number(p.quantity)||1),0); };
window.updateCartCount=updateCartCount;
document.addEventListener("DOMContentLoaded",updateCartCount);
})();
