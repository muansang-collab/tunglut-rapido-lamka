import Razorpay from "razorpay";

export default async function handler(req, res) {
  console.log("API HIT: create-order");

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    console.log("KEY:", process.env.RAZORPAY_KEY_ID);

    const order = await razorpay.orders.create({
      amount: 100 * 100,
      currency: "INR",
    });

    console.log("ORDER CREATED:", order.id);

    res.status(200).json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}