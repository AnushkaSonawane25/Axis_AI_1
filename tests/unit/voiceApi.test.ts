import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as handleShopkeeperPost, GET as handleShopkeeperGet } from "../../app/api/mock-shopkeeper/route";
import { POST as handleOrderPost } from "../../app/api/order/route";

describe("Voice Order & Shopkeeper Counter API Integration", () => {
  it("Shopkeeper Counter receives order payload and assigns token & packing time", async () => {
    const payload = {
      orderNumber: "TEST-ORD-001",
      customerName: "Vikram Malhotra",
      customerPhone: "+91 98765 00000",
      deliveryAddress: "Shop 12, Main Market",
      deliveryTimeText: "kal subah tak",
      items: [
        {
          raw_text: "2 kilo atta",
          spoken_term: "atta",
          english_correlation: "Atta",
          quantity: 2,
          unit: "kg",
          lineTotalFormatted: "₹92.00",
        },
        {
          raw_text: "adha kilo cheeni",
          spoken_term: "cheeni",
          english_correlation: "Sugar",
          quantity: 0.5,
          unit: "kg",
          lineTotalFormatted: "₹24.00",
        },
      ],
      totalFormatted: "₹116.00",
      source: "voice",
    };

    const req = new NextRequest("http://localhost:3000/api/mock-shopkeeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await handleShopkeeperPost(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.counterReceipt.token).toMatch(/^COUNTER-TKN-\d{4}$/);
    expect(json.counterReceipt.status).toBe("RECEIVED_AT_COUNTER");
    expect(json.counterReceipt.estimatedPackingMins).toBeGreaterThan(0);
    expect(json.order.items.length).toBe(2);
  });

  it("Shopkeeper Counter GET returns queue and online terminal status", async () => {
    const res = await handleShopkeeperGet();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("online");
    expect(json.activeOrders.length).toBeGreaterThanOrEqual(1);
    expect(json.counterName).toContain("Prasad Kirana");
  });

  it("Voice /api/order handles transcript, extracts items & correlations without aliases", async () => {
    const transcript =
      "bhaiya 2 kilo atta, ek Amul butter aur sugar half kilo, tel bhi chahiye, kal subah tak bhej dena";

    const req = new NextRequest("http://localhost:3000/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: transcript,
        customerName: "Ananya Roy",
        customerPhone: "+91 99887 76655",
        deliveryAddress: "Flat 101, Lotus Towers",
        forwardToShopkeeper: false, // Local verification
      }),
    });

    const res = await handleOrderPost(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.orderNumber).toMatch(/^VOICE-\d+/);
    expect(json.deliveryTimeText).toBe("kal subah tak");
    expect(json.items.length).toBeGreaterThanOrEqual(4);

    // Verify correlation highlights exist for each item
    expect(json.correlationHighlights.length).toBeGreaterThanOrEqual(4);
    const sugarHighlight = json.correlationHighlights.find((c: any) =>
      c.spoken.toLowerCase().includes("sugar")
    );
    expect(sugarHighlight).toBeDefined();
    expect(sugarHighlight.english).toBe("Sugar");
  });
});
