import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as schema from "./db/schema";
import { eq } from "drizzle-orm";

dotenv.config();

async function seed() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5434/hinglish_orders";

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    console.log("Seeding database...");

    const shopkeeperEmail = process.env.SHOPKEEPER_EMAIL || "shopkeeper@example.com";
    const shopkeeperPassword = process.env.SHOPKEEPER_PASSWORD || "KiranaShop@2026!";
    const shopkeeperName = process.env.SHOPKEEPER_NAME || "Ram Prasad Kirana";
    const shopName = process.env.SHOP_NAME || "Prasad Kirana & General Store";
    const shopSlug = process.env.SHOP_SLUG || "prasad-kirana";
    const shopPhone = process.env.SHOP_PHONE || "+91 98765 43210";
    const shopAddress =
      process.env.SHOP_ADDRESS ||
      "Shop No. 4, Main Market, Subhash Nagar, Delhi - 110027";

    const passwordHash = await bcrypt.hash(shopkeeperPassword, 10);

    // 1. Upsert shopkeeper user
    let [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, shopkeeperEmail))
      .limit(1);

    if (!user) {
      const [newUser] = await db
        .insert(schema.users)
        .values({
          name: shopkeeperName,
          email: shopkeeperEmail,
          passwordHash,
          role: "shopkeeper",
          phone: shopPhone,
          address: shopAddress,
          acceptedTermsVersion: "1.0",
          acceptedTermsAt: new Date(),
        })
        .returning();
      user = newUser;
      console.log(`Created shopkeeper user: ${user.email} (ID: ${user.id})`);
    } else {
      console.log(`Shopkeeper user already exists: ${user.email}`);
    }

    // 2. Upsert shop
    let [shop] = await db
      .select()
      .from(schema.shops)
      .where(eq(schema.shops.slug, shopSlug))
      .limit(1);

    if (!shop) {
      const [newShop] = await db
        .insert(schema.shops)
        .values({
          ownerId: user.id,
          name: shopName,
          slug: shopSlug,
          phone: shopPhone,
          address: shopAddress,
          deliveryNotes: "Free delivery within 2km on orders above ₹300. Orders delivered in 30-45 minutes.",
          isActive: true,
        })
        .returning();
      shop = newShop;
      console.log(`Created shop: ${shop.name} (/s/${shop.slug})`);
    } else {
      console.log(`Shop already exists: ${shop.name} (/s/${shop.slug})`);
    }

    // 3. Clear existing catalog for clean re-seed
    await db.delete(schema.products).where(eq(schema.products.shopId, shop.id));

    // 4. Products list
    const catalog = [
      {
        name: "Aashirvaad Shudh Chakki Atta",
        brand: "Aashirvaad",
        category: "Flours & Grains",
        packSize: "5 kg",
        unit: "kg",
        pricePaise: 23000,
        stockQty: "20.00",
        aliases: ["aashirvaad aata", "chakki atta", "wheat flour", "aata", "gehun ka atta", "atta"],
      },
      {
        name: "Aashirvaad Shudh Chakki Atta",
        brand: "Aashirvaad",
        category: "Flours & Grains",
        packSize: "10 kg",
        unit: "kg",
        pricePaise: 44000,
        stockQty: "15.00",
        aliases: ["atta 10kg", "10 kilo aata", "chakki atta 10kg"],
      },
      {
        name: "Fortune Sunlite Refined Sunflower Oil",
        brand: "Fortune",
        category: "Edible Oils",
        packSize: "1 L",
        unit: "l",
        pricePaise: 14500,
        stockQty: "25.00",
        aliases: ["fortune sunflower oil", "sunflower oil", "sunflower tel", "refined tel", "sunflower 1L", "tel"],
      },
      {
        name: "Fortune Sunlite Refined Sunflower Oil",
        brand: "Fortune",
        category: "Edible Oils",
        packSize: "5 L",
        unit: "l",
        pricePaise: 69000,
        stockQty: "10.00",
        aliases: ["sunflower 5L", "fortune sunflower 5 litre", "refined tel 5L", "sunflower oil 5l"],
      },
      {
        name: "Fortune Kachi Ghani Pure Mustard Oil",
        brand: "Fortune",
        category: "Edible Oils",
        packSize: "1 L",
        unit: "l",
        pricePaise: 16500,
        stockQty: "30.00",
        aliases: ["mustard oil", "sarson tel", "sarso tel", "mustrad tel", "kachi ghani sarson", "tel"],
      },
      {
        name: "Fortune Kachi Ghani Pure Mustard Oil",
        brand: "Fortune",
        category: "Edible Oils",
        packSize: "5 L",
        unit: "l",
        pricePaise: 79000,
        stockQty: "8.00",
        aliases: ["sarson tel 5L", "mustard oil 5 litre", "sarso 5L", "mustard 5l"],
      },
      {
        name: "Gemini Pure Groundnut Oil",
        brand: "Gemini",
        category: "Edible Oils",
        packSize: "1 L",
        unit: "l",
        pricePaise: 19500,
        stockQty: "15.00",
        aliases: ["groundnut oil", "moongfali tel", "mungfali tel", "peanut oil", "tel"],
      },
      {
        name: "Gemini Pure Groundnut Oil",
        brand: "Gemini",
        category: "Edible Oils",
        packSize: "5 L",
        unit: "l",
        pricePaise: 92000,
        stockQty: "5.00",
        aliases: ["groundnut 5L", "moongfali tel 5 litre", "peanut oil 5L"],
      },
      {
        name: "Madhur Pure & Hygienic Sugar",
        brand: "Madhur",
        category: "Sugar & Sweeteners",
        packSize: "1 kg",
        unit: "kg",
        pricePaise: 4800,
        stockQty: "50.00",
        aliases: ["sugar", "cheeni", "chini", "shakkar", "madhur sugar"],
      },
      {
        name: "Madhur Pure & Hygienic Sugar",
        brand: "Madhur",
        category: "Sugar & Sweeteners",
        packSize: "5 kg",
        unit: "kg",
        pricePaise: 23500,
        stockQty: "20.00",
        aliases: ["sugar 5kg", "5 kilo cheeni", "shakkar 5kg"],
      },
      {
        name: "Amul Butter Pasteurized",
        brand: "Amul",
        category: "Dairy",
        packSize: "100 g",
        unit: "g",
        pricePaise: 5800,
        stockQty: "30.00",
        aliases: ["amul butter", "butter", "makhan", "amul makhan", "butter 100g"],
      },
      {
        name: "Amul Butter Pasteurized",
        brand: "Amul",
        category: "Dairy",
        packSize: "500 g",
        unit: "g",
        pricePaise: 27500,
        stockQty: "15.00",
        aliases: ["amul butter 500g", "bada butter", "adha kilo butter"],
      },
      {
        name: "India Gate Basmati Rice Feast Rozzana",
        brand: "India Gate",
        category: "Flours & Grains",
        packSize: "1 kg",
        unit: "kg",
        pricePaise: 9500,
        stockQty: "25.00",
        aliases: ["basmati rice", "india gate rice", "chawal", "rozzana chawal", "rice"],
      },
      {
        name: "India Gate Basmati Rice Feast Rozzana",
        brand: "India Gate",
        category: "Flours & Grains",
        packSize: "5 kg",
        unit: "kg",
        pricePaise: 46000,
        stockQty: "10.00",
        aliases: ["basmati 5kg", "5 kilo chawal", "rice 5kg"],
      },
      {
        name: "Tata Salt Vacuum Evaporated",
        brand: "Tata",
        category: "Spices & Seasoning",
        packSize: "1 kg",
        unit: "kg",
        pricePaise: 2800,
        stockQty: "60.00",
        aliases: ["tata namak", "namak", "salt", "tata salt"],
      },
      {
        name: "Tata Tea Premium Desh Ki Chai",
        brand: "Tata Tea",
        category: "Beverages",
        packSize: "250 g",
        unit: "g",
        pricePaise: 14000,
        stockQty: "20.00",
        aliases: ["tata chai", "tata tea", "chai patti", "tea", "chai"],
      },
      {
        name: "Tata Tea Premium Desh Ki Chai",
        brand: "Tata Tea",
        category: "Beverages",
        packSize: "500 g",
        unit: "g",
        pricePaise: 27000,
        stockQty: "15.00",
        aliases: ["tata tea 500g", "chai patti adha kilo"],
      },
      {
        name: "Tata Sampann Unpolished Toor Dal",
        brand: "Tata Sampann",
        category: "Pulses & Dal",
        packSize: "1 kg",
        unit: "kg",
        pricePaise: 17500,
        stockQty: "25.00",
        aliases: ["toor dal", "arhar dal", "tuvar dal", "arhar ki daal", "tata toor dal", "daal"],
      },
      {
        name: "Tata Sampann Unpolished Moong Dal Dhuli",
        brand: "Tata Sampann",
        category: "Pulses & Dal",
        packSize: "1 kg",
        unit: "kg",
        pricePaise: 14000,
        stockQty: "20.00",
        aliases: ["moong dal", "mung dal", "yellow moong", "moong dhuli", "daal"],
      },
      {
        name: "Everest Turmeric Powder (Haldi)",
        brand: "Everest",
        category: "Spices & Seasoning",
        packSize: "200 g",
        unit: "g",
        pricePaise: 6200,
        stockQty: "25.00",
        aliases: ["haldi", "turmeric", "everest haldi", "haldi powder"],
      },
      {
        name: "Everest Red Chilli Powder (Lal Mirch)",
        brand: "Everest",
        category: "Spices & Seasoning",
        packSize: "200 g",
        unit: "g",
        pricePaise: 8800,
        stockQty: "25.00",
        aliases: ["lal mirch", "chilli powder", "mirchi powder", "everest mirch"],
      },
      {
        name: "Everest Coriander Powder (Dhaniya)",
        brand: "Everest",
        category: "Spices & Seasoning",
        packSize: "200 g",
        unit: "g",
        pricePaise: 6400,
        stockQty: "25.00",
        aliases: ["dhaniya powder", "coriander powder", "pisa dhaniya", "dhaniya"],
      },
      {
        name: "Maggi 2-Minute Instant Noodles",
        brand: "Nestle Maggi",
        category: "Packaged Food",
        packSize: "Pack of 4 (280 g)",
        unit: "pack",
        pricePaise: 5600,
        stockQty: "40.00",
        aliases: ["maggi", "maggi noodles", "maggie", "instant noodles", "noodles"],
      },
      // Zero stock products for testing OUT_OF_STOCK and in-stock alternative recommendations:
      {
        name: "Amul Taaza Homogenised Toned Milk",
        brand: "Amul",
        category: "Dairy",
        packSize: "1 L",
        unit: "l",
        pricePaise: 7200,
        stockQty: "0.00", // OUT OF STOCK
        aliases: ["amul doodh", "toned milk", "taaza doodh", "doodh", "milk", "amul milk"],
      },
      {
        name: "Saffola Gold Pro Healthy Edible Oil",
        brand: "Saffola",
        category: "Edible Oils",
        packSize: "1 L",
        unit: "l",
        pricePaise: 18000,
        stockQty: "0.00", // OUT OF STOCK
        aliases: ["saffola oil", "saffola gold", "saffola tel", "saffola"],
      },
    ];

    for (const item of catalog) {
      const [insertedProduct] = await db
        .insert(schema.products)
        .values({
          shopId: shop.id,
          name: item.name,
          brand: item.brand,
          category: item.category,
          packSize: item.packSize,
          unit: item.unit,
          pricePaise: item.pricePaise,
          stockQty: item.stockQty,
          isActive: true,
        })
        .returning();

      for (const alias of item.aliases) {
        await db.insert(schema.productAliases).values({
          productId: insertedProduct.id,
          alias,
        });
      }
    }

    console.log(`Seeded ${catalog.length} products with aliases for shop ${shop.name}.`);
    console.log("Seeding complete!");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
