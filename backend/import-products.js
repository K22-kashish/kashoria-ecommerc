
import fs from "fs";
import { pool } from "./src/db.js";

try {
  const file = new URL(
    "../netlify-site/js/store.js",
    import.meta.url
  );

  const source = fs.readFileSync(file, "utf8");

  const match = source.match(
    /window\.KASHORIA_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/
  );

  if (!match) {
    throw new Error("Product catalogue not found.");
  }

const cleanCatalogue = match[1].replace(/,\s*]/g, "]");
const products = JSON.parse(cleanCatalogue);

  if (products.length !== 89) {
    throw new Error(
      `Expected 88 products, found ${products.length}. Import stopped.`
    );
  }

  let imported = 0;
  let skipped = 0;

  for (const p of products) {
    const [result] = await pool.query(
      `INSERT IGNORE INTO products
      (id, name, category, image, price, badge,
       rating, stock, description, options_json, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        p.id,
        p.name,
        p.category.trim(),
        p.image,
        p.price,
        p.badge || "",
        p.rating || 5,
        100,
        "",
        JSON.stringify([])
      ]
    );

    if (result.affectedRows === 1) {
      imported++;
    } else {
      skipped++;
    }
  }

  console.log("Product import completed!");
  console.log("Imported:", imported);
  console.log("Skipped:", skipped);

} catch (error) {
  console.error("Import failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
