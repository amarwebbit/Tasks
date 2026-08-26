export type OrgRole = 'OWNER' | 'MEMBER';
export type ProjectRole = 'LEADER' | 'MEMBER' | 'VIEWER';
export type AssignmentRule = 'LEADER_ONLY' | 'SELECTED_MEMBERS' | 'EVERYONE';

export type TaskStatus = 
  | 'DRAFT'
  | 'ASSIGNED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'APPROVED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ActivityAction =
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_ACKNOWLEDGED'
  | 'TASK_STARTED'
  | 'TASK_BLOCKED'
  | 'TASK_UNBLOCKED'
  | 'TASK_SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'TASK_APPROVED'
  | 'DUE_DATE_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'COMMENT_ADDED'
  | 'ATTACHMENT_UPLOADED'
  | 'MEMBER_INVITED'
  | 'PERMISSIONS_UPDATED';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_by?: string;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  status: 'ACTIVE' | 'SUSPENDED';
  joined_at: string;
  profile?: UserProfile;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  project_key: string;
  description?: string;
  team_leader_id?: string;
  assignment_rule: AssignmentRule;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  start_date?: string;
  target_date?: string;
  created_at: string;
  updated_at: string;
  team_leader?: UserProfile;
  members_count?: number;
  tasks_count?: number;
  completed_tasks_count?: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  can_receive_tasks: boolean;
  can_assign_tasks: boolean;
  status: 'ACTIVE' | 'REMOVED';
  joined_at: string;
  profile?: UserProfile;
}

export interface Invitation {
  id: string;
  organization_id: string;
  project_id: string;
  email: string;
  role: ProjectRole;
  can_receive_tasks: boolean;
  can_assign_tasks: boolean;
  token: string;
  invited_by: string;
  status: 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  project?: Project;
}

export interface Task {
  id: string;
  project_id: string;
  task_number: number;
  title: string;
  description?: string;
  definition_of_done?: string;
  created_by?: string;
  assigned_to?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  blocked_reason?: string;
  changes_requested_reason?: string;
  acknowledged_at?: string;
  started_at?: string;
  blocked_at?: string;
  submitted_at?: string;
  completed_at?: string;
  estimated_hours?: number;
  actual_hours?: number;
  created_at: string;
  updated_at: string;
  creator?: UserProfile;
  assignee?: UserProfile;
  project?: Project;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id?: string;
  content: string;
  type: 'COMMENT' | 'CLARIFICATION' | 'BLOCKER_NOTE' | 'SUBMISSION_NOTE' | 'CHANGE_REQUEST_NOTE' | 'APPROVAL_NOTE';
  created_at: string;
  user?: UserProfile;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  user_id?: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_at: string;
  user?: UserProfile;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id?: string;
  action: ActivityAction;
  old_value?: string;
  new_value?: string;
  details?: Record<string, unknown>;
  created_at: string;
  user?: UserProfile;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  project_id?: string;
  task_id?: string;
  title: string;
  message: string;
  link?: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface EmailEvent {
  id: string;
  task_id?: string;
  project_id?: string;
  recipient_email: string;
  email_type: string;
  subject: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  provider_message_id?: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}
