/* KASHORIA deployment configuration.
   Netlify build writes window.KASHORIA_API from the KASHORIA_API_URL environment variable.
*/
window.KASHORIA_API = window.KASHORIA_API || '';
window.KASHORIA_CONFIG = Object.assign({
  freeShippingAt: 1299,
  shippingFee: 80,
  giftWrapFee: 40,
  whatsapp: '917778975203',
  instagram: 'https://www.instagram.com/kashoria_/'
}, window.KASHORIA_CONFIG || {});
