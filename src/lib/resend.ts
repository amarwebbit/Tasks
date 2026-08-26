import 'server-only';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'Trinetra Tasks <notifications@resend.dev>';

const resend = resendApiKey && resendApiKey.startsWith('re_') ? new Resend(resendApiKey) : null;

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  taskId?: string;
  projectId?: string;
  emailType: string;
}

export async function sendEmailNotification({
  to,
  subject,
  html,
  taskId,
  projectId,
  emailType,
}: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!resend) {
      console.log(`[Server Email Log (${emailType})] to: ${to} | Subject: "${subject}"`);
      return { success: true, id: `mock-email-${Date.now()}` };
    }

    const { data, error } = await resend.emails.send({
      from: resendFromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown email sending error';
    console.error('Email Dispatch Exception:', message);
    return { success: false, error: message };
  }
}

// 1. Task Assigned Email
export function generateTaskAssignedEmail({
  recipientName,
  projectName,
  taskKey,
  taskTitle,
  assignerName,
  priority,
  dueDate,
  description,
  definitionOfDone,
  taskUrl,
}: {
  recipientName: string;
  projectName: string;
  taskKey: string;
  taskTitle: string;
  assignerName: string;
  priority: string;
  dueDate?: string;
  description?: string;
  definitionOfDone?: string;
  taskUrl: string;
}) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FBF9F5; color: #1F1D1A; border: 1px solid #E8E2D5; border-radius: 8px;">
      <div style="padding-bottom: 16px; border-bottom: 2px solid #4A154B; margin-bottom: 20px;">
        <span style="font-size: 13px; font-weight: bold; color: #4A154B; text-transform: uppercase; letter-spacing: 0.5px;">${projectName}</span>
        <h2 style="margin: 6px 0 0 0; color: #1F1D1A; font-size: 20px;">New Task Assigned: ${taskKey}</h2>
      </div>
      <p>Hello <strong>${recipientName}</strong>,</p>
      <p><strong>${assignerName}</strong> has assigned a new task to you:</p>
      
      <div style="background: #FFFFFF; border: 1px solid #E8E2D5; border-radius: 6px; padding: 18px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 17px; color: #1F1D1A;">${taskTitle}</h3>
        <p style="margin: 4px 0; font-size: 14px; color: #5C564E;"><strong>Priority:</strong> <span style="color: #9A3412; font-weight: 600;">${priority}</span></p>
        ${dueDate ? `<p style="margin: 4px 0; font-size: 14px; color: #5C564E;"><strong>Due Date:</strong> ${dueDate}</p>` : ''}
        ${description ? `<div style="margin-top: 12px; font-size: 14px; color: #1F1D1A;"><strong>Description:</strong><br/>${description}</div>` : ''}
        ${definitionOfDone ? `<div style="margin-top: 12px; font-size: 14px; color: #14532D; background: #F0FDF4; padding: 10px; border-radius: 4px;"><strong>Definition of Done:</strong><br/>${definitionOfDone}</div>` : ''}
      </div>
      
      <div style="margin: 24px 0;">
        <a href="${taskUrl}" style="background-color: #4A154B; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">View & Acknowledge Task</a>
      </div>
      <p style="font-size: 12px; color: #8A8275; margin-top: 32px; border-top: 1px solid #E8E2D5; padding-top: 12px;">Trinetra Multi-Project Task Management</p>
    </div>
  `;
}

// 2. Task Submitted Email
export function generateTaskSubmittedEmail({
  reviewerName,
  projectName,
  taskKey,
  taskTitle,
  submitterName,
  submissionNote,
  taskUrl,
}: {
  reviewerName: string;
  projectName: string;
  taskKey: string;
  taskTitle: string;
  submitterName: string;
  submissionNote?: string;
  taskUrl: string;
}) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FBF9F5; color: #1F1D1A; border: 1px solid #E8E2D5; border-radius: 8px;">
      <div style="padding-bottom: 16px; border-bottom: 2px solid #6B21A8; margin-bottom: 20px;">
        <span style="font-size: 13px; font-weight: bold; color: #6B21A8; text-transform: uppercase; letter-spacing: 0.5px;">${projectName}</span>
        <h2 style="margin: 6px 0 0 0; color: #1F1D1A; font-size: 20px;">Task Submitted for Review: ${taskKey}</h2>
      </div>
      <p>Hello <strong>${reviewerName}</strong>,</p>
      <p><strong>${submitterName}</strong> has submitted work on <strong>${taskKey} - ${taskTitle}</strong> for your review.</p>
      
      ${submissionNote ? `
      <div style="background: #FAF5FF; border: 1px solid #E9D5FF; border-radius: 6px; padding: 14px; margin: 16px 0; color: #581C87; font-size: 14px;">
        <strong>Submission Notes:</strong><br/>${submissionNote}
      </div>` : ''}
      
      <div style="margin: 24px 0;">
        <a href="${taskUrl}" style="background-color: #6B21A8; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Review Work & Approve</a>
      </div>
      <p style="font-size: 12px; color: #8A8275; margin-top: 32px; border-top: 1px solid #E8E2D5; padding-top: 12px;">Trinetra Multi-Project Task Management</p>
    </div>
  `;
}

