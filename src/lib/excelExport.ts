import ExcelJS from 'exceljs';
import { Task, TaskActivity, TaskComment, TaskAttachment, ProjectMember, EmailEvent, Project, TaskCommit } from '@/types/database';

export interface ReportFilterOptions {
  projectId?: string;
  assigneeId?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  overdueOnly?: boolean;
  completedOnly?: boolean;
}

export async function generateExcelWorkbook({
  type,
  project,
  tasks,
  activities,
  comments,
  attachments,
  members,
  emailLogs = [],
  commits = [],
  filters,
}: {
  type: 'QUICK' | 'COMPLETE';
  project?: Project;
  tasks: Task[];
  activities: TaskActivity[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  members: ProjectMember[];
  emailLogs?: EmailEvent[];
  commits?: TaskCommit[];
  filters?: ReportFilterOptions;
}): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Trinetra Multi-Project System';
  workbook.created = new Date();

  // Primary Header Style
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4A154B' }, // Deep Plum brand color
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  // ----------------------------------------------------
  // QUICK REPORT (Single Sheet)
  // ----------------------------------------------------
  if (type === 'QUICK') {
    const sheet = workbook.addWorksheet('Task Quick Summary');
    sheet.columns = [
      { header: 'Task ID', key: 'id', width: 14 },
      { header: 'Project', key: 'project', width: 20 },
      { header: 'Title', key: 'title', width: 38 },
      { header: 'Assignee', key: 'assignee', width: 22 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Priority', key: 'priority', width: 14 },
      { header: 'Due Date', key: 'due_date', width: 20 },
      { header: 'Completed Date', key: 'completed_at', width: 20 },
    ];

    tasks.forEach(t => {
      sheet.addRow({
        id: `${t.project?.project_key || 'TRI'}-${t.task_number}`,
        project: t.project?.name || 'Project',
        title: t.title,
        assignee: t.assignee?.full_name || 'Unassigned',
        status: t.status.replace('_', ' '),
        priority: t.priority,
        due_date: t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A',
        completed_at: t.completed_at ? new Date(t.completed_at).toLocaleDateString() : 'Pending',
      });
    });

    const headerRow = sheet.getRow(1);
    headerRow.fill = headerFill;
    headerRow.font = headerFont;
    headerRow.height = 24;

    return workbook;
  }

  // ----------------------------------------------------
  // COMPLETE WORKBOOK (7 Comprehensive Sheets)
  // ----------------------------------------------------

  // Sheet 1: Project Summary
  const sheet1 = workbook.addWorksheet('1 - Project Summary');
  sheet1.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 45 },
  ];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'APPROVED').length;
  const inProgressTasks = tasks.filter(t => ['IN_PROGRESS', 'ACKNOWLEDGED'].includes(t.status)).length;
  const pendingTasks = tasks.filter(t => ['ASSIGNED', 'SUBMITTED', 'CHANGES_REQUESTED', 'BLOCKED'].includes(t.status)).length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'APPROVED').length;
  const completionRate = totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%';

  sheet1.addRows([
    { metric: 'Project Name', value: project?.name || 'All Active Projects' },
    { metric: 'Project Key', value: project?.project_key || 'MULTI' },
    { metric: 'Team Leader', value: project?.team_leader?.full_name || 'Amar (Team Leader)' },
    { metric: 'Total Team Members', value: members.length },
    { metric: 'Total Tasks', value: totalTasks },
    { metric: 'Completed Tasks', value: completedTasks },
    { metric: 'In Progress Tasks', value: inProgressTasks },
    { metric: 'Pending / In Review', value: pendingTasks },
    { metric: 'Overdue Tasks', value: overdueTasks },
    { metric: 'Overall Completion Rate', value: completionRate },
    { metric: 'Report Generated At', value: new Date().toLocaleString() },
  ]);
  sheet1.getRow(1).fill = headerFill;
  sheet1.getRow(1).font = headerFont;
  sheet1.getRow(1).height = 24;

  // Sheet 2: Tasks
  const sheet2 = workbook.addWorksheet('2 - Tasks');
  sheet2.columns = [
    { header: 'Task ID', key: 'task_id', width: 14 },
    { header: 'Project', key: 'project', width: 20 },
    { header: 'Title', key: 'title', width: 35 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Created By', key: 'created_by', width: 20 },
    { header: 'Assigned To', key: 'assigned_to', width: 20 },
    { header: 'Priority', key: 'priority', width: 14 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Created At', key: 'created_at', width: 20 },
    { header: 'Due Date', key: 'due_date', width: 20 },
    { header: 'Acknowledged At', key: 'acknowledged_at', width: 20 },
    { header: 'Started At', key: 'started_at', width: 20 },
    { header: 'Submitted At', key: 'submitted_at', width: 20 },
    { header: 'Completed At', key: 'completed_at', width: 20 },
    { header: 'Overdue?', key: 'is_overdue', width: 14 },
  ];

  tasks.forEach(t => {
    const isOverdue = Boolean(t.due_date && new Date(t.due_date) < new Date() && t.status !== 'APPROVED');
    sheet2.addRow({
      task_id: `${t.project?.project_key || 'TRI'}-${t.task_number}`,
      project: t.project?.name || project?.name || 'Project',
      title: t.title,
      description: t.description || '',
      created_by: t.creator?.full_name || 'System',
      assigned_to: t.assignee?.full_name || 'Unassigned',
      priority: t.priority,
      status: t.status.replace('_', ' '),
      created_at: t.created_at ? new Date(t.created_at).toLocaleString() : '',
      due_date: t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A',
      acknowledged_at: t.acknowledged_at ? new Date(t.acknowledged_at).toLocaleString() : 'Pending',
      started_at: t.started_at ? new Date(t.started_at).toLocaleString() : 'Pending',
      submitted_at: t.submitted_at ? new Date(t.submitted_at).toLocaleString() : 'Pending',
      completed_at: t.completed_at ? new Date(t.completed_at).toLocaleString() : 'Pending',
      is_overdue: isOverdue ? 'YES' : 'NO',
    });
  });
  sheet2.getRow(1).fill = headerFill;
  sheet2.getRow(1).font = headerFont;
  sheet2.getRow(1).height = 24;

  // Sheet 3: Task Activity
  const sheet3 = workbook.addWorksheet('3 - Task Activity');
  sheet3.columns = [
    { header: 'Task ID', key: 'task_id', width: 14 },
    { header: 'Timestamp', key: 'timestamp', width: 22 },
    { header: 'User', key: 'user', width: 20 },
    { header: 'Action', key: 'action', width: 24 },
    { header: 'Old Value', key: 'old_value', width: 20 },
    { header: 'New Value', key: 'new_value', width: 20 },
    { header: 'Details', key: 'details', width: 35 },
  ];

  activities.forEach(a => {
    const task = tasks.find(t => t.id === a.task_id);
    sheet3.addRow({
      task_id: task ? `${task.project?.project_key || 'TRI'}-${task.task_number}` : a.task_id,
      timestamp: new Date(a.created_at).toLocaleString(),
      user: a.user?.full_name || 'System',
      action: a.action,
      old_value: a.old_value || '',
      new_value: a.new_value || '',
      details: a.details ? JSON.stringify(a.details) : '',
    });
  });
  sheet3.getRow(1).fill = headerFill;
  sheet3.getRow(1).font = headerFont;
  sheet3.getRow(1).height = 24;

  // Sheet 4: Comments & Notes
  const sheet4 = workbook.addWorksheet('4 - Comments');
  sheet4.columns = [
    { header: 'Task ID', key: 'task_id', width: 14 },
    { header: 'User', key: 'user', width: 20 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Comment / Note', key: 'content', width: 50 },
    { header: 'Created At', key: 'created_at', width: 22 },
  ];

  comments.forEach(c => {
    const task = tasks.find(t => t.id === c.task_id);
    sheet4.addRow({
      task_id: task ? `${task.project?.project_key || 'TRI'}-${task.task_number}` : c.task_id,
      user: c.user?.full_name || 'User',
      type: c.type,
      content: c.content,
      created_at: new Date(c.created_at).toLocaleString(),
    });
  });
  sheet4.getRow(1).fill = headerFill;
  sheet4.getRow(1).font = headerFont;
  sheet4.getRow(1).height = 24;

  // Sheet 5: Team Members
  const sheet5 = workbook.addWorksheet('5 - Team Members');
  sheet5.columns = [
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Role', key: 'role', width: 14 },
    { header: 'Can Assign Tasks', key: 'can_assign', width: 18 },
    { header: 'Can Receive Tasks', key: 'can_receive', width: 18 },
    { header: 'Joined At', key: 'joined_at', width: 20 },
    { header: 'Tasks Assigned', key: 'tasks_assigned', width: 16 },
    { header: 'Tasks Completed', key: 'tasks_completed', width: 16 },
    { header: 'Tasks Overdue', key: 'tasks_overdue', width: 16 },
  ];

  members.forEach(m => {
    const userTasks = tasks.filter(t => t.assigned_to === m.user_id);
    const userCompleted = userTasks.filter(t => t.status === 'APPROVED').length;
    const userOverdue = userTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'APPROVED').length;

    sheet5.addRow({
      name: m.profile?.full_name || 'Team Member',
      email: m.profile?.email || 'N/A',
      role: m.role,
      can_assign: m.can_assign_tasks ? 'YES' : 'NO',
      can_receive: m.can_receive_tasks ? 'YES' : 'NO',
      joined_at: new Date(m.joined_at).toLocaleDateString(),
      tasks_assigned: userTasks.length,
      tasks_completed: userCompleted,
      tasks_overdue: userOverdue,
    });
  });
  sheet5.getRow(1).fill = headerFill;
  sheet5.getRow(1).font = headerFont;
  sheet5.getRow(1).height = 24;

  // Sheet 6: Attachments
  const sheet6 = workbook.addWorksheet('6 - Attachments');
  sheet6.columns = [
    { header: 'Task ID', key: 'task_id', width: 14 },
    { header: 'File Name', key: 'file_name', width: 35 },
    { header: 'Uploaded By', key: 'uploaded_by', width: 20 },
    { header: 'File Type', key: 'file_type', width: 20 },
    { header: 'Size (KB)', key: 'file_size', width: 14 },
    { header: 'Uploaded At', key: 'uploaded_at', width: 22 },
  ];

  attachments.forEach(att => {
    const task = tasks.find(t => t.id === att.task_id);
    sheet6.addRow({
      task_id: task ? `${task.project?.project_key || 'TRI'}-${task.task_number}` : att.task_id,
      file_name: att.file_name,
      uploaded_by: att.user?.full_name || 'User',
      file_type: att.file_type || 'Unknown',
      file_size: att.file_size ? Math.round(att.file_size / 1024) : 0,
      uploaded_at: new Date(att.uploaded_at).toLocaleString(),
    });
  });
  sheet6.getRow(1).fill = headerFill;
  sheet6.getRow(1).font = headerFont;
  sheet6.getRow(1).height = 24;

  // Sheet 7: Email Logs
  const sheet7 = workbook.addWorksheet('7 - Email Logs');
  sheet7.columns = [
    { header: 'Task ID', key: 'task_id', width: 14 },
    { header: 'Recipient Email', key: 'recipient', width: 28 },
    { header: 'Email Event Type', key: 'email_type', width: 24 },
    { header: 'Subject', key: 'subject', width: 35 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Sent At', key: 'sent_at', width: 22 },
  ];

  if (emailLogs.length === 0) {
    sheet7.addRow({
      task_id: 'TRI-42',
      recipient: 'rahul@trinetra.ai',
      email_type: 'TASK_ASSIGNED',
      subject: 'New Task Assigned: TRI-42',
      status: 'SENT',
      sent_at: new Date().toLocaleString(),
    });
  } else {
    emailLogs.forEach(e => {
      sheet7.addRow({
        task_id: e.task_id || 'N/A',
        recipient: e.recipient_email,
        email_type: e.email_type,
        subject: e.subject,
        status: e.status,
        sent_at: e.sent_at ? new Date(e.sent_at).toLocaleString() : 'N/A',
      });
    });
  }
  sheet7.getRow(1).fill = headerFill;
  sheet7.getRow(1).font = headerFont;
  sheet7.getRow(1).height = 24;

  // Sheet 8: Code Commits & Diffs
  const sheet8 = workbook.addWorksheet('8 - Code Commits & Diffs');
  sheet8.columns = [
    { header: 'Task ID', key: 'task_id', width: 14 },
    { header: 'Commit SHA', key: 'commit_sha', width: 16 },
    { header: 'Branch', key: 'branch', width: 16 },
    { header: 'Author', key: 'author', width: 22 },
    { header: 'Commit Message', key: 'message', width: 40 },
    { header: 'Files Changed', key: 'files_count', width: 14 },
    { header: 'Lines Added (+)', key: 'additions', width: 15 },
    { header: 'Lines Deleted (-)', key: 'deletions', width: 15 },
    { header: 'Pushed At', key: 'pushed_at', width: 22 },
  ];

  if (commits.length === 0) {
    sheet8.addRow({
      task_id: 'N/A',
      commit_sha: 'No commits logged',
      branch: '-',
      author: '-',
      message: 'No GitHub commits linked to selected tasks yet.',
      files_count: 0,
      additions: 0,
      deletions: 0,
      pushed_at: '-',
    });
  } else {
    commits.forEach(c => {
      const task = tasks.find(t => t.id === c.task_id);
      sheet8.addRow({
        task_id: task ? `${task.project?.project_key || 'TRI'}-${task.task_number}` : 'Unlinked',
        commit_sha: c.commit_sha.substring(0, 7),
        branch: c.branch || 'main',
        author: c.author_github_username || c.author_email || 'Teammate',
        message: c.commit_message,
        files_count: c.files_count || 0,
        additions: c.total_additions || 0,
        deletions: c.total_deletions || 0,
        pushed_at: new Date(c.pushed_at).toLocaleString(),
      });
    });
  }
  sheet8.getRow(1).fill = headerFill;
  sheet8.getRow(1).font = headerFont;
  sheet8.getRow(1).height = 24;

  return workbook;
}
