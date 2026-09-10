import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
const router=Router();

router.post("/",async(req,res,next)=>{
 try{
  const {name,email,phone="",message}=req.body;
  if(!name?.trim()||!email?.trim()||!message?.trim())return res.status(400).json({message:"Name, email and message are required"});
  await pool.query("INSERT INTO contacts(name,email,phone,message) VALUES(?,?,?,?)",[name.trim(),email.trim().toLowerCase(),phone,message.trim()]);
  res.status(201).json({message:"Message received. Thank you for contacting KASHORIA."});
 }catch(e){next(e)}
});

router.get("/",requireAuth,requireAdmin,async(req,res,next)=>{
 try{const [rows]=await pool.query("SELECT * FROM contacts ORDER BY created_at DESC");res.json({contacts:rows})}catch(e){next(e)}
});
export default router;
