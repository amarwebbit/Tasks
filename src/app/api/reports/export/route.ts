import { NextRequest, NextResponse } from 'next/server';
import { generateExcelWorkbook } from '@/lib/excelExport';
import { getServiceSupabase } from '@/lib/supabaseServer';
import { Task, Project, TaskActivity, TaskComment, TaskAttachment, ProjectMember, EmailEvent } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type = 'COMPLETE',
      projectId,
      assigneeId,
      status,
      priority,
      overdueOnly,
      completedOnly,
    } = body;

    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase database connection is not configured.' },
        { status: 500 }
      );
    }

    // Fetch Profiles
    const { data: profiles } = await supabase.from('profiles').select('*');
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Fetch Projects
    const { data: projectsData } = await supabase.from('projects').select('*');
    const projectsMap = new Map((projectsData || []).map(p => [p.id, p]));

    let targetProject: Project | undefined;
    if (projectId && projectId !== 'ALL') {
      const p = projectsMap.get(projectId);
      if (p) {
        targetProject = {
          ...p,
          team_leader: profileMap.get(p.team_leader_id),
        };
      }
    }

    // Build Task Query
    let query = supabase.from('tasks').select('*');

    if (projectId && projectId !== 'ALL') {
      query = query.eq('project_id', projectId);
    }
    if (assigneeId && assigneeId !== 'ALL') {
      query = query.eq('assigned_to', assigneeId);
    }
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }
    if (priority && priority !== 'ALL') {
      query = query.eq('priority', priority);
    }
    if (completedOnly) {
      query = query.eq('status', 'APPROVED');
    }

    const { data: rawTasks, error: taskError } = await query.order('created_at', { ascending: false });
    if (taskError) throw taskError;

    let tasks: Task[] = (rawTasks || []).map(t => ({
      ...t,
      creator: profileMap.get(t.created_by),
      assignee: profileMap.get(t.assigned_to),
      project: projectsMap.get(t.project_id),
    }));

    if (overdueOnly) {
      tasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'APPROVED');
    }

    const taskIds = tasks.map(t => t.id);

    // Fetch Activities for filtered tasks
    let activities: TaskActivity[] = [];
    if (taskIds.length > 0) {
      const { data: actData } = await supabase
        .from('task_activity')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false });
      activities = (actData || []).map(a => ({
        ...a,
        user: profileMap.get(a.user_id),
      }));
    }

    // Fetch Comments for filtered tasks
    let comments: TaskComment[] = [];
    if (taskIds.length > 0) {
      const { data: commData } = await supabase
        .from('task_comments')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });
      comments = (commData || []).map(c => ({
        ...c,
        user: profileMap.get(c.user_id),
      }));
    }

    // Fetch Attachments for filtered tasks
    let attachments: TaskAttachment[] = [];
    if (taskIds.length > 0) {
      const { data: attData } = await supabase
        .from('task_attachments')
        .select('*')
        .in('task_id', taskIds)
        .order('uploaded_at', { ascending: false });
      attachments = (attData || []).map(att => ({
        ...att,
        user: profileMap.get(att.user_id),
      }));
    }

    // Fetch Project Members
    let members: ProjectMember[] = [];
    let memberQuery = supabase.from('project_members').select('*');
    if (projectId && projectId !== 'ALL') {
      memberQuery = memberQuery.eq('project_id', projectId);
    }
    const { data: memData } = await memberQuery;
    members = (memData || []).map(m => ({
      ...m,
      profile: profileMap.get(m.user_id),
    }));

    // Fetch Email Event Logs
    let emailLogs: EmailEvent[] = [];
    if (taskIds.length > 0) {
      const { data: emailData } = await supabase
        .from('email_events')
        .select('*')
        .in('task_id', taskIds);
      emailLogs = emailData || [];
    }

    const workbook = await generateExcelWorkbook({
      type: type === 'QUICK' ? 'QUICK' : 'COMPLETE',
      project: targetProject,
      tasks,
      activities,
      comments,
      attachments,
      members,
      emailLogs,
      filters: body,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `${targetProject ? targetProject.project_key : 'TRINETRA'}_${type === 'QUICK' ? 'Quick_Report' : 'Complete_Report'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Excel export generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
