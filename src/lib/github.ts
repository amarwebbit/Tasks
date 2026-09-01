import crypto from 'crypto';

/**
 * Verify GitHub Webhook HMAC-SHA256 signature
 */
export function verifyGitHubSignature(
  payloadBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') return false;

  const expectedSignature = parts[1];
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadBody);
  const calculatedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Extract task numbers / keys from commit messages or branch names.
 * Matches patterns like "TRI-001", "TRI-1", "fixes #TRI-12", "feature/TRI-5-login"
 */
export function extractTaskKeyNumbers(
  text: string,
  projectKey: string
): number[] {
  if (!text || !projectKey) return [];

  const foundNumbers = new Set<number>();
  
  // Pattern 1: PROJECT_KEY-NUMBER or PROJECT_KEY-001 (e.g. TRI-001 or TRI-12)
  const projectKeyRegex = new RegExp(`${projectKey}-([0-9]+)`, 'gi');
  let match;
  while ((match = projectKeyRegex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) foundNumbers.add(num);
  }

  // Pattern 2: Generic key-number like #[KEY]-123 or #123 if string mentions #12
  const hashNumberRegex = /#([0-9]+)/g;
  while ((match = hashNumberRegex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) foundNumbers.add(num);
  }

  return Array.from(foundNumbers);
}

export interface DiffLine {
  type: 'add' | 'delete' | 'context' | 'header';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

/**
 * Parses a standard Git unified diff patch into structured lines for UI rendering
 */
export function parseDiffPatch(patch?: string): DiffLine[] {
  if (!patch) return [];

  const lines = patch.split('\n');
  const result: DiffLine[] = [];

  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Chunk header e.g. @@ -1,4 +1,6 @@
      const hunkHeaderMatch = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (hunkHeaderMatch) {
        oldLine = parseInt(hunkHeaderMatch[1], 10);
        newLine = parseInt(hunkHeaderMatch[2], 10);
      }
      result.push({
        type: 'header',
        content: line,
      });
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      result.push({
        type: 'add',
        newLineNumber: newLine++,
        content: line.substring(1),
      });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.push({
        type: 'delete',
        oldLineNumber: oldLine++,
        content: line.substring(1),
      });
    } else if (line.startsWith(' ') || line === '') {
      result.push({
        type: 'context',
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
        content: line.startsWith(' ') ? line.substring(1) : line,
      });
    }
  }

  return result;
}
