/* KASHORIA storefront interaction fix
   Loaded last so product navigation, cart and wishlist always use one consistent implementation.
*/
(function () {
  "use strict";

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  };

  const write = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const products = () =>
    typeof window.getKashoriaProducts === "function"
      ? window.getKashoriaProducts()
      : (Array.isArray(window.KASHORIA_PRODUCTS) ? window.KASHORIA_PRODUCTS : []);

  function resolve(value, image) {
    const list = products();
    const clean = v => String(v || "").trim().replace(/^\.?\//, "").toLowerCase();
    const v = clean(value);
    const img = clean(image);

    if (img) {
      const byImage = list.find(p => clean(p.image) === img);
      if (byImage) return byImage;
    }
    return list.find(p => clean(p.id) === v) ||
           list.find(p => clean(p.name) === v) ||
           null;
  }

  // Product detail navigation.
  window.openProduct = function (value, price, image) {
    const p = resolve(value, image);
    const id = p ? p.id : String(value || "");
    if (!id) return;
    window.location.href = "product.html?product=" + encodeURIComponent(id);
  };

  function toast(message) {
    if (typeof window.kashoriaToast === "function") {
      window.kashoriaToast(message);
    } else {
      console.log("[KASHORIA]", message);
    }
  }

  // One reliable cart implementation. Keeps productId/options so product variants remain separate.
  window.addToCart = function (name, price, image, quantity, options) {
    options = options || {};
    const p = resolve(name, image);
    if (p) {
      name = p.name;
      price = p.price;
      image = p.image;
      options = Object.assign({}, options, { productId: p.id, category: p.category || "" });
    }

    const safePrice = Number(price);
    const qty = Math.max(1, Number(quantity) || 1);
    if (!name || !Number.isFinite(safePrice) || safePrice <= 0) {
      toast("This product is currently unavailable.");
      return;
    }

    const item = {
      productId: String(options.productId || (p && p.id) || ""),
      category: String(options.category || (p && p.category) || ""),
      name: String(name),
      price: safePrice,
      image: String(image || ""),
      quantity: qty,
      color: String(options.color || "As shown in product image"),
      note: String(options.note || ""),
      giftWrap: !!options.giftWrap,
      giftMessage: String(options.giftMessage || ""),
      referenceImage: String(options.referenceImage || "")
    };

    let cart = read("cart", []);
    if (!Array.isArray(cart)) cart = [];

    const same = x =>
      String(x.productId || "") === item.productId &&
      String(x.color || "As shown in product image") === item.color &&
      String(x.note || "") === item.note &&
      !!x.giftWrap === item.giftWrap &&
      String(x.giftMessage || "") === item.giftMessage &&
      String(x.referenceImage || "") === item.referenceImage;

    const found = cart.find(same);
    if (found) {
      found.quantity = (Number(found.quantity) || 1) + qty;
      found.name = item.name;
      found.price = item.price;
      found.image = item.image;
    } else {
      cart.push(item);
    }

    // Backfill category for older cart entries too.
    cart = cart.map(x => {
      if (!x.category) {
        const rp = resolve(x.productId || x.name, x.image);
        if (rp) x.category = String(rp.category || "");
      }
      return x;
    });
    write("cart", cart);
    updateCounts();
    if (typeof window.renderKashoriaDrawer === "function") {
      window.renderKashoriaDrawer();
    }
    toast(item.name + " added to your cart ♡");

    // Do not force-open the drawer here; the site's existing drawer behavior remains intact.
  };

  window.toggleWishlist = function (name, price, image, button) {
    const p = resolve(name, image);
    if (p) {
      name = p.name;
      price = p.price;
      image = p.image;
    }

    const safePrice = Number(price);
    if (!name || !Number.isFinite(safePrice) || safePrice <= 0) {
      toast("This product is currently unavailable.");
      return;
    }

    let wish = read("wishlist", []);
    if (!Array.isArray(wish)) wish = [];

    const id = String((p && p.id) || "");
    const found = wish.find(x =>
      (id && String(x.productId || "") === id) ||
      String(x.image || "").toLowerCase() === String(image || "").toLowerCase()
    );

    if (found) {
      wish = wish.filter(x =>
        !((id && String(x.productId || "") === id) ||
          String(x.image || "").toLowerCase() === String(image || "").toLowerCase())
      );
      if (button) button.textContent = "♡ Wishlist";
      toast("Removed from wishlist");
    } else {
      wish.push({
        productId: id,
        name: String(name),
        price: safePrice,
        image: String(image || "")
      });
      if (button) button.textContent = "♥ Added";
      toast("Saved to wishlist ♡");
    }

    write("wishlist", wish);
    updateCounts();
    if (typeof window.displayWishlist === "function") {
      window.displayWishlist();
    }
  };

  function updateCounts() {
    const cart = read("cart", []);
    const wish = read("wishlist", []);
    const cartCount = Array.isArray(cart)
      ? cart.reduce((sum, x) => sum + (Number(x.quantity) || 1), 0)
      : 0;
    const wishCount = Array.isArray(wish) ? wish.length : 0;

    document.querySelectorAll("#cart-count,[data-cart-count],.cart-count")
      .forEach(el => el.textContent = cartCount);
    document.querySelectorAll("#wishlist-count,[data-wishlist-count],.wishlist-count")
      .forEach(el => el.textContent = wishCount);
  }

  // Safety net for product-card images/buttons, including cards generated dynamically.
  document.addEventListener("click", function (event) {
    const image = event.target.closest(".product-card img");
    if (image) {
      const card = image.closest(".product-card");
      if (card && !event.target.closest("button,a")) {
        const id = card.dataset.productId || image.dataset.productId;
        const name = card.dataset.name || image.alt;
        const p = resolve(id || name, image.getAttribute("src"));
        if (p) {
          event.preventDefault();
          window.location.href = "product.html?product=" + encodeURIComponent(p.id);
        }
      }
    }
  });

  document.addEventListener("DOMContentLoaded", updateCounts);
  window.updateKashoriaCounts = updateCounts;
})();
