import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { pool, withTransaction } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { makeOrderNumber } from "../utils/order.js";

const router=Router();
const freeAt = Number(process.env.FREE_SHIPPING_AT || 1299);

function getDeliveryCharge(city = '', pincode = '', subtotal = 0) {
  if (subtotal >= freeAt) return 0;
  if (subtotal <= 0) return 0;

  const cityName = String(city || '').trim().toLowerCase();
  const pin = String(pincode || '').replace(/\D/g, '');

  // Ahmedabad
  if (
    cityName.includes('ahmedabad') ||
    pin.startsWith('380') ||
    pin.startsWith('382')
  ) {
    return 50;
  }

  // Gujarat
  const pinFirst2 = Number(pin.substring(0, 2));

  if (pin.length === 6 && pinFirst2 >= 36 && pinFirst2 <= 39) {
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

  // Other states
  return 120;
}
const giftWrapFee=40;
function getRazorpay(){if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)return null;return new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});}
async function loadProducts(conn,items){const ids=[...new Set(items.map(x=>String(x.productId||x.id||"")))];if(!ids.length)return [];const ph=ids.map(()=>"?").join(",");const [rows]=await conn.query(`SELECT * FROM products WHERE id IN (${ph}) AND active=1`,ids);return rows;}
async function couponInfo(conn,code,subtotal){if(!code)return {code:null,discount:0};const [rows]=await conn.query("SELECT * FROM coupons WHERE code=? AND active=1 LIMIT 1",[String(code).trim().toUpperCase()]);if(!rows.length){const e=new Error("Invalid coupon code");e.status=400;throw e;}const c=rows[0],now=new Date();if(c.starts_at&&now<new Date(c.starts_at)||c.ends_at&&now>new Date(c.ends_at)){const e=new Error("Coupon is not active");e.status=400;throw e;}if(Number(c.min_order)>subtotal){const e=new Error(`Minimum order for this coupon is ₹${Number(c.min_order)}`);e.status=400;throw e;}if(c.max_uses&&Number(c.used_count)>=Number(c.max_uses)){const e=new Error("Coupon usage limit reached");e.status=400;throw e;}let d=c.type==='percent'?Math.round(subtotal*Number(c.value)/100):Math.min(subtotal,Number(c.value));if(c.max_discount)d=Math.min(d,Number(c.max_discount));return {code:c.code,discount:d};}
async function createDbOrder({userId,body,paymentMethod="UPI"}){return withTransaction(async conn=>{
 const {name,phone,email,address,city,pincode}=body.customer||body;
 const cleanPincode =
  String(pincode || '').replace(/\D/g, '');

if (cleanPincode.length !== 6) {

  const e = new Error(
    "Please enter a valid 6-digit pincode."
  );

  e.status = 400;

  throw e;
}
 if(!name||!phone||!email||!address||!city||!pincode){const e=new Error("Complete delivery details are required");e.status=400;throw e;}
 const input=body.items;if(!Array.isArray(input)||!input.length){const e=new Error("Cart is empty");e.status=400;throw e;}
 const products=await loadProducts(conn,input),map=new Map(products.map(p=>[String(p.id),p]));
const normalized = input.map(x => {
  const p = map.get(String(x.productId || x.id || ""));

  if (!p) {
    const e = new Error("One or more products are unavailable");
    e.status = 400;
    throw e;
  }

  const q = Math.max(1, Math.min(1000, Number(x.quantity) || 1));

  return { p, q, x };
});
 {const e=new Error(`${p.name} has insufficient stock`);e.status=400;throw e;}return {p,q,x};});
 const subtotal=normalized.reduce((s,{p,q})=>s+Number(p.price)*q,0);
 const coupon=await couponInfo(conn,body.couponCode,subtotal);
 const giftWrap=normalized.reduce((s,{x,q})=>s+(x.giftWrap?giftWrapFee*q:0),0);
const shipping = getDeliveryCharge(city, cleanPincode, subtotal);const total=Math.max(0,subtotal-coupon.discount)+shipping+giftWrap;const orderNo=makeOrderNumber();
 const [r]=await conn.query(`INSERT INTO orders(order_number,user_id,customer_name,phone,email,address,city,cleanPincode,payment_method,payment_status,order_status,subtotal,shipping_fee,total,coupon_code,discount,gift_wrap_fee,gift_message,notes) VALUES(?,?,?,?,?,?,?,?,?,'PENDING','NEW',?,?,?,?,?,?,?,?)`,[orderNo,userId||null,name.trim(),phone,email.trim().toLowerCase(),address,city,cleanPincode,paymentMethod,subtotal,shipping,total,coupon.code,coupon.discount,giftWrap,String(body.giftMessage||""),String(body.orderNote||"")]);
 for(const {p,q,x} of normalized){const line=Number(p.price)*q;await conn.query(`INSERT INTO order_items(order_id,product_id,product_name,product_image,unit_price,quantity,line_total,color,customization_note,reference_image,gift_wrap,gift_message) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,[r.insertId,p.id,p.name,p.image,p.price,q,line,String(x.color||"As shown in product image"),String(x.note||""),String(x.referenceImage||""),!!x.giftWrap,String(x.giftMessage||"")]);}
 if(coupon.code)await conn.query("UPDATE coupons SET used_count=used_count+1 WHERE code=?",[coupon.code]);
 return {id:r.insertId,orderNumber:orderNo,subtotal,discount:coupon.discount,giftWrapFee:giftWrap,shippingFee:shipping,total};
 }  ;
router.post("/", async (req, res, next) => {

  try {

    /*
      KASHORIA accepts ONLINE PAYMENT only.
    */

    if (req.body.paymentMethod !== "UPI") {

      return res.status(400).json({
        message:
          "Only online payment is available. Cash on Delivery is not accepted."
      });

    }

    const result = await createDbOrder({
      userId: req.user?.id,
      body: req.body,
      paymentMethod: "UPI"
    });

    res.status(201).json({
      order: result
    });

  } catch (e) {

    next(e);

  }

});
router.post("/razorpay/create",async(req,res,next)=>{try{const rp=getRazorpay();if(!rp)return res.status(503).json({message:"Razorpay is not configured"});const preview=await createDbOrder({userId:req.user?.id,body:req.body,paymentMethod:"RAZORPAY"});const rOrder=await rp.orders.create({amount:Math.round(preview.total*100),currency:"INR",receipt:preview.orderNumber});await pool.query("UPDATE orders SET razorpay_order_id=? WHERE order_number=?",[rOrder.id,preview.orderNumber]);res.status(201).json({order:preview,razorpay:{id:rOrder.id,amount:rOrder.amount,currency:rOrder.currency,keyId:process.env.RAZORPAY_KEY_ID}});}catch(e){next(e)}});
router.post("/razorpay/verify",async(req,res,next)=>{try{const {razorpay_order_id,razorpay_payment_id,razorpay_signature,order_number}=req.body;if(!process.env.RAZORPAY_KEY_SECRET)return res.status(503).json({message:"Payment verification is not configured"});const expected=crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");if(!razorpay_signature||expected.length!==razorpay_signature.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(razorpay_signature)))return res.status(400).json({message:"Invalid payment signature"});await withTransaction(async conn=>{const [orders]=await conn.query("SELECT id,payment_status FROM orders WHERE order_number=? AND razorpay_order_id=? FOR UPDATE",[order_number,razorpay_order_id]);if(!orders.length){const e=new Error("Order not found");e.status=404;throw e;}if(orders[0].payment_status!=="PAID"){const [items]=await conn.query("SELECT product_id,quantity FROM order_items WHERE order_id=?",[orders[0].id]);for(const item of items){const [r]=await conn.query("UPDATE products SET stock=stock-? WHERE id=? AND stock>=?",[item.quantity,item.product_id,item.quantity]);if(!r.affectedRows){const e=new Error("Insufficient stock for a product in this order");e.status=409;throw e;}}await conn.query("UPDATE orders SET razorpay_payment_id=?,payment_status='PAID',order_status='CONFIRMED' WHERE id=?",[razorpay_payment_id,orders[0].id]);}});res.json({message:"Payment verified",orderNumber:order_number});}catch(e){next(e)}});
router.get("/mine",requireAuth,async(req,res,next)=>{try{const [orders]=await pool.query("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC",[req.user.id]);for(const o of orders){const [items]=await pool.query("SELECT * FROM order_items WHERE order_id=?",[o.id]);o.items=items;}res.json({orders});}catch(e){next(e)}});
router.get("/admin/all",requireAuth,requireAdmin,async(req,res,next)=>{try{const [orders]=await pool.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500");for(const o of orders){const [items]=await pool.query("SELECT * FROM order_items WHERE order_id=? ORDER BY id ASC",[o.id]);o.items=items;}res.json({orders});}catch(e){next(e)}});
router.get("/:orderNumber",async(req,res,next)=>{try{const [orders]=await pool.query("SELECT * FROM orders WHERE order_number=?",[req.params.orderNumber]);if(!orders.length)return res.status(404).json({message:"Order not found"});const [items]=await pool.query("SELECT * FROM order_items WHERE order_id=? ORDER BY id ASC",[orders[0].id]);res.json({order:{...orders[0],items}});}catch(e){next(e)}});
router.get("/",async(req,res,next)=>{try{if(req.query.order&&req.query.phone){const [orders]=await pool.query("SELECT * FROM orders WHERE order_number=? AND phone=?",[req.query.order,String(req.query.phone).trim()]);if(!orders.length)return res.status(404).json({message:"Order not found"});const [items]=await pool.query("SELECT * FROM order_items WHERE order_id=?",[orders[0].id]);return res.json({order:{...orders[0],items}});}if(!req.headers.authorization)return res.status(401).json({message:"Authentication required"});const auth=req.headers.authorization.slice(7);return res.status(401).json({message:"Use the admin orders endpoint with a valid token"});}catch(e){next(e)}});
router.patch("/:orderNumber/status",requireAuth,requireAdmin,async(req,res,next)=>{try{const allowed=["NEW","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED"];if(!allowed.includes(req.body.status))return res.status(400).json({message:"Invalid order status"});const [r]=await pool.query("UPDATE orders SET order_status=? WHERE order_number=?",[req.body.status,req.params.orderNumber]);if(!r.affectedRows)return res.status(404).json({message:"Order not found"});res.json({message:"Order status updated"});}catch(e){next(e)}});
export default router;
