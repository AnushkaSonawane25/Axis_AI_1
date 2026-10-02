import { NextRequest, NextResponse } from "next/server";

export interface ShopkeeperCounterOrder {
  token: string;
  orderNumber: string;
  receivedAt: string;
  customerName: string;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryTimeText?: string | null;
  items: Array<{
    spokenText?: string;
    englishCorrelation?: string;
    productName: string;
    quantity: number | string;
    unit?: string | null;
    lineTotalFormatted?: string;
  }>;
  totalFormatted: string;
  status: "RECEIVED_AT_COUNTER" | "PACKING" | "READY_FOR_DELIVERY" | "DISPATCHED";
  estimatedPackingMins: number;
  counterNotes?: string;
  source: "voice" | "web" | "app";
}

// In-memory counter state for real-time demonstration
const counterOrders: ShopkeeperCounterOrder[] = [
  {
    token: "COUNTER-TKN-1001",
    orderNumber: "ORD-942104",
    receivedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    customerName: "Priya Sharma",
    customerPhone: "+91 98765 43210",
    deliveryAddress: "Flat 402, Shanti Vihar",
    deliveryTimeText: "aaj shaam tak",
    items: [
      {
        spokenText: "2 kilo atta",
        englishCorrelation: "Atta",
        productName: "Aashirvaad Shuddh Chakki Atta (5 kg)",
        quantity: "2 kg",
        lineTotalFormatted: "₹104.00",
      },
      {
        spokenText: "adha kilo cheeni",
        englishCorrelation: "Sugar",
        productName: "Madhur Pure & Hygienic Sugar (1 kg)",
        quantity: "0.5 kg",
        lineTotalFormatted: "₹26.00",
      },
    ],
    totalFormatted: "₹130.00",
    status: "PACKING",
    estimatedPackingMins: 10,
    counterNotes: "Customer requested clean packing bag.",
    source: "voice",
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const orderNumber =
      body.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;
    const token = `COUNTER-TKN-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCounterOrder: ShopkeeperCounterOrder = {
      token,
      orderNumber,
      receivedAt: new Date().toISOString(),
      customerName: body.customerName || "Customer (Voice Order)",
      customerPhone: body.customerPhone || null,
      deliveryAddress: body.deliveryAddress || null,
      deliveryTimeText: body.deliveryTimeText || "Immediate / ASAP",
      items: (body.items || []).map((it: any) => ({
        spokenText: it.raw_text || it.rawText || it.spoken_term,
        englishCorrelation: it.english_correlation || it.englishCorrelation,
        productName:
          it.productName ||
          it.productNameSnapshot ||
          it.english_correlation ||
          it.raw_text ||
          "Grocery Item",
        quantity: it.quantity ? `${it.quantity} ${it.unit || ""}`.trim() : "1 pc",
        unit: it.unit || null,
        lineTotalFormatted: it.lineTotalFormatted || "₹" + (it.lineTotalPaise ? (it.lineTotalPaise / 100).toFixed(2) : "0.00"),
      })),
      totalFormatted: body.totalFormatted || (body.totalPaise ? `₹${(body.totalPaise / 100).toFixed(2)}` : "Estimated at counter"),
      status: "RECEIVED_AT_COUNTER",
      estimatedPackingMins: Math.floor(15 + Math.random() * 10),
      counterNotes: body.specialInstructions || body.special_notes || "Received via AI Voice Intake",
      source: body.source || "voice",
    };

    // Prepend to recent list
    counterOrders.unshift(newCounterOrder);
    if (counterOrders.length > 20) {
      counterOrders.pop();
    }

    return NextResponse.json({
      success: true,
      message: "Order successfully transmitted to Shopkeeper Counter!",
      counterReceipt: {
        token,
        orderNumber,
        status: newCounterOrder.status,
        estimatedPackingMins: newCounterOrder.estimatedPackingMins,
        counterMessage: `Dukaandar ke counter par aawaz se naya order receive ho gaya hai (#${token})`,
        receivedAt: newCounterOrder.receivedAt,
      },
      order: newCounterOrder,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to dispatch order to shopkeeper counter", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    counterName: "Prasad Kirana & General Store - Counter Terminal 01",
    totalQueued: counterOrders.length,
    activeOrders: counterOrders,
  });
}
