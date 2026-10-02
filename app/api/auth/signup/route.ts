import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.enum(["customer", "shopkeeper"]),
  phone: z.string().optional(),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms and Privacy Policy" }),
  }),
  // Shop details if role === 'shopkeeper'
  shopName: z.string().optional(),
  shopSlug: z.string().optional(),
  shopPhone: z.string().optional(),
  shopAddress: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      password,
      role,
      phone,
      shopName,
      shopSlug,
      shopPhone,
      shopAddress,
    } = parsed.data;

    // Check if email already exists
    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create user and optionally shop in a single transaction
    const result = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(schema.users)
        .values({
          name,
          email: email.toLowerCase(),
          passwordHash,
          role,
          phone: phone || null,
          acceptedTermsVersion: "1.0",
          acceptedTermsAt: new Date(),
        })
        .returning();

      let createdShop: schema.Shop | null = null;
      if (role === "shopkeeper") {
        const finalShopName = shopName || `${name}'s Kirana`;
        const baseSlug = (shopSlug || finalShopName)
          .toLowerCase()
          .replace(/[^\w-]/g, "-")
          .replace(/--+/g, "-")
          .replace(/^-|-$/g, "");
        const finalSlug = baseSlug || `shop-${newUser.id.substring(0, 8)}`;

        const [shop] = await tx
          .insert(schema.shops)
          .values({
            ownerId: newUser.id,
            name: finalShopName,
            slug: finalSlug,
            phone: shopPhone || phone || null,
            address: shopAddress || null,
            deliveryNotes: "Contact shopkeeper for delivery details.",
            isActive: true,
          })
          .returning();
        createdShop = shop;
      }

      return { user: newUser, shop: createdShop };
    });

    // Create session token
    const token = await createSession(result.user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      shop: result.shop,
    });

    const isSecure =
      process.env.NODE_ENV === "production" ||
      process.env.SESSION_SECURE_COOKIE === "true";

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
