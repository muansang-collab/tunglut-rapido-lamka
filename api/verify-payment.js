const crypto = require("crypto");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: "Missing Razorpay secret",
      });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const { order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing verification fields",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const verified = expectedSignature === razorpay_signature;

    return res.status(200).json({
      success: verified,
      verified,
    });
  } catch (error) {
    console.error("VERIFY_PAYMENT_ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Verification failed",
    });
  }
};