// 3. Changes Requested Email
export function generateChangesRequestedEmail({
  assigneeName,
  projectName,
  taskKey,
  taskTitle,
  reviewerName,
  reason,
  taskUrl,
}: {
  assigneeName: string;
  projectName: string;
  taskKey: string;
  taskTitle: string;
  reviewerName: string;
  reason: string;
  taskUrl: string;
}) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FBF9F5; color: #1F1D1A; border: 1px solid #E8E2D5; border-radius: 8px;">
      <div style="padding-bottom: 16px; border-bottom: 2px solid #9F1239; margin-bottom: 20px;">
        <span style="font-size: 13px; font-weight: bold; color: #9F1239; text-transform: uppercase; letter-spacing: 0.5px;">${projectName}</span>
        <h2 style="margin: 6px 0 0 0; color: #1F1D1A; font-size: 20px;">Changes Requested: ${taskKey}</h2>
      </div>
      <p>Hello <strong>${assigneeName}</strong>,</p>
      <p><strong>${reviewerName}</strong> reviewed your submission for <strong>${taskKey} - ${taskTitle}</strong> and requested revisions.</p>
      
      <div style="background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 6px; padding: 14px; margin: 16px 0; color: #881337; font-size: 14px;">
        <strong>Feedback & Required Changes:</strong><br/>${reason}
      </div>
      
      <div style="margin: 24px 0;">
        <a href="${taskUrl}" style="background-color: #9F1239; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">View Feedback & Update Task</a>
      </div>
      <p style="font-size: 12px; color: #8A8275; margin-top: 32px; border-top: 1px solid #E8E2D5; padding-top: 12px;">Trinetra Multi-Project Task Management</p>
    </div>
  `;
}

// 4. Task Approved Email
export function generateTaskApprovedEmail({
  assigneeName,
  projectName,
  taskKey,
  taskTitle,
  reviewerName,
  completedDate,
  taskUrl,
}: {
  assigneeName: string;
  projectName: string;
  taskKey: string;
  taskTitle: string;
  reviewerName: string;
  completedDate: string;
  taskUrl: string;
}) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FBF9F5; color: #1F1D1A; border: 1px solid #E8E2D5; border-radius: 8px;">
      <div style="padding-bottom: 16px; border-bottom: 2px solid #14532D; margin-bottom: 20px;">
        <span style="font-size: 13px; font-weight: bold; color: #14532D; text-transform: uppercase; letter-spacing: 0.5px;">${projectName}</span>
        <h2 style="margin: 6px 0 0 0; color: #1F1D1A; font-size: 20px;">✓ Task Completed & Approved: ${taskKey}</h2>
      </div>
      <p>Hello <strong>${assigneeName}</strong>,</p>
      <p>Great work! <strong>${taskKey} - ${taskTitle}</strong> has been approved by <strong>${reviewerName}</strong>.</p>
      
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 14px; margin: 16px 0; color: #14532D; font-size: 14px;">
        <strong>Completed on:</strong> ${completedDate}
      </div>
      
      <div style="margin: 24px 0;">
        <a href="${taskUrl}" style="background-color: #14532D; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">View Completed Record</a>
      </div>
      <p style="font-size: 12px; color: #8A8275; margin-top: 32px; border-top: 1px solid #E8E2D5; padding-top: 12px;">Trinetra Multi-Project Task Management</p>
    </div>
  `;
}

