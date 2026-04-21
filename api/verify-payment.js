import crypto from "crypto";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        route: "/api/verify-payment",
        hasKeySecret: Boolean(process.env.RAZORPAY_KEY_SECRET),
        message: "Verify-payment API is reachable",
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed",
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: "Missing Razorpay secret",
      });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const orderId = body.order_id;
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        error: "Missing verification fields",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const verified = expectedSignature === signature;

    return res.status(200).json({
      success: true,
      verified,
      paymentId,
      orderId,
    });
  } catch (error) {
    console.error("VERIFY_PAYMENT_FATAL:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Verification failed",
    });
  }
}