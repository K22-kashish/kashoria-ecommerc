import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,9)}${path.extname(file.originalname).toLowerCase()}`)
});
const imageUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /image\/(jpeg|png|webp)/i.test(file.mimetype))
});

const defaultColors = {
  phonecharms: ['As shown in product image','Lavender','Dusty Pink','Sky Blue','Sage Green','Cream','Custom colour'],
  keychains: ['As shown in product image','Blush Pink','Lavender','Baby Blue','Butter Yellow','Sage Green','Custom colour'],
  bagcharms: ['As shown in product image','Dusty Pink','Lavender','Sage Green','Sky Blue','Cream','Custom colour'],
  hairaccessories: ['As shown in product image','Dusty Pink','Lavender','Butter Yellow','Sage Green','Baby Blue','Custom colour'],
  bouquets: ['As shown in product image','Pink & Cream','Lavender & White','Peach & Cream','Blue & White','Pastel Mix','Custom colour'],
  phonecases: ['As shown in product image','Blush Pink','Lavender','Sage Green','Sky Blue','Cream','Custom colour'],
  flowers: ['As shown in product image','Red','Pink','Yellow','Lavender','White','Custom colour'],
  gifts: ['As shown in product image','Blush Pink','Lavender','Sky Blue','Sage Green','Cream','Custom colour']
};
function colorsFor(row) {
  let colors = row.options_json;
  if (typeof colors === 'string') { try { colors = JSON.parse(colors); } catch { colors = null; } }
  if (!Array.isArray(colors) || !colors.length) colors = defaultColors[row.category] || defaultColors.gifts;
  colors = colors.map(String).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i && v !== 'Custom colour');
  return [...colors, 'Custom colour'];
}

router.get('/products/:id/options', async (req,res,next)=>{
  try {
    const [rows] = await pool.query('SELECT id,category,options_json FROM products WHERE id=? AND active=1',[req.params.id]);
    if (!rows.length) return res.status(404).json({message:'Product not found'});
    res.json({productId: rows[0].id, colors: colorsFor(rows[0])});
  } catch(e){ next(e); }
});

router.put('/products/:id/options', requireAuth, requireAdmin, async (req,res,next)=>{
  try {
    const colors = Array.isArray(req.body.colors) ? req.body.colors.map(x=>String(x).trim()).filter(Boolean) : [];
    const unique = [...new Set(colors.filter(x=>x.toLowerCase() !== 'custom colour'))];
    unique.push('Custom colour');
    const [r] = await pool.query('UPDATE products SET options_json=? WHERE id=?',[JSON.stringify(unique),req.params.id]);
    if(!r.affectedRows) return res.status(404).json({message:'Product not found'});
    res.json({productId:req.params.id, colors:unique});
  } catch(e){ next(e); }
});

router.post('/upload-reference', async(req,res,next)=>{
  try {
    const data=String(req.body.dataUrl||'');
    const m=data.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/i);
    if(!m) return res.status(400).json({message:'Invalid reference image'});
    const buf=Buffer.from(m[2],'base64');
    if(buf.length>2*1024*1024) return res.status(400).json({message:'Reference image must be under 2 MB'});
    const ext=m[1].toLowerCase()==='jpeg'?'jpg':m[1].toLowerCase();
    const name=`${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    fs.writeFileSync(path.join(uploadDir,name),buf);
    res.status(201).json({url:`/uploads/${name}`});
  } catch(e){ next(e); }
});

router.post('/custom-orders', imageUpload.single('reference'), async(req,res,next)=>{
  try {
    const {name,phone,email='',productIdea,color='',quantity=1,budget='',details=''} = req.body;
    if(!name?.trim() || !phone?.trim() || !productIdea?.trim()) return res.status(400).json({message:'Name, phone and product idea are required'});
    const referenceImage = req.file ? `/uploads/${req.file.filename}` : null;
    const [r] = await pool.query(`INSERT INTO custom_orders(user_id,name,phone,email,product_idea,color,quantity,budget,details,reference_image,status) VALUES(?,?,?,?,?,?,?,?,?,?,'NEW')`,[
      req.user?.id || null,name.trim(),phone.trim(),String(email).trim().toLowerCase(),productIdea.trim(),String(color).trim(),Math.max(1,Number(quantity)||1),String(budget).trim(),String(details).trim(),referenceImage
    ]);
    res.status(201).json({message:'Custom order request received',id:r.insertId,referenceImage});
  } catch(e){ next(e); }
});

router.get('/custom-orders', requireAuth, requireAdmin, async(_req,res,next)=>{
  try { const [rows]=await pool.query('SELECT * FROM custom_orders ORDER BY created_at DESC LIMIT 500'); res.json({customOrders:rows}); }
  catch(e){ next(e); }
});
router.patch('/custom-orders/:id', requireAuth, requireAdmin, async(req,res,next)=>{
  try {
    const allowed=['NEW','CONTACTED','QUOTED','CONFIRMED','COMPLETED','CANCELLED'];
    if(!allowed.includes(req.body.status)) return res.status(400).json({message:'Invalid custom order status'});
    const [r]=await pool.query('UPDATE custom_orders SET status=? WHERE id=?',[req.body.status,req.params.id]);
    if(!r.affectedRows) return res.status(404).json({message:'Custom order not found'});
    res.json({message:'Custom order updated'});
  } catch(e){ next(e); }
});

