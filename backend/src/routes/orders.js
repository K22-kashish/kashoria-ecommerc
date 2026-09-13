import { Router } from "express";
import { pool, withTransaction } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { makeOrderNumber } from "../utils/order.js";

const router = Router();

const freeAt = Number(process.env.FREE_SHIPPING_AT || 1299);
const giftWrapFee = 40;

/* =========================================================
   DELIVERY CHARGE
   ========================================================= */

function getDeliveryCharge(city = "", pincode = "", subtotal = 0) {
  if (subtotal >= freeAt) return 0;
  if (subtotal <= 0) return 0;

  const cityName = String(city || "").trim().toLowerCase();

  const pin = String(pincode || "")
    .replace(/\D/g, "")
    .slice(0, 6);

  // Ahmedabad
  if (
    cityName.includes("ahmedabad") ||
    pin.startsWith("380") ||
    pin.startsWith("382")
  ) {
    return 50;
  }

  // Gujarat
  const pinFirst2 = Number(pin.substring(0, 2));

  if (
    pin.length === 6 &&
    pinFirst2 >= 36 &&
    pinFirst2 <= 39
  ) {
    return 70;
  }

  // Rajasthan, Maharashtra, Madhya Pradesh
  if (
    (pinFirst2 >= 30 && pinFirst2 <= 34) ||
    (pinFirst2 >= 40 && pinFirst2 <= 44) ||
    (pinFirst2 >= 45 && pinFirst2 <= 48)
  ) {
    return 90;
  }

  // Other Indian states
  return 120;
}

/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts(conn, items) {
  const ids = [
    ...new Set(
      items.map((x) => String(x.productId || x.id || ""))
    ),
  ];

  if (!ids.length) return [];

  const placeholders = ids.map(() => "?").join(",");

  const [rows] = await conn.query(
    `
      SELECT *
      FROM products
      WHERE id IN (${placeholders})
      AND active = 1
    `,
    ids
  );

  return rows;
}

/* =========================================================
   COUPON
   ========================================================= */

async function couponInfo(conn, code, subtotal) {
  if (!code) {
    return {
      code: null,
      discount: 0,
    };
  }

  const couponCode = String(code)
    .trim()
    .toUpperCase();

  const [rows] = await conn.query(
    `
      SELECT *
      FROM coupons
      WHERE code = ?
      AND active = 1
      LIMIT 1
    `,
    [couponCode]
  );

  if (!rows.length) {
    const e = new Error("Invalid coupon code");
    e.status = 400;
    throw e;
  }

  const coupon = rows[0];
  const now = new Date();

  if (
    (coupon.starts_at &&
      now < new Date(coupon.starts_at)) ||
    (coupon.ends_at &&
      now > new Date(coupon.ends_at))
  ) {
    const e = new Error("Coupon is not active");
    e.status = 400;
    throw e;
  }

  if (Number(coupon.min_order) > subtotal) {
    const e = new Error(
      `Minimum order for this coupon is ₹${Number(
        coupon.min_order
      )}`
    );

    e.status = 400;
    throw e;
  }

  if (
    coupon.max_uses &&
    Number(coupon.used_count) >= Number(coupon.max_uses)
  ) {
    const e = new Error("Coupon usage limit reached");
    e.status = 400;
    throw e;
  }

  let discount = 0;

  if (coupon.type === "percent") {
    discount = Math.round(
      (subtotal * Number(coupon.value)) / 100
    );
  } else {
    discount = Math.min(
      subtotal,
      Number(coupon.value)
    );
  }

  if (coupon.max_discount) {
    discount = Math.min(
      discount,
      Number(coupon.max_discount)
    );
  }

  return {
    code: coupon.code,
    discount,
  };
}

/* =========================================================
   CREATE DATABASE ORDER
   ========================================================= */

