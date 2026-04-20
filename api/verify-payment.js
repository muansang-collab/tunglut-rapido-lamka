import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (!order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing payment verification fields",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    return res.status(200).json({
      success: isValid,
      verified: isValid,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || "Verification failed",
    });
  }
}