router.post('/coupons/validate', async(req,res,next)=>{
  try {
    const code=String(req.body.code||'').trim().toUpperCase(); const subtotal=Number(req.body.subtotal)||0;
    const [rows]=await pool.query('SELECT * FROM coupons WHERE code=? AND active=1 LIMIT 1',[code]);
    if(!rows.length) return res.status(404).json({valid:false,message:'Coupon not recognised'});
    const c=rows[0]; const now=new Date();
    if(c.starts_at && now < new Date(c.starts_at) || c.ends_at && now > new Date(c.ends_at)) return res.status(400).json({valid:false,message:'Coupon is not active right now'});
    if(c.min_order && subtotal < Number(c.min_order)) return res.status(400).json({valid:false,message:`Minimum order is ₹${Number(c.min_order)}`});
    if(c.max_uses && Number(c.used_count)>=Number(c.max_uses)) return res.status(400).json({valid:false,message:'Coupon usage limit reached'});
    let discount=c.type==='percent' ? Math.round(subtotal*Number(c.value)/100) : Math.min(subtotal,Number(c.value));
    if(c.max_discount) discount=Math.min(discount,Number(c.max_discount));
    res.json({valid:true,code:c.code,discount,label:c.label || (c.type==='percent'?`${c.value}% off`:`₹${c.value} off`)});
  } catch(e){ next(e); }
});
router.post('/coupons', requireAuth, requireAdmin, async(req,res,next)=>{
  try {
    const {code,type,value,minOrder=0,maxDiscount=null,maxUses=null,label='',active=true}=req.body;
    if(!code || !['percent','flat'].includes(type) || Number(value)<=0) return res.status(400).json({message:'Invalid coupon'});
    await pool.query('INSERT INTO coupons(code,type,value,min_order,max_discount,max_uses,label,active) VALUES(?,?,?,?,?,?,?,?)',[String(code).trim().toUpperCase(),type,Number(value),Number(minOrder)||0,maxDiscount===null?null:Number(maxDiscount),maxUses===null?null:Number(maxUses),String(label),!!active]);
    res.status(201).json({message:'Coupon created'});
  } catch(e){ next(e); }
});
router.get('/coupons', requireAuth, requireAdmin, async(_req,res,next)=>{
  try { const [rows]=await pool.query('SELECT * FROM coupons ORDER BY created_at DESC'); res.json({coupons:rows}); }
  catch(e){ next(e); }
});
router.patch('/coupons/:id', requireAuth, requireAdmin, async(req,res,next)=>{
  try { const [r]=await pool.query('UPDATE coupons SET active=? WHERE id=?',[!!req.body.active,req.params.id]); if(!r.affectedRows)return res.status(404).json({message:'Coupon not found'}); res.json({message:'Coupon updated'}); }
  catch(e){ next(e); }
});

router.post('/reviews/:productId', imageUpload.single('photo'), async(req,res,next)=>{
  try {
    const {name,rating,text}=req.body; const r=Number(rating);
    if(!name?.trim()||!text?.trim()||r<1||r>5)return res.status(400).json({message:'Name, review and rating 1-5 are required'});
    const [p]=await pool.query('SELECT id FROM products WHERE id=? AND active=1',[req.params.productId]); if(!p.length)return res.status(404).json({message:'Product not found'});
    const photoUrl=req.file?`/uploads/${req.file.filename}`:null;
    await pool.query('INSERT INTO reviews(product_id,user_id,reviewer_name,rating,review_text,photo_url) VALUES(?,?,?,?,?,?)',[req.params.productId,req.user?.id||null,name.trim(),r,text.trim(),photoUrl]);
    res.status(201).json({message:'Review submitted',photoUrl});
  } catch(e){ next(e); }
});

router.get('/admin/stats', requireAuth, requireAdmin, async(_req,res,next)=>{
  try {
    const [[products]] = await pool.query('SELECT COUNT(*) count FROM products WHERE active=1');
    const [[orders]] = await pool.query('SELECT COUNT(*) count FROM orders');
    const [[sales]] = await pool.query("SELECT COALESCE(SUM(total),0) total FROM orders WHERE payment_status='PAID' OR payment_method='COD'");
    const [[open]] = await pool.query("SELECT COUNT(*) count FROM orders WHERE order_status NOT IN ('DELIVERED','CANCELLED')");
    const [[custom]] = await pool.query("SELECT COUNT(*) count FROM custom_orders WHERE status NOT IN ('COMPLETED','CANCELLED')");
    res.json({products:Number(products.count),orders:Number(orders.count),sales:Number(sales.total),openOrders:Number(open.count),openCustomOrders:Number(custom.count)});
  } catch(e){ next(e); }
});

router.patch('/orders/:orderNumber/tracking', requireAuth, requireAdmin, async(req,res,next)=>{
  try {
    const [r]=await pool.query('UPDATE orders SET courier=?,tracking_id=? WHERE order_number=?',[String(req.body.courier||'').trim(),String(req.body.trackingId||'').trim(),req.params.orderNumber]);
    if(!r.affectedRows)return res.status(404).json({message:'Order not found'});
    res.json({message:'Tracking details updated'});
  } catch(e){ next(e); }
});

export default router;
