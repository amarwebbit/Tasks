import { NextResponse } from 'next/server';
import { sendEmailNotification } from '@/lib/resend';

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();
    if (!message || !email) {
      return NextResponse.json(
        { success: false, error: 'Email and message are required' },
        { status: 400 }
      );
    }

    const safeMessage = String(message)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #4A154B; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #4A154B; margin: 0; font-size: 20px;">Trinetra Tasks — User Feedback & Support Request</h2>
        </div>
        <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>From:</strong> ${name || 'User'} (&lt;${email}&gt;)</p>
        <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
        <p style="margin: 6px 0; font-size: 12px; color: #6b7280;"><strong>Timestamp:</strong> ${new Date().toUTCString()}</p>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 16px 0;" />
        <h4 style="margin: 0 0 8px 0; color: #111827; font-size: 14px;">Message Details:</h4>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 14px 16px; border-radius: 8px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #1f2937;">
          ${safeMessage}
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
          Sent via Trinetra Tasks In-App Support Hub • task.trinetraedu-ai.com
        </p>
      </div>
    `;

    await sendEmailNotification({
      to: 'support@trinetraedu-ai.com',
      subject: `[Support/Feedback] ${subject || 'New Message'} (from ${email})`,
      html,
      emailType: 'FEEDBACK_SUBMISSION',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Feedback API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to dispatch email' },
      { status: 500 }
    );
  }
}
