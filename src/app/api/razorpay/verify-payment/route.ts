import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      plan,
      amount,
      couponCode,
      discountApplied,
      isFree,
    } = body;

    if (!userId || !plan) {
      return NextResponse.json({ error: 'Missing userId or plan' }, { status: 400 });
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    // Verify HMAC signature if live credentials exist and not a 100% free coupon
    if (razorpayKeySecret && razorpay_signature && !isFree) {
      const generatedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate expiry
    const expiryDate = new Date();
    if (plan === 'ANNUAL') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setDate(expiryDate.getDate() + 30);
    }

    // 1. Upgrade user profile to PRO
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        plan: 'PRO',
        plan_expires_at: expiryDate.toISOString(),
      })
      .eq('id', userId);

    if (profileErr) {
      console.error('Error updating user plan:', profileErr);
    }

    // 2. Increment coupon usage if used
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .single();

      if (coupon) {
        await supabase
          .from('coupons')
          .update({
            used_count: (coupon.used_count || 0) + 1,
          })
          .eq('id', coupon.id);
      }
    }

    // 3. Record payment record
    const { error: paymentErr } = await supabase.from('payments').insert({
      user_id: userId,
      order_id: razorpay_order_id || `sim_${Date.now()}`,
      payment_id: razorpay_payment_id || `pay_${Date.now()}`,
      amount: amount || 0,
      currency: 'INR',
      plan,
      coupon_code: couponCode || null,
      discount_applied: discountApplied || 0,
      status: 'SUCCESS',
    });

    if (paymentErr) {
      console.error('Error saving payment record:', paymentErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Plan upgraded to PRO successfully',
      plan: 'PRO',
      expiresAt: expiryDate.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}
