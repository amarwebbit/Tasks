import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, couponCode, userId } = body;

    if (!['MONTHLY', 'ANNUAL'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const basePrice = plan === 'MONTHLY' ? 99 : 399;
    let finalPrice = basePrice;
    let discountAmount = 0;
    let appliedCoupon: any = null;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate coupon code if provided
    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      const { data: coupon, error: couponErr } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cleanCode)
        .single();

      if (coupon && coupon.is_active) {
        const isNotExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        const hasUsesLeft = coupon.max_uses > coupon.used_count;

        if (isNotExpired && hasUsesLeft) {
          appliedCoupon = coupon;
          if (coupon.discount_type === 'PERCENTAGE') {
            discountAmount = Math.round((basePrice * coupon.discount_value) / 100);
          } else {
            discountAmount = Math.min(basePrice, coupon.discount_value);
          }
          finalPrice = Math.max(0, basePrice - discountAmount);
        }
      }
    }

    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    // If final price is 0 (e.g. 100% coupon)
    if (finalPrice === 0) {
      const orderId = `free_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return NextResponse.json({
        success: true,
        orderId,
        amount: 0,
        currency: 'INR',
        plan,
        discountAmount,
        couponCode: appliedCoupon?.code || null,
        isFree: true,
      });
    }

    let orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Create real Razorpay order if keys are set
    if (razorpayKeyId && razorpayKeySecret) {
      const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          amount: Math.round(finalPrice * 100), // In paise
          currency: 'INR',
          receipt: `rcpt_${Date.now().toString().slice(-8)}`,
          notes: {
            plan,
            userId: userId || 'unknown',
            coupon: appliedCoupon?.code || 'none',
          },
        }),
      });

      if (rzpRes.ok) {
        const orderData = await rzpRes.json();
        orderId = orderData.id;
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      amount: finalPrice,
      amountInPaise: Math.round(finalPrice * 100),
      currency: 'INR',
      plan,
      discountAmount,
      couponCode: appliedCoupon?.code || null,
      keyId: razorpayKeyId || 'rzp_test_trinetra_demo',
      isFree: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
