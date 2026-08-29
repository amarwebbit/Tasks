import { NextRequest, NextResponse } from 'next/server';
import {
  sendEmailNotification,
  generateTaskAssignedEmail,
  generateTaskSubmittedEmail,
  generateChangesRequestedEmail,
  generateTaskApprovedEmail,
  generateInvitationEmail,
} from '@/lib/resend';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authentication token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session token' }, { status: 401 });
    }

    const body = await req.json();
    const { type, to, data, taskId, projectId } = body;

    if (!to || !type) {
      return NextResponse.json({ error: 'Recipient and notification type are required' }, { status: 400 });
    }

    let subject = '';
    let html = '';

    switch (type) {
      case 'TASK_ASSIGNED':
        subject = `Task Assigned: ${data.taskKey} - ${data.taskTitle}`;
        html = generateTaskAssignedEmail(data);
        break;

      case 'TASK_SUBMITTED':
        subject = `Task Submitted for Review: ${data.taskKey}`;
        html = generateTaskSubmittedEmail(data);
        break;

      case 'CHANGES_REQUESTED':
        subject = `Changes Requested: ${data.taskKey}`;
        html = generateChangesRequestedEmail(data);
        break;

      case 'TASK_APPROVED':
        subject = `✓ Task Completed & Approved: ${data.taskKey}`;
        html = generateTaskApprovedEmail(data);
        break;

      case 'INVITATION':
        subject = `Invitation: Join ${data.projectName} on Trinetra`;
        html = generateInvitationEmail(data);
        break;

      default:
        return NextResponse.json({ error: `Unknown notification type: ${type}` }, { status: 400 });
    }

    const result = await sendEmailNotification({
      to,
      subject,
      html,
      taskId,
      projectId,
      emailType: type,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send notification email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
