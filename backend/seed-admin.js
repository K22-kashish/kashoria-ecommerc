import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pool } from "./src/db.js";
dotenv.config();

const email=(process.env.ADMIN_EMAIL||"").trim().toLowerCase();
const password=process.env.ADMIN_PASSWORD||"";
if(!email||!password||password==="change_this_password"){
  console.error("Set ADMIN_EMAIL and a strong ADMIN_PASSWORD in .env first.");
  process.exit(1);
}
const hash=await bcrypt.hash(password,12);
await pool.query(
 `INSERT INTO users(name,email,password_hash,role)
  VALUES('KASHORIA Admin',?,?, 'admin')
  ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),role='admin'`,
 [email,hash]
);
console.log("Admin account created/updated:",email);
await pool.end();
