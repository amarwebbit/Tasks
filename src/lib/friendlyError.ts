/**
 * Formats any raw database, Supabase, or system error into a user-friendly message.
 * Ensures no internal database schemas, table names, RLS details, or SQL errors leak to the user interface.
 */
export function toFriendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;

  let message = '';
  if (typeof error === 'string') {
    message = error;
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    message = String(errObj.message || errObj.error_description || errObj.error || errObj.details || '');
  }

  const trimmed = message.trim();
  if (!trimmed) return fallback;

  // 1. Supabase / Postgres Row-Level Security (RLS) Violations
  if (/row-level security/i.test(trimmed) || /violates.*security policy/i.test(trimmed)) {
    if (/organization/i.test(trimmed)) {
      return 'Unable to setup workspace. Please refresh the page or verify your account permissions.';
    }
    if (/project/i.test(trimmed)) {
      return 'You do not have permission to modify this project. Only project leaders or owners can perform this action.';
    }
    if (/task/i.test(trimmed)) {
      return 'You do not have permission to create or modify tasks in this project.';
    }
    if (/member/i.test(trimmed)) {
      return 'You do not have permission to manage team members.';
    }
    return 'Permission denied: You do not have sufficient permissions to perform this action.';
  }

  // 2. Duplicate Key / Unique Constraint Violations
  if (/duplicate key|unique constraint/i.test(trimmed)) {
    if (/project_key/i.test(trimmed)) {
      return 'This Project Key is already taken. Please enter a different key (e.g. TRI2, APP).';
    }
    if (/slug/i.test(trimmed)) {
      return 'A workspace or project with this name already exists. Please choose a different name.';
    }
    if (/email/i.test(trimmed)) {
      return 'An account with this email address already exists. Please sign in instead.';
    }
    return 'A record with this information already exists. Please use unique details.';
  }

  // 3. Foreign Key Constraint Violations
  if (/violates foreign key constraint/i.test(trimmed)) {
    return 'Unable to save because a linked item or member was not found. Please refresh and try again.';
  }

  // 4. Not-Null / Required Field Constraints
  if (/violates not-null constraint|null value in column/i.test(trimmed)) {
    return 'Please fill in all required fields before submitting.';
  }

  // 5. Check Constraint Violations
  if (/violates check constraint/i.test(trimmed)) {
    return 'The provided information is invalid. Please review your entries and try again.';
  }

  // 6. Auth / Session / JWT Errors
  if (/jwt expired|invalid token|invalid claim|session.*missing/i.test(trimmed)) {
    return 'Your login session has expired. Please sign in again.';
  }
  if (/invalid login credentials/i.test(trimmed)) {
    return 'Invalid email or password. Please try again.';
  }
  if (/user already registered/i.test(trimmed)) {
    return 'An account with this email is already registered. Please sign in instead.';
  }

  // 7. Network / Fetch Failures
  if (/failed to fetch|network error|networkrequestfailed/i.test(trimmed)) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }

  // 8. Internal Database / Postgres Leaks
  if (
    /postgres|pg_|relation "[^"]+" does not exist|column "[^"]+" does not exist|syntax error at or near|pgrst/i.test(trimmed)
  ) {
    return 'A temporary service issue occurred. Please refresh the page and try again.';
  }

  // If already clean and user-friendly, return original message
  return trimmed;
}
