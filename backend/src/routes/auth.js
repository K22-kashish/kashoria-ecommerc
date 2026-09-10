import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req,res,next)=>{
  try {
    const {name,email,password,phone=""} = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 6)
      return res.status(400).json({message:"Name, valid email and password (minimum 6 characters) are required"});
    const normalized=email.trim().toLowerCase();
    const [exists]=await pool.query("SELECT id FROM users WHERE email=?", [normalized]);
    if(exists.length) return res.status(409).json({message:"An account with this email already exists"});
    const hash=await bcrypt.hash(password,12);
    const [r]=await pool.query("INSERT INTO users(name,email,password_hash,phone) VALUES(?,?,?,?)",[name.trim(),normalized,hash,phone]);
    const user={id:r.insertId,name:name.trim(),email:normalized,role:"customer"};
    res.status(201).json({user,token:signToken(user)});
  }catch(e){next(e)}
});

router.post("/login", async(req,res,next)=>{
  try{
    const {email,password}=req.body;
    const [rows]=await pool.query("SELECT * FROM users WHERE email=?",[(email||"").trim().toLowerCase()]);
    if(!rows.length || !(await bcrypt.compare(password||"",rows[0].password_hash)))
      return res.status(401).json({message:"Email or password is incorrect"});
    const u=rows[0];
    const user={id:u.id,name:u.name,email:u.email,role:u.role,phone:u.phone};
    res.json({user,token:signToken(user)});
  }catch(e){next(e)}
});

router.get("/me",requireAuth,async(req,res,next)=>{
  try{
    const [rows]=await pool.query("SELECT id,name,email,role,phone,address,city,pincode,created_at FROM users WHERE id=?",[req.user.id]);
    if(!rows.length)return res.status(404).json({message:"User not found"});
    res.json({user:rows[0]});
  }catch(e){next(e)}
});

router.put("/me",requireAuth,async(req,res,next)=>{
  try{
    const {name,phone,address,city,pincode}=req.body;
    await pool.query("UPDATE users SET name=?,phone=?,address=?,city=?,pincode=? WHERE id=?",
      [name?.trim(),phone||null,address||null,city||null,pincode||null,req.user.id]);
    const [rows]=await pool.query("SELECT id,name,email,role,phone,address,city,pincode FROM users WHERE id=?",[req.user.id]);
    res.json({user:rows[0]});
  }catch(e){next(e)}
});

export default router;
