(function () {
  "use strict";

  /* =========================================================
     KASHORIA CONFIGURATION
     ========================================================= */

  const cfg = window.KASHORIA_CONFIG || {
    freeShippingAt: 1299,
    shippingFee: 80,
    whatsapp: "917778975203",
    instagram: "https://www.instagram.com/kashoria_/"
  };

  const money = n =>
    "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");


  /* =========================================================
     LOCAL STORAGE HELPERS
     ========================================================= */

  const read = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);

      if (value === null) {
        return fallback;
      }

      const parsed = JSON.parse(value);

      return parsed ?? fallback;
    } catch (e) {
      console.error("KASHORIA storage read error:", e);
      return fallback;
    }
  };


  const write = (key, value) => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch (e) {
      console.error("KASHORIA storage write error:", e);
    }
  };


  /* =========================================================
     KASHORIA GLOBAL OBJECT
     ========================================================= */

  window.KASHORIA = window.KASHORIA || {};

  window.KASHORIA.money = money;


  /* =========================================================
     CART / WISHLIST
     ========================================================= */

  function cartItems() {
    const cart = read("cart", []);
    if (!Array.isArray(cart)) return [];

    const products = window.getKashoriaProducts?.() || [];
    const normalized = cart.map(item => {
      const image = String(item?.image || "").replace(/^\.\//, "").toLowerCase();
      const name = String(item?.name || "").trim().toLowerCase();
      const match = products.find(p => String(p.image || "").replace(/^\.\//, "").toLowerCase() === image)
        || products.find(p => String(p.name || "").trim().toLowerCase() === name);
      return match
        ? {...item, name: match.name, price: Number(match.price), image: match.image}
        : item;
    }).filter(item => Number(item?.price) > 0);

    if (JSON.stringify(normalized) !== JSON.stringify(cart)) write("cart", normalized);
    return normalized;
  }


  function wishlistItems() {
    const wishlist = read("wishlist", []);

    return Array.isArray(wishlist)
      ? wishlist
      : [];
  }


  /* =========================================================
     CART COUNT + WISHLIST COUNT
     ========================================================= */

  window.updateKashoriaCounts = function () {

    const cart = cartItems();
    const wish = wishlistItems();

    const cartCount = cart.reduce(
      (total, product) => {
        return total +
          (Number(product.quantity) || 1);
      },
      0
    );


    const wishlistCount = wish.length;


    document
      .querySelectorAll(
        "[data-cart-count], #cart-count, .cart-count"
      )
      .forEach(el => {

        el.textContent = cartCount;

        if (cartCount > 0) {
          el.classList.add("has-items");
        } else {
          el.classList.remove("has-items");
        }
      });


    document
      .querySelectorAll(
        "[data-wishlist-count], #wishlist-count, .wishlist-count"
      )
      .forEach(el => {

        el.textContent = wishlistCount;

        if (wishlistCount > 0) {
          el.classList.add("has-items");
        } else {
          el.classList.remove("has-items");
        }
      });
  };


  /* =========================================================
     TOAST
     ========================================================= */

  window.kashoriaToast = function (message) {

    let toast =
      document.getElementById(
        "kashoria-toast"
      );


    if (!toast) {

      toast =
        document.createElement("div");

      toast.id = "kashoria-toast";

      toast.className = "k-toast";

      document.body.appendChild(toast);
    }


    toast.textContent = message;

    toast.classList.add("show");


    clearTimeout(
      window.__kToast
    );


    window.__kToast = setTimeout(
      () => {
        toast.classList.remove("show");
      },
      2400
    );
  };


  /* =========================================================
     ESCAPE HTML
     ========================================================= */

  function escapeHtml(value) {

    return String(value ?? "")
      .replace(
        /[&<>"']/g,
        character => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[character])
      );
  }


  window.kashoriaEscape =
    escapeHtml;


  /* =========================================================
     STORAGE EVENT
     ========================================================= */

  window.addEventListener(
    "storage",
    function () {
      updateKashoriaCounts();
      renderCartDrawer();
    }
  );


  /* =========================================================
     ADD TO CART
     
     IMPORTANT:
     This keeps your original HTML structure:
     
     addToCart(name, price, image, quantity)
     
     ========================================================= */

  window.addToCart = function (
    name,
    price,
    image,
    quantity = 1
  ) {
    const cart = cartItems();
    let productName = String(name || "").trim();
    let productPrice = Number(price);
    let productImage = image || "";

    // Always resolve catalog items by ID/name/image when possible.
    try {
      const match = window.resolveKashoriaProduct?.(productName, productImage);
      if (match) {
        productName = match.name;
        productPrice = Number(match.price);
        productImage = match.image;
      }
    } catch (_) {}

    if (!productName || !Number.isFinite(productPrice) || productPrice <= 0) {
      kashoriaToast("This product price is unavailable.");
      return;
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const existing = cart.find(item =>
      String(item.name || "").trim().toLowerCase() === productName.toLowerCase()
      || String(item.image || "").trim().toLowerCase() === productImage.toLowerCase()
    );

    if (existing) {
      existing.name = productName;
      existing.price = productPrice;
      existing.image = productImage;
      existing.quantity = (Number(existing.quantity) || 1) + qty;
    } else {
      cart.push({
        name: productName,
        price: productPrice,
        image: productImage,
        quantity: qty
      });
    }

    write("cart", cart);
    updateKashoriaCounts();
    renderCartDrawer();
    kashoriaToast(productName + " added to your cart ♡");
    openCartDrawer();
  };


  /* =========================================================
     WISHLIST
     ========================================================= */

  window.toggleWishlist = function (
    name,
    price,
    image,
    button
  ) {
    let wish = wishlistItems();
    let productName = String(name || "").trim();
    let productPrice = Number(price);
    let productImage = image || "";

    try {
      const match = window.resolveKashoriaProduct?.(productName, productImage);
      if (match) {
        productName = match.name;
        productPrice = Number(match.price);
        productImage = match.image;
      }
    } catch (_) {}

    if (!productName || !Number.isFinite(productPrice) || productPrice <= 0) {
      kashoriaToast("This product price is unavailable.");
      return;
    }

    const found = wish.find(item =>
      String(item.name || "").trim().toLowerCase() === productName.toLowerCase()
      || String(item.image || "").trim().toLowerCase() === productImage.toLowerCase()
    );

    if (found) {
      wish = wish.filter(item =>
        String(item.name || "").trim().toLowerCase() !== productName.toLowerCase()
        && String(item.image || "").trim().toLowerCase() !== productImage.toLowerCase()
      );
      if (button) button.textContent = "♡ Wishlist";
      kashoriaToast("Removed from wishlist");
    } else {
      wish.push({name: productName, price: productPrice, image: productImage});
      if (button) button.textContent = "♥ Added";
      kashoriaToast("Saved to wishlist ♡");
    }

    write("wishlist", wish);
    updateKashoriaCounts();
  };


  /* =========================================================
     REMOVE FROM WISHLIST
     ========================================================= */

  window.removeFromWishlist =
    function (index) {

      const wish =
        wishlistItems();


      if (
        index < 0 ||
        index >= wish.length
      ) {
        return;
      }


      wish.splice(index, 1);


      write(
        "wishlist",
        wish
      );


      updateKashoriaCounts();


      /*
       * If wishlist page has its own renderer,
       * refresh it.
       */

      if (
        typeof window.displayWishlist ===
        "function"
      ) {
        window.displayWishlist();
      } else {
        location.reload();
      }
    };


  /* =========================================================
     CATEGORY FILTER
     ========================================================= */

  window.filterCategory =
    function (
      category,
      button
    ) {

      const cards =
        document.querySelectorAll(
          ".product-card"
        );


      const normalize =
        value =>
          String(value || "")
            .toLowerCase()
            .replace(
              /[^a-z0-9]/g,
              ""
            );


      const target =
        normalize(category);


      document
        .querySelectorAll(
          ".categories button"
        )
        .forEach(
          b =>
            b.classList.remove(
              "active"
            )
        );


      if (button) {
        button.classList.add(
          "active"
        );
      }


      let shown = 0;


      cards.forEach(card => {

        const cardCategory =
          normalize(
            card.dataset.category
          );


        const match =
          target === "all" ||
          cardCategory === target;


        card.style.display =
          match
            ? ""
            : "none";


        if (match) {
          shown++;
        }
      });


      const status =
        document.getElementById(
          "categoryStatus"
        );


      if (status) {

        status.textContent =
          target === "all"
            ? "Showing all products"
            : `Showing ${shown} product${
                shown === 1
                  ? ""
                  : "s"
              }`;
      }


      const search =
        document.getElementById(
          "search"
        );


      if (
        search &&
        search.value.trim()
      ) {
        window.searchProducts();
      }
    };


  /* =========================================================
     SEARCH
     ========================================================= */

  window.searchProducts =
    function () {

      const searchInput =
        document.getElementById(
          "search"
        );


      const q =
        (
          searchInput?.value ||
          ""
        )
          .toLowerCase()
          .trim();


      const active =
        document.querySelector(
          ".categories button.active"
        );


      let category =
        "all";


      if (active) {

        const onclick =
          active.getAttribute(
            "onclick"
          ) || "";


        const match =
          onclick.match(
            /filterCategory\(['"]([^'"]+)/
          );


        if (match) {
          category =
            match[1];
        }
      }


      const normalize =
        value =>
          String(value || "")
            .toLowerCase()
            .replace(
              /[^a-z0-9]/g,
              ""
            );


      const target =
        normalize(category);


      let shown = 0;


      document
        .querySelectorAll(
          ".product-card"
        )
        .forEach(card => {

          const name =
            (
              card.dataset.name ||
              card.querySelector(
                "h3"
              )?.textContent ||
              ""
            )
              .toLowerCase();


          const cardCategory =
            normalize(
              card.dataset.category
            );


          const nameMatch =
            name.includes(q);


          const categoryMatch =
            target === "all" ||
            cardCategory === target;


          const match =
            nameMatch &&
            categoryMatch;


          card.style.display =
            match
              ? ""
              : "none";


          if (match) {
            shown++;
          }
        });


      const status =
        document.getElementById(
          "categoryStatus"
        );


      if (status) {

        if (q) {

          status.textContent =
            `${shown} matching product${
              shown === 1
                ? ""
                : "s"
            }`;

        } else {

          status.textContent =
            "Showing all products";
        }
      }
    };


  /* =========================================================
     OPEN PRODUCT
     ========================================================= */

  window.openProduct =
    function (
      idOrName,
      price,
      image
    ) {

      let id =
        String(
          idOrName || ""
        );


      const all =
        (
          window.getKashoriaProducts
            ? window.getKashoriaProducts()
            : []
        );


      const byId =
        all.find(
          p =>
            String(p.id) ===
            id
        );


      const byName =
        all.find(
          p =>
            p.name === id
        );


      if (byId) {

        id =
          byId.id;

      } else if (byName) {

        id =
          byName.id;

      } else if (
        price !== undefined
      ) {

        const temp =
          all.find(
            p =>
              p.name === idOrName &&
              Number(p.price) ===
                Number(price) &&
              p.image === image
          );


        if (temp) {

          id =
            temp.id;

        } else {

          id =
            window.kashoriaSlug
              ? window.kashoriaSlug(
                  idOrName
                )
              : id;
        }
      }


      location.href =
        "product.html?product=" +
        encodeURIComponent(id);
    };


  /* =========================================================
     CART DRAWER
     ========================================================= */

  function ensureDrawer() {

    if (
      document.getElementById(
        "kashoria-cart-drawer"
      )
    ) {
      return;
    }


    const wrap =
      document.createElement(
        "div"
      );


    wrap.innerHTML = `

      <div
        class="k-drawer-backdrop"
        id="k-drawer-backdrop">
      </div>


      <aside
        class="k-cart-drawer"
        id="kashoria-cart-drawer"
        aria-label="Shopping cart">


        <div class="k-drawer-head">

          <div>
            <span class="eyebrow">
              KASHORIA
            </span>

            <h3>
              Your Cart
              <span id="drawer-count">
                0
              </span>
            </h3>
          </div>


          <button
            class="k-close"
            id="close-cart-drawer"
            aria-label="Close cart">
            ×
          </button>

        </div>


        <div
          class="k-free-progress"
          id="drawer-progress">
        </div>


        <div
          id="drawer-items"
          class="k-drawer-items">
        </div>


        <div class="k-drawer-foot">

          <div class="k-summary-line">
            <span>Subtotal</span>
            <strong id="drawer-subtotal">
              ₹0
            </strong>
          </div>


          <div class="k-summary-line">
            <span>Delivery</span>
            <strong id="drawer-shipping">
              ₹0
            </strong>
          </div>


          <div class="k-summary-total">
            <span>Total</span>
            <strong id="drawer-total">
              ₹0
            </strong>
          </div>


          <div class="k-drawer-actions">

            <a
              class="k-secondary-btn"
              href="cart.html">
              View Cart
            </a>

            <a
              class="k-primary-btn"
              href="checkout.html">
              Checkout
            </a>

          </div>


          <p class="k-mini-note">
            Secure checkout •
            Handmade with love ♡
          </p>

        </div>

      </aside>
    `;


    document.body.appendChild(
      wrap
    );


    const backdrop =
      document.getElementById(
        "k-drawer-backdrop"
      );


    if (backdrop) {
      backdrop.onclick =
        closeDrawer;
    }


    const closeButton =
      document.getElementById(
        "close-cart-drawer"
      );


    if (closeButton) {
      closeButton.onclick =
        closeDrawer;
    }


    renderCartDrawer();
  }


  /* =========================================================
     RENDER CART DRAWER
     ========================================================= */

  function renderCartDrawer() {

    const itemsEl =
      document.getElementById(
        "drawer-items"
      );


    if (!itemsEl) {
      return;
    }


    const cart =
      cartItems();


    /*
     * Calculate subtotal.
     */

    const subtotal =
      cart.reduce(
        (sum, product) => {

          const price =
            Number(
              product.price
            ) || 0;


          const quantity =
            Number(
              product.quantity
            ) || 1;


          return sum +
            price *
            quantity;

        },
        0
      );


    /*
     * FREE DELIVERY at ₹1299+
     */

    const shipping =
      subtotal === 0
        ? 0
        : subtotal >=
            Number(
              cfg.freeShippingAt
            )
          ? 0
          : Number(
              cfg.shippingFee
            );


    /*
     * Total pieces.
     */

    const count =
      cart.reduce(
        (sum, product) =>
          sum +
          (
            Number(
              product.quantity
            ) || 1
          ),
        0
      );


    const drawerCount =
      document.getElementById(
        "drawer-count"
      );


    const drawerSubtotal =
      document.getElementById(
        "drawer-subtotal"
      );


    const drawerShipping =
      document.getElementById(
        "drawer-shipping"
      );


    const drawerTotal =
      document.getElementById(
        "drawer-total"
      );


    if (drawerCount) {
      drawerCount.textContent =
        count;
    }


    if (drawerSubtotal) {
      drawerSubtotal.textContent =
        money(subtotal);
    }


    if (drawerShipping) {

      drawerShipping.textContent =
        shipping > 0
          ? money(shipping)
          : "FREE";
    }


    if (drawerTotal) {

      drawerTotal.textContent =
        money(
          subtotal +
          shipping
        );
    }


    /*
     * Free delivery message.
     */

    const progress =
      document.getElementById(
        "drawer-progress"
      );


    if (progress) {

      if (!subtotal) {

        progress.innerHTML =
          `Add ${money(
            cfg.freeShippingAt
          )}+ to unlock <b>FREE DELIVERY</b>`;

      } else if (
        subtotal >=
        cfg.freeShippingAt
      ) {

        progress.innerHTML =
          `🎉 You unlocked <b>FREE DELIVERY!</b>`;

      } else {

        progress.innerHTML =
          `You're ${money(
            cfg.freeShippingAt -
            subtotal
          )} away from <b>FREE DELIVERY</b>`;
      }
    }


    /*
     * Empty cart.
     */

    if (!cart.length) {

      itemsEl.innerHTML = `

        <div class="k-empty">

          <div class="k-empty-icon">
            ♡
          </div>

          <h4>
            Your cart is waiting
          </h4>

          <p>
            Add a handmade favourite
            to get started.
          </p>

          <a
            href="shop.html"
            class="k-primary-btn">
            Shop Collection
          </a>

        </div>
      `;

      return;
    }


    /*
     * Render products.
     */

    itemsEl.innerHTML =
      cart
        .map(
          (product, index) => {

            const quantity =
              Number(
                product.quantity
              ) || 1;


            return `

              <div
                class="k-drawer-item">


                <img
                  src="${escapeHtml(
                    product.image
                  )}"
                  alt="${escapeHtml(
                    product.name
                  )}">


                <div
                  class="k-drawer-info">


                  <h4>
                    ${escapeHtml(
                      product.name
                    )}
                  </h4>


                  <strong>
                    ${money(
                      product.price
                    )}
                  </strong>


                  <div class="k-qty">

                    <button
                      type="button"
                      onclick="kashoriaQty(${index}, -1)">
                      −
                    </button>


                    <span>
                      ${quantity}
                    </span>


                    <button
                      type="button"
                      onclick="kashoriaQty(${index}, 1)">
                      +
                    </button>

                  </div>

                </div>


                <button
                  type="button"
                  class="k-remove"
                  onclick="kashoriaRemove(${index})"
                  aria-label="Remove">
                  ×
                </button>

              </div>
            `;
          }
        )
        .join("");
  }


  /* =========================================================
     CHANGE CART QUANTITY
     ========================================================= */

  window.kashoriaQty =
    function (
      index,
      delta
    ) {

      const cart =
        cartItems();


      if (!cart[index]) {
        return;
      }


      let quantity =
        Number(
          cart[index].quantity
        ) || 1;


      quantity +=
        Number(delta) || 0;


      if (quantity <= 0) {

        cart.splice(
          index,
          1
        );

      } else {

        cart[index].quantity =
          quantity;
      }


      write(
        "cart",
        cart
      );


      updateKashoriaCounts();

      renderCartDrawer();


      /*
       * Support existing cart page.
       */

      if (
        typeof window.displayCart ===
        "function"
      ) {
        window.displayCart();
      }


      kashoriaToast(
        "Cart updated ♡"
      );
    };


  /* =========================================================
     REMOVE FROM CART
     ========================================================= */

  window.kashoriaRemove =
    function (index) {

      const cart =
        cartItems();


      if (!cart[index]) {
        return;
      }


      const productName =
        cart[index].name ||
        "Product";


      cart.splice(
        index,
        1
      );


      write(
        "cart",
        cart
      );


      updateKashoriaCounts();

      renderCartDrawer();


      if (
        typeof window.displayCart ===
        "function"
      ) {
        window.displayCart();
      }


      kashoriaToast(
        productName +
        " removed from cart"
      );
    };


  /* =========================================================
     OPEN CART DRAWER
     ========================================================= */

  window.openCartDrawer =
    function () {

      ensureDrawer();

      renderCartDrawer();


      const drawer =
        document.getElementById(
          "kashoria-cart-drawer"
        );


      const backdrop =
        document.getElementById(
          "k-drawer-backdrop"
        );


      if (drawer) {
        drawer.classList.add(
          "open"
        );
      }


      if (backdrop) {
        backdrop.classList.add(
          "show"
        );
      }


      document.body.classList.add(
        "drawer-open"
      );
    };


  /* =========================================================
     CLOSE CART DRAWER
     ========================================================= */

  function closeDrawer() {

    const drawer =
      document.getElementById(
        "kashoria-cart-drawer"
      );


    const backdrop =
      document.getElementById(
        "k-drawer-backdrop"
      );


    if (drawer) {

      drawer.classList.remove(
        "open"
      );
    }


    if (backdrop) {

      backdrop.classList.remove(
        "show"
      );
    }


    document.body.classList.remove(
      "drawer-open"
    );
  }


  window.closeCartDrawer =
    closeDrawer;


  window.renderKashoriaDrawer =
    renderCartDrawer;


  /* =========================================================
     CART LINKS
     ========================================================= */

  function wireCartLinks() {

    document
      .querySelectorAll(
        'a[href="cart.html"]'
      )
      .forEach(a => {

        if (
          a.dataset.drawerWired
        ) {
          return;
        }


        a.addEventListener(
          "click",
          e => {

            if (
              e.defaultPrevented ||
              e.ctrlKey ||
              e.metaKey ||
              e.shiftKey ||
              e.altKey ||
              e.button !== 0
            ) {
              return;
            }


            if (
              location.pathname
                .endsWith(
                  "/cart.html"
                )
            ) {
              return;
            }


            e.preventDefault();

            openCartDrawer();
          }
        );


        a.dataset.drawerWired =
          "1";
      });
  }


  /* =========================================================
     ANNOUNCEMENT BAR
     ========================================================= */

  function injectAnnouncement() {

    if (
      document.querySelector(
        ".k-announcement"
      )
    ) {
      return;
    }


    const bar =
      document.createElement(
        "div"
      );


    bar.className =
      "k-announcement";


    bar.innerHTML =
      `✨ Handmade with love • FREE DELIVERY on orders ₹1299+ • Custom orders welcome`;


    document.body.prepend(
      bar
    );
  }


  /* =========================================================
     FLOATING SOCIAL BUTTONS
     ========================================================= */

  function injectFloatingSocial() {

    if (
      document.querySelector(
        ".k-floating-social"
      )
    ) {
      return;
    }


    const el =
      document.createElement(
        "div"
      );


    el.className =
      "k-floating-social";


    el.innerHTML = `

      <a
        href="${escapeHtml(cfg.instagram)}"
        target="_blank"
        rel="noopener"
        aria-label="Instagram"
        title="Instagram">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/>
          <circle cx="17.4" cy="6.7" r="1.1" fill="currentColor"/>
        </svg>
      </a>

      <a
        href="https://wa.me/${escapeHtml(cfg.whatsapp)}?text=${encodeURIComponent(
          "Hi KASHORIA! I want to know more about your crochet products."
        )}"
        target="_blank"
        rel="noopener"
        aria-label="WhatsApp"
        title="WhatsApp">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20.5 3.5A11.85 11.85 0 0 0 12.05 0C5.49 0 .15 5.34.15 11.9c0 2.1.55 4.15 1.6 5.95L.05 24l6.3-1.65a11.9 11.9 0 0 0 5.7 1.45h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.46-8.4ZM12.06 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.23-.37a9.86 9.86 0 1 1 8.37 4.63Zm5.42-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.67-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.1 4.49.71.31 1.27.5 1.71.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.41.25-.69.25-1.28.17-1.41-.07-.12-.27-.2-.57-.35Z" fill="currentColor"/>
        </svg>
      </a>
    `;


    document.body.appendChild(
      el
    );
  }


  /* =========================================================
     FOOTER
     ========================================================= */

  function injectFooter() {

    if (
      document.querySelector(
        ".k-footer"
      )
    ) {
      return;
    }


    const footer =
      document.createElement(
        "footer"
      );


    footer.className =
      "k-footer";


    footer.innerHTML = `

      <div class="k-footer-grid">


        <div>

          <h3>
            KASHORIA
          </h3>

          <p>
            Handmade crochet pieces
            crafted slowly, carefully
            and with love.
          </p>


          <div class="k-footer-social">

            <a
              href="${escapeHtml(
                cfg.instagram
              )}"
              target="_blank"
              rel="noopener">
              Instagram
            </a>


            <a
              href="https://wa.me/${escapeHtml(
                cfg.whatsapp
              )}"
              target="_blank"
              rel="noopener">
              WhatsApp
            </a>

          </div>

        </div>


        <div>

          <h4>
            Shop
          </h4>

          <a href="shop.html">
            All Products
          </a>

          <a href="shop.html?category=phonecharms">
            Phone Charms
          </a>

          <a href="shop.html?category=keychains">
            Keychains
          </a>

          <a href="shop.html?category=Bouquets">
            Bouquets
          </a>

        </div>


        <div>

          <h4>
            Help
          </h4>

          <a href="faq.html">
            FAQs
          </a>

          <a href="contact.html">
            Contact
          </a>

          <a href="cart.html">
            Shipping & Cart
          </a>

          <a href="login.html">
            Account
          </a>

        </div>


        <div>

          <h4>
            Stay in the loop
          </h4>

          <p>
            New drops, offers and
            handmade stories.
          </p>


          <form id="k-newsletter">

            <input
              type="email"
              placeholder="Your email"
              required>


            <button
              type="submit">
              Join ♡
            </button>

          </form>

        </div>

      </div>


      <div class="k-footer-bottom">

        © ${new Date().getFullYear()}
        KASHORIA • Handmade with Love ♡

      </div>
    `;


    document.body.appendChild(
      footer
    );


    const form =
      document.getElementById(
        "k-newsletter"
      );


    if (form) {

      form.addEventListener(
        "submit",
        e => {

          e.preventDefault();


          const input =
            form.querySelector(
              "input"
            );


          const email =
            input.value.trim();


          const list =
            read(
              "kashoria_newsletter",
              []
            );


          if (
            email &&
            !list.includes(email)
          ) {
            list.push(email);
          }


          write(
            "kashoria_newsletter",
            list
          );


          form.reset();


          kashoriaToast(
            "You're on the KASHORIA list ♡"
          );
        }
      );
    }
  }


  /* =========================================================
     INITIALIZATION
     ========================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      /*
       * Announcement
       */

      injectAnnouncement();


      /*
       * Cart drawer
       */

      ensureDrawer();


      /*
       * Cart links
       */

      wireCartLinks();


      /*
       * Social buttons
       */

      injectFloatingSocial();


      /*
       * Footer
       */

      injectFooter();


      /*
       * Counts
       */

      updateKashoriaCounts();


      /*
       * Existing open-cart buttons
       */

      document
        .querySelectorAll(
          "[data-open-cart]"
        )
        .forEach(button => {

          if (
            button.dataset
              .kashoriaCartWired
          ) {
            return;
          }


          button.addEventListener(
            "click",
            e => {

              e.preventDefault();

              openCartDrawer();
            }
          );


          button.dataset
            .kashoriaCartWired =
            "1";
        });


      /*
       * Final cart render
       */

      renderCartDrawer();


      console.log(
        "KASHORIA enhancements loaded successfully."
      );


      console.log(
        "Free delivery threshold:",
        money(
          cfg.freeShippingAt
        )
      );


      console.log(
        "Shipping below threshold:",
        money(
          cfg.shippingFee
        )
      );
    }
  );


  /* =========================================================
     CURRENT NAVIGATION TAB
     ========================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      const current =
        (
          location.pathname
            .split("/")
            .pop() ||
          "index.html"
        ).toLowerCase();


      document
        .querySelectorAll(
          ".k-site-nav a"
        )
        .forEach(a => {

          const href =
            (
              a.getAttribute(
                "href"
              ) || ""
            )
              .split("#")[0]
              .split("?")[0]
              .toLowerCase();


          if (
            href &&
            href === current
          ) {
            a.classList.add(
              "active"
            );
          }
        });
    }
  );

})();