const Razorpay = require("razorpay");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({
        success: false,
        error: "Missing Razorpay environment variables",
      });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const amount = Number(body.amount || 0);
    const receipt = body.receipt || `receipt_${Date.now()}`;
    const notes = body.notes || {};

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valid amount is required",
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt,
      notes,
    });

    return res.status(200).json({
      success: true,
      key: keyId,
      order,
    });
  } catch (error) {
    console.error("CREATE_ORDER_ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error?.description || error?.message || "Failed to create order",
    });
  }
};