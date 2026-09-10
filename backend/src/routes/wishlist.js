import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
const router=Router();
router.use(requireAuth);

router.get("/",async(req,res,next)=>{
 try{
  const [rows]=await pool.query(`SELECT p.id,p.name,p.category,p.image,p.price,p.badge,p.rating,p.stock
    FROM wishlist w JOIN products p ON p.id=w.product_id WHERE w.user_id=? AND p.active=1 ORDER BY w.created_at DESC`,[req.user.id]);
  res.json({wishlist:rows});
 }catch(e){next(e)}
});
router.post("/:productId",async(req,res,next)=>{
 try{await pool.query("INSERT IGNORE INTO wishlist(user_id,product_id) VALUES(?,?)",[req.user.id,req.params.productId]);res.status(201).json({message:"Added to wishlist"})}catch(e){next(e)}
});
router.delete("/:productId",async(req,res,next)=>{
 try{await pool.query("DELETE FROM wishlist WHERE user_id=? AND product_id=?",[req.user.id,req.params.productId]);res.json({message:"Removed from wishlist"})}catch(e){next(e)}
});
export default router;
