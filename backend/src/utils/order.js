export function calculateTotals(items, freeShippingAt, shippingFee) {
  if (!Array.isArray(items) || items.length === 0) {
    const e = new Error("Cart is empty");
    e.status = 400;
    throw e;
  }

  const clean = items.map(x => ({
    productId: String(x.productId || x.id || ""),
    quantity: Math.max(1, Math.min(100, Number(x.quantity) || 1))
  }));

  const subtotal = items.reduce((sum, x) => sum + Number(x.unitPrice || x.price || 0) * (Number(x.quantity) || 1), 0);
  const shipping = subtotal >= freeShippingAt ? 0 : shippingFee;
  return { subtotal: Number(subtotal.toFixed(2)), shippingFee: shipping, total: Number((subtotal + shipping).toFixed(2)), clean };
}

export function makeOrderNumber() {
  return "KSH" + Date.now().toString().slice(-9) + Math.floor(Math.random() * 90 + 10);
}