// 5. Invitation Email
export function generateInvitationEmail({
  recipientEmail,
  projectName,
  inviterName,
  role,
  inviteUrl,
}: {
  recipientEmail: string;
  projectName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FBF9F5; color: #1F1D1A; border: 1px solid #E8E2D5; border-radius: 8px;">
      <div style="padding-bottom: 16px; border-bottom: 2px solid #4A154B; margin-bottom: 20px;">
        <span style="font-size: 13px; font-weight: bold; color: #4A154B; text-transform: uppercase; letter-spacing: 0.5px;">Trinetra Project Invitation</span>
        <h2 style="margin: 6px 0 0 0; color: #1F1D1A; font-size: 20px;">Join "${projectName}"</h2>
      </div>
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to join the <strong>${projectName}</strong> project as a <strong>${role}</strong>.</p>
      
      <div style="margin: 24px 0;">
        <a href="${inviteUrl}" style="background-color: #4A154B; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Accept Invitation</a>
      </div>
      <p style="font-size: 13px; color: #5C564E;">If you do not have an account yet, you will be prompted to create one and will automatically join the project.</p>
      <p style="font-size: 12px; color: #8A8275; margin-top: 32px; border-top: 1px solid #E8E2D5; padding-top: 12px;">Trinetra Multi-Project Task Management</p>
    </div>
  `;
}

// 7. Official Payment Receipt & Tax Invoice Email
export function generatePaymentReceiptEmail({
  customerName,
  customerEmail,
  orderId,
  paymentId,
  planName,
  amountPaid,
  discountApplied,
  validUntil,
  invoiceNumber,
  appUrl,
}: {
  customerName: string;
  customerEmail: string;
  orderId: string;
  paymentId: string;
  planName: string;
  amountPaid: number;
  discountApplied?: number;
  validUntil: string;
  invoiceNumber: string;
  appUrl: string;
}) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #0E0C12; color: #F5F5F4; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
      <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="display: inline-block; background: linear-gradient(135deg, #9333EA, #D97706); color: #FFF; font-weight: 900; font-size: 14px; padding: 6px 14px; border-radius: 8px; margin-bottom: 12px; letter-spacing: 0.5px;">TRINETRA TASKS</div>
        <h1 style="margin: 0; font-size: 22px; color: #FFFFFF; font-weight: 800;">Official Payment Receipt & Tax Invoice</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #A8A29E;">Invoice #: <span style="font-family: monospace; color: #FBBF24; font-weight: bold;">${invoiceNumber}</span></p>
      </div>

      <div style="padding: 24px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #D6D3D1;">Hello <strong>${customerName}</strong> (${customerEmail}),</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #D6D3D1;">
          Thank you for subscribing to <strong>${planName}</strong>! Your payment has been verified successfully. Your workspace is now upgraded with <strong>Full Pro Access</strong>.
        </p>

        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #A8A29E;">Plan Subscribed:</td>
              <td style="padding: 8px 0; color: #FFFFFF; font-weight: bold; text-align: right;">${planName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #A8A29E;">Amount Paid:</td>
              <td style="padding: 8px 0; color: #34D399; font-weight: 900; font-size: 16px; text-align: right;">₹${amountPaid}</td>
            </tr>
            ${discountApplied ? `
            <tr>
              <td style="padding: 8px 0; color: #A8A29E;">Discount Applied:</td>
              <td style="padding: 8px 0; color: #FBBF24; font-weight: bold; text-align: right;">-₹${discountApplied}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #A8A29E;">Payment ID:</td>
              <td style="padding: 8px 0; color: #E7E5E4; font-family: monospace; text-align: right;">${paymentId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #A8A29E;">Order ID:</td>
              <td style="padding: 8px 0; color: #E7E5E4; font-family: monospace; text-align: right;">${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #A8A29E;">Pro Access Valid Until:</td>
              <td style="padding: 8px 0; color: #FFFFFF; font-weight: bold; text-align: right;">${validUntil}</td>
            </tr>
          </table>
        </div>

        <h3 style="margin: 20px 0 10px 0; font-size: 13px; color: #FBBF24; text-transform: uppercase; letter-spacing: 0.5px;">All Promised Pro Capabilities Unlocked:</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #D6D3D1; line-height: 1.8;">
          <li><strong>Unlimited Projects:</strong> Create and manage unlimited projects without restrictions.</li>
          <li><strong>Unlimited Team Members:</strong> Onboard entire organizations and multi-leader teams.</li>
          <li><strong>Complete 7-Sheet Audit Workbook Exports:</strong> Full historical timeline, comments, files, and email audit logs.</li>
        </ul>
      </div>

      <div style="text-align: center; padding: 24px 0 12px 0;">
        <a href="${appUrl}" style="background: linear-gradient(135deg, #9333EA, #7E22CE); color: #FFFFFF; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(147, 51, 234, 0.4);">
          Launch Pro Workspace →
        </a>
      </div>

      <p style="text-align: center; font-size: 11px; color: #78716C; margin: 16px 0 0 0;">
        Trinetra Tasks • task.trinetraedu-ai.com • Retain this email invoice for your tax & accounting records.
      </p>
    </div>
  `;
}
