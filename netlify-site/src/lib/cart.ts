export type CartItem={id:string;name:string;price:number;image:string;qty:number;variant?:string};
export const readCart=():CartItem[]=>{if(typeof window==='undefined')return [];try{return JSON.parse(localStorage.getItem('kashoria-cart')||'[]')}catch{return []}};
export const saveCart=(items:CartItem[])=>{localStorage.setItem('kashoria-cart',JSON.stringify(items));window.dispatchEvent(new Event('cart-updated'))};
export const addCart=(item:CartItem)=>{const c=readCart();const x=c.find(i=>i.id===item.id&&i.variant===item.variant);if(x)x.qty+=item.qty;else c.push(item);saveCart(c)};