async function createDbOrder({
  userId,
  body,
  paymentMethod = "UPI",
}) {
  return withTransaction(async (conn) => {
    const customer = body.customer || body;

    const {
      name,
      phone,
      email,
      address,
      city,
      pincode,
    } = customer;

    /* -----------------------------------------------------
       CUSTOMER VALIDATION
       ----------------------------------------------------- */

    if (
      !name ||
      !phone ||
      !email ||
      !address ||
      !city ||
      !pincode
    ) {
      const e = new Error(
        "Complete delivery details are required"
      );

      e.status = 400;
      throw e;
    }

    /* -----------------------------------------------------
       PINCODE CLEANING + VALIDATION
       ----------------------------------------------------- */

    const cleanPincode = String(pincode || "")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (cleanPincode.length !== 6) {
      const e = new Error(
        "Please enter a valid 6-digit pincode."
      );

      e.status = 400;
      throw e;
    }

    /* -----------------------------------------------------
       CART VALIDATION
       ----------------------------------------------------- */

    const input = body.items;

    if (!Array.isArray(input) || !input.length) {
      const e = new Error("Cart is empty");
      e.status = 400;
      throw e;
    }

    /* -----------------------------------------------------
       LOAD PRODUCTS
       ----------------------------------------------------- */

    const products = await loadProducts(conn, input);

    const productMap = new Map(
      products.map((product) => [
        String(product.id),
        product,
      ])
    );

    /* -----------------------------------------------------
       NORMALIZE CART

       NO STOCK CHECK.
       All active products are treated as available.
       ----------------------------------------------------- */

    const normalized = input.map((item) => {
      const product = productMap.get(
        String(item.productId || item.id || "")
      );

      if (!product) {
        const e = new Error(
          "One or more products are unavailable"
        );

        e.status = 400;
        throw e;
      }

      const quantity = Math.max(
        1,
        Math.min(
          1000,
          Number(item.quantity) || 1
        )
      );

      return {
        product,
        quantity,
        item,
      };
    });

    /* -----------------------------------------------------
       SUBTOTAL
       ----------------------------------------------------- */

    const subtotal = normalized.reduce(
      (sum, entry) =>
        sum +
        Number(entry.product.price) *
          entry.quantity,
      0
    );

    /* -----------------------------------------------------
       COUPON
       ----------------------------------------------------- */

    const coupon = await couponInfo(
      conn,
      body.couponCode,
      subtotal
    );

    /* -----------------------------------------------------
       GIFT WRAP
       ----------------------------------------------------- */

    const giftWrap = normalized.reduce(
      (sum, entry) =>
        sum +
        (entry.item.giftWrap
          ? giftWrapFee * entry.quantity
          : 0),
      0
    );

    /* -----------------------------------------------------
       DELIVERY

       Uses the customer's cleaned pincode.
       ----------------------------------------------------- */

    const shipping = getDeliveryCharge(
      city,
      cleanPincode,
      subtotal
    );

    /* -----------------------------------------------------
       TOTAL
       ----------------------------------------------------- */

    const total =
      Math.max(
        0,
        subtotal - coupon.discount
      ) +
      shipping +
      giftWrap;

    /* -----------------------------------------------------
       ORDER NUMBER
       ----------------------------------------------------- */

    const orderNo = makeOrderNumber();

    /* -----------------------------------------------------
       NOTES

       The current database has only one notes column.
       We store order note, coupon and gift-wrap information
       inside notes so no missing DB columns are required.
       ----------------------------------------------------- */

    const noteParts = [];

    if (body.orderNote) {
      noteParts.push(
        `Order Note: ${String(body.orderNote).trim()}`
      );
    }

    if (coupon.code) {
      noteParts.push(
        `Coupon: ${coupon.code} | Discount: ₹${coupon.discount}`
      );
    }

    if (giftWrap > 0) {
      noteParts.push(
        `Gift Wrap: ₹${giftWrap}`
      );
    }

    if (body.giftMessage) {
      noteParts.push(
        `Gift Message: ${String(body.giftMessage).trim()}`
      );
    }

    const notes = noteParts.join(" | ");

    /* -----------------------------------------------------
       INSERT ORDER

       IMPORTANT:
       Database column is `pincode`.
       We save the cleaned pincode into it.

       Only columns that actually exist in the current
       orders table are used here.
       ----------------------------------------------------- */

    const [orderResult] = await conn.query(
      `
        INSERT INTO orders
        (
          order_number,
          user_id,
          customer_name,
          phone,
          email,
          address,
          city,
          pincode,
          payment_method,
          payment_status,
          order_status,
          subtotal,
          shipping_fee,
          total,
          notes
        )
        VALUES
        (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          'PENDING',
          'NEW',
          ?,
          ?,
          ?,
          ?
        )
      `,
      [
        orderNo,
        userId || null,
        String(name).trim(),
        String(phone).trim(),
        String(email).trim().toLowerCase(),
        String(address).trim(),
        String(city).trim(),

        // Cleaned 6-digit pincode
        cleanPincode,

        // UPI only
        paymentMethod,

        subtotal,
        shipping,
        total,
        notes,
      ]
    );

    /* -----------------------------------------------------
       INSERT ORDER ITEMS
       ----------------------------------------------------- */

    for (const entry of normalized) {
      const product = entry.product;
      const quantity = entry.quantity;
      const item = entry.item;

      const lineTotal =
        Number(product.price) * quantity;

      await conn.query(
        `
          INSERT INTO order_items
          (
            order_id,
            product_id,
            product_name,
            product_image,
            unit_price,
            quantity,
            line_total,
            color,
            customization_note,
            reference_image,
            gift_wrap,
            gift_message
          )
          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          orderResult.insertId,
          product.id,
          product.name,
          product.image,
          product.price,
          quantity,
          lineTotal,

          String(
            item.color ||
              "As shown in product image"
          ),

          String(item.note || ""),

          String(
            item.referenceImage || ""
          ),

          !!item.giftWrap,

          String(
            item.giftMessage || ""
          ),
        ]
      );
    }

    /* -----------------------------------------------------
       UPDATE COUPON USAGE
       ----------------------------------------------------- */

    if (coupon.code) {
      await conn.query(
        `
          UPDATE coupons
          SET used_count = used_count + 1
          WHERE code = ?
        `,
        [coupon.code]
      );
    }

    /* -----------------------------------------------------
       RETURN ORDER SUMMARY
       ----------------------------------------------------- */

    return {
      id: orderResult.insertId,
      orderNumber: orderNo,
      subtotal,
      discount: coupon.discount,
      giftWrapFee: giftWrap,
      shippingFee: shipping,
      total,
    };
  });
}

/* =========================================================
   CREATE NORMAL ORDER
   ========================================================= */

router.post("/", async (req, res, next) => {
  try {
    /*
      KASHORIA accepts ONLINE PAYMENT only.

      Razorpay has been completely removed.
      COD is not accepted.

      Frontend must send:
      paymentMethod: "UPI"
    */

    if (req.body.paymentMethod !== "UPI") {
      return res.status(400).json({
        message:
          "Only online payment is available. Cash on Delivery is not accepted.",
      });
    }

    const result = await createDbOrder({
      userId: req.user?.id,
      body: req.body,
      paymentMethod: "UPI",
    });

    return res.status(201).json({
      order: result,
    });
  } catch (e) {
    next(e);
  }
});

/* =========================================================
   MY ORDERS
   ========================================================= */

router.get(
  "/mine",
  requireAuth,
  async (req, res, next) => {
    try {
      const [orders] = await pool.query(
        `
          SELECT *
          FROM orders
          WHERE user_id = ?
          ORDER BY created_at DESC
        `,
        [req.user.id]
      );

      for (const order of orders) {
        const [items] = await pool.query(
          `
            SELECT *
            FROM order_items
            WHERE order_id = ?
            ORDER BY id ASC
          `,
          [order.id]
        );

        order.items = items;
      }

      return res.json({
        orders,
      });
    } catch (e) {
      next(e);
    }
  }
);

/* =========================================================
   ADMIN - ALL ORDERS
   ========================================================= */

router.get(
  "/admin/all",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const [orders] = await pool.query(
        `
          SELECT *
          FROM orders
          ORDER BY created_at DESC
          LIMIT 500
        `
      );

      for (const order of orders) {
        const [items] = await pool.query(
          `
            SELECT *
            FROM order_items
            WHERE order_id = ?
            ORDER BY id ASC
          `,
          [order.id]
        );

        order.items = items;
      }

      return res.json({
        orders,
      });
    } catch (e) {
      next(e);
    }
  }
);

/* =========================================================
   GET ORDER BY ORDER NUMBER
   ========================================================= */

router.get(
  "/:orderNumber",
  async (req, res, next) => {
    try {
      const [orders] = await pool.query(
        `
          SELECT *
          FROM orders
          WHERE order_number = ?
        `,
        [req.params.orderNumber]
      );

      if (!orders.length) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      const [items] = await pool.query(
        `
          SELECT *
          FROM order_items
          WHERE order_id = ?
          ORDER BY id ASC
        `,
        [orders[0].id]
      );

      return res.json({
        order: {
          ...orders[0],
          items,
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

/* =========================================================
   GET ORDER BY ORDER NUMBER + PHONE
   ========================================================= */

router.get("/", async (req, res, next) => {
  try {
    if (req.query.order && req.query.phone) {
      const [orders] = await pool.query(
        `
          SELECT *
          FROM orders
          WHERE order_number = ?
          AND phone = ?
        `,
        [
          req.query.order,
          String(req.query.phone).trim(),
        ]
      );

      if (!orders.length) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      const [items] = await pool.query(
        `
          SELECT *
          FROM order_items
          WHERE order_id = ?
          ORDER BY id ASC
        `,
        [orders[0].id]
      );

      return res.json({
        order: {
          ...orders[0],
          items,
        },
      });
    }

    return res.status(401).json({
      message: "Authentication required",
    });
  } catch (e) {
    next(e);
  }
});

// =========================================================
// ADMIN: UPDATE PAYMENT STATUS
// =========================================================

router.patch(
  "/:orderNumber/payment-status",
  requireAdmin,
  async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const { paymentStatus } = req.body;

      const status = String(paymentStatus || "")
        .trim()
        .toUpperCase();

      const allowedStatuses = [
        "PENDING",
        "PAID",
        "FAILED",
        "REFUNDED"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid payment status"
        });
      }

      const [result] = await pool.query(
        `
        UPDATE orders
        SET
          payment_status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE order_number = ?
        `,
        [status, orderNumber]
      );

      if (!result.affectedRows) {
        return res.status(404).json({
          ok: false,
          message: "Order not found"
        });
      }

      return res.json({
        ok: true,
        message: "Payment status updated successfully",
        paymentStatus: status
      });

    } catch (error) {
      console.error(
        "PAYMENT STATUS ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        message: "Could not update payment status"
      });
    }
  }
);

export default router;
