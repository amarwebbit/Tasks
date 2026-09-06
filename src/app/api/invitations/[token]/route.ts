import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const getSupabaseAdmin = () => {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch invitation by token
    const { data: invite, error: inviteErr } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: 'Invitation not found or invalid link.' }, { status: 404 });
    }

    // 2. Fetch project details
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, project_key, description')
      .eq('id', invite.project_id)
      .maybeSingle();

    // 3. Fetch inviter details
    let inviterName = 'Team Leader';
    if (invite.invited_by) {
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', invite.invited_by)
        .maybeSingle();
      if (inviterProfile?.full_name) {
        inviterName = inviterProfile.full_name;
      }
    }

    const isExpired = invite.expires_at ? new Date(invite.expires_at) < new Date() : false;

    return NextResponse.json({
      invitation: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        can_receive_tasks: invite.can_receive_tasks,
        can_assign_tasks: invite.can_assign_tasks,
        status: isExpired && invite.status === 'INVITED' ? 'EXPIRED' : invite.status,
        expires_at: invite.expires_at,
      },
      project: project || {
        id: invite.project_id,
        name: 'Project',
        project_key: '',
        description: '',
      },
      inviter: {
        name: inviterName,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching invitation';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { action, userId } = body; // action: 'ACCEPT' | 'DECLINE'

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch invitation
    const { data: invite, error: inviteErr } = await supabase
      .from('invitations')
      .select('*, projects!inner(id, name, project_key)')
      .eq('token', token)
      .maybeSingle();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: 'Invitation not found or invalid link.' }, { status: 404 });
    }

    if (invite.status !== 'INVITED') {
      return NextResponse.json({
        error: `This invitation has already been ${invite.status.toLowerCase()}.`,
        status: invite.status,
        projectKey: invite.projects?.project_key,
      }, { status: 400 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired.', status: 'EXPIRED' }, { status: 400 });
    }

    // 2. Handle Action
    if (action === 'DECLINE') {
      await supabase
        .from('invitations')
        .update({ status: 'DECLINED' })
        .eq('id', invite.id);

      return NextResponse.json({ success: true, status: 'DECLINED' });
    }

    // Default: ACCEPT
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required to accept invitation.' }, { status: 400 });
    }

    // Add user into project_members
    const { error: memberErr } = await supabase
      .from('project_members')
      .upsert({
        project_id: invite.project_id,
        user_id: userId,
        role: invite.role,
        can_receive_tasks: invite.can_receive_tasks,
        can_assign_tasks: invite.can_assign_tasks,
        status: 'ACTIVE',
      }, { onConflict: 'project_id,user_id' });

    if (memberErr) {
      console.error('Error adding project member:', memberErr);
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }

    // Update invitation status
    await supabase
      .from('invitations')
      .update({
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    return NextResponse.json({
      success: true,
      status: 'ACCEPTED',
      projectId: invite.project_id,
      projectKey: invite.projects?.project_key,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to process invitation';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
