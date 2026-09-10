import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./src/db.js";
import authRoutes from "./src/routes/auth.js";
import productRoutes from "./src/routes/products.js";
import orderRoutes from "./src/routes/orders.js";
import reviewRoutes from "./src/routes/reviews.js";
import wishlistRoutes from "./src/routes/wishlist.js";
import contactRoutes from "./src/routes/contact.js";
import featureRoutes from "./src/routes/features.js";

dotenv.config();
const app=express();
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy:false,
  crossOriginResourcePolicy:{policy:"cross-origin"}
}));
const allowedOrigins = String(process.env.FRONTEND_URL || '').split(',').map(s=>s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: false
}));
app.use(morgan("dev"));

app.post("/api/webhooks/razorpay",express.raw({type:"application/json"}),async(req,res)=>{
  try{
    if(!process.env.RAZORPAY_WEBHOOK_SECRET)return res.status(503).send("Webhook not configured");
    const signature=req.headers["x-razorpay-signature"]||"";
    const expected=crypto.createHmac("sha256",process.env.RAZORPAY_WEBHOOK_SECRET).update(req.body).digest("hex");
    if(signature!==expected)return res.status(400).send("Invalid signature");
    const event=JSON.parse(req.body.toString("utf8"));
    const payment=event.payload?.payment?.entity;
    const rOrder=payment?.order_id;
    if(event.event==="payment.captured"&&rOrder){await pool.query("UPDATE orders SET payment_status='PAID',order_status='CONFIRMED',razorpay_payment_id=? WHERE razorpay_order_id=?",[payment.id,rOrder]);}
    if(event.event==="payment.failed"&&rOrder){await pool.query("UPDATE orders SET payment_status='FAILED' WHERE razorpay_order_id=?",[rOrder]);}
    res.json({received:true});
  }catch(e){console.error("Razorpay webhook:",e);res.status(400).send("Bad webhook");}
});

app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true,limit:"2mb"}));
app.use("/uploads",express.static(path.join(__dirname,"uploads")));

app.get("/api/health",async(req,res)=>{
  try{const [rows]=await pool.query("SELECT 1 AS test");res.json({ok:true,service:"KASHORIA API",database:"connected",time:new Date().toISOString()});}
  catch(e){console.error("MYSQL:",e);res.status(503).json({ok:false,message:"Database unavailable",error:e.message,code:e.code});}
});

app.use("/api/auth",authRoutes);
app.use("/api/products",productRoutes);
app.use("/api/orders",orderRoutes);
app.use("/api/reviews",reviewRoutes);
app.use("/api/wishlist",wishlistRoutes);
app.use("/api/contact",contactRoutes);
app.use("/api/features",featureRoutes);

app.use(express.static(path.join(__dirname,"public"),{extensions:["html"]}));
app.use((req,res)=>{
  if(req.path.startsWith("/api/"))return res.status(404).json({message:"API endpoint not found"});
  return res.sendFile(path.join(__dirname,"public","index.html"));
});

app.use((err,req,res,next)=>{
  console.error("SERVER ERROR:",err);
  const status=err.status||500;
  res.status(status).json({message:status===500?"Internal server error":err.message});
});

const port=Number(process.env.PORT||5000);
app.listen(port, "0.0.0.0", ()=>console.log(`KASHORIA backend running on port ${port}`));
