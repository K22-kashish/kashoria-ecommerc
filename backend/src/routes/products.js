import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router=Router();

router.get("/",async(req,res,next)=>{
  try{
    const {category,search,limit=100}=req.query;
    let sql="SELECT id,name,category,image,price,badge,rating,stock,description,options_json FROM products WHERE active=1";
    const args=[];
    if(category){sql+=" AND category=?";args.push(category)}
    if(search){sql+=" AND (name LIKE ? OR category LIKE ?)";args.push(`%${search}%`,`%${search}%`)}
    sql+=" ORDER BY created_at DESC LIMIT ?";
    args.push(Math.min(Number(limit)||100,500));
    const [rows]=await pool.query(sql,args);res.json({products:rows});
  }catch(e){next(e)}
});

router.get("/:id",async(req,res,next)=>{
  try{
    const [rows]=await pool.query("SELECT id,name,category,image,price,badge,rating,stock,description,options_json FROM products WHERE id=? AND active=1",[req.params.id]);
    if(!rows.length)return res.status(404).json({message:"Product not found"});
    res.json({product:rows[0]});
  }catch(e){next(e)}
});

router.post("/",requireAuth,requireAdmin,async(req,res,next)=>{
  try{
    const {id,name,category,image,price,badge="",rating=5,stock=100,description="",options=[]}=req.body;
    if(!id||!name||!category||!image||Number(price)<0)return res.status(400).json({message:"Invalid product"});
    await pool.query("INSERT INTO products(id,name,category,image,price,badge,rating,stock,description,options_json) VALUES(?,?,?,?,?,?,?,?,?,?)",
      [id,name,category,image,price,badge,rating,stock,description,JSON.stringify(Array.isArray(options)?options:["As shown in product image","Custom colour"])]);
    res.status(201).json({product:{id,name,category,image,price,badge,rating,stock,description}});
  }catch(e){next(e)}
});

router.put("/:id",requireAuth,requireAdmin,async(req,res,next)=>{
  try{
    const {name,category,image,price,badge="",rating=5,stock=100,description="",active=true,options}=req.body;
    const [r]=await pool.query("UPDATE products SET name=?,category=?,image=?,price=?,badge=?,rating=?,stock=?,description=?,active=?,options_json=? WHERE id=?",
      [name,category,image,price,badge,rating,stock,description,active,JSON.stringify(Array.isArray(options)?options:["As shown in product image","Custom colour"]),req.params.id]);
    if(!r.affectedRows)return res.status(404).json({message:"Product not found"});
    res.json({message:"Product updated"});
  }catch(e){next(e)}
});

router.delete("/:id",requireAuth,requireAdmin,async(req,res,next)=>{
  try{
    const [r]=await pool.query("UPDATE products SET active=0 WHERE id=?",[req.params.id]);
    if(!r.affectedRows)return res.status(404).json({message:"Product not found"});
    res.json({message:"Product deleted"});
  }catch(e){next(e)}
});

export default router;
