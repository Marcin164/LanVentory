import { describe, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const CONTROLLERS_DIR = path.resolve(__dirname);
const MUTATION_DECORATOR = /@(Post|Patch|Put|Delete)\s*\(/;
const ROLES_DECORATOR = /@Roles\s*\(/;
const AGENT_GUARD = /AgentGuard/;
const ADMIN_GUARD = /\bAdminGuard\b/;
const ALLOW_PUBLIC_MARKER = /@AllowPublicMutation/;

type Finding = {
  file: string;
  method: string;
  decorator: string;
};

function listControllerFiles(): string[] {
  return fs
    .readdirSync(CONTROLLERS_DIR)
    .filter((f) => f.endsWith('.controller.ts'))
    .map((f) => path.join(CONTROLLERS_DIR, f));
}

function controllerHasClassLevelRoles(content: string): boolean {
  const idx = content.indexOf('@Controller');
  if (idx < 0) return false;
  const head = content.slice(Math.max(0, idx - 800), idx);
  return ROLES_DECORATOR.test(head);
}

function controllerHasClassLevelAgentGuard(content: string): boolean {
  const idx = content.indexOf('@Controller');
  if (idx < 0) return false;
  const head = content.slice(Math.max(0, idx - 800), idx);
  return AGENT_GUARD.test(head);
}

function controllerHasClassLevelAdminGuard(content: string): boolean {
  const idx = content.indexOf('@Controller');
  if (idx < 0) return false;
  const head = content.slice(Math.max(0, idx - 800), idx);
  return ADMIN_GUARD.test(head);
}

function findUnprotectedMutations(filePath: string): Finding[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const classLevelRoles = controllerHasClassLevelRoles(content);
  const classLevelAgentGuard = controllerHasClassLevelAgentGuard(content);
  const classLevelAdminGuard = controllerHasClassLevelAdminGuard(content);
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//')) continue;
    const match = line.match(MUTATION_DECORATOR);
    if (!match) continue;

    let lookbackStart = i;
    for (let j = i - 1; j >= 0 && j >= i - 12; j--) {
      const prev = lines[j].trim();
      if (prev.startsWith('@') || prev === '' || prev.startsWith('//')) {
        lookbackStart = j;
        continue;
      }
      break;
    }

    let methodLineIdx = -1;
    let lookaheadEnd = i;
    for (let j = i + 1; j < lines.length && j <= i + 8; j++) {
      const nxt = lines[j].trim();
      if (nxt.startsWith('@') || nxt === '' || nxt.startsWith('//')) {
        lookaheadEnd = j;
        continue;
      }
      methodLineIdx = j;
      lookaheadEnd = j;
      break;
    }

    const block = lines.slice(lookbackStart, lookaheadEnd + 1).join('\n');

    const hasMethodRoles = ROLES_DECORATOR.test(block);
    const hasMethodAgentGuard = AGENT_GUARD.test(block);
    const hasMethodAdminGuard = ADMIN_GUARD.test(block);
    const hasPublicMarker = ALLOW_PUBLIC_MARKER.test(block);

    if (
      classLevelRoles ||
      hasMethodRoles ||
      classLevelAgentGuard ||
      hasMethodAgentGuard ||
      classLevelAdminGuard ||
      hasMethodAdminGuard ||
      hasPublicMarker
    ) {
      continue;
    }

    let methodName = '<unknown>';
    if (methodLineIdx >= 0) {
      const methodLine = lines[methodLineIdx].trim();
      const m = methodLine.match(/(?:async\s+)?(\w+)\s*\(/);
      if (m) methodName = m[1];
    }
    findings.push({
      file: path.basename(filePath),
      method: methodName,
      decorator: match[1],
    });
  }

  return findings;
}

describe('RBAC coverage on mutation endpoints', () => {
  const KNOWN_PUBLIC_MUTATIONS: Record<string, string[]> = {
    'tickets.controller.ts': [
      'createTicket',
      'createComment',
      'createCommentWithAttachment',
      'createApproval',
      'updateApproval',
    ],
    'forms.controller.ts': ['create', 'delete'],
    'settings.controller.ts': ['updateUserSettings'],
    'slaRuntime.controller.ts': ['pause', 'resume'],
  };

  it('every POST/PATCH/PUT/DELETE has @Roles, AgentGuard, or explicit allow-list entry', () => {
    const files = listControllerFiles().filter(
      (f) => path.basename(f) !== 'rbac-coverage.spec.ts',
    );
    const allFindings: Finding[] = [];

    for (const file of files) {
      const findings = findUnprotectedMutations(file);
      for (const finding of findings) {
        const allowList = KNOWN_PUBLIC_MUTATIONS[finding.file] ?? [];
        if (allowList.includes(finding.method)) continue;
        allFindings.push(finding);
      }
    }

    if (allFindings.length > 0) {
      const summary = allFindings
        .map(
          (f) =>
            `  - ${f.file}:${f.method} (@${f.decorator}) — missing @Roles(...)`,
        )
        .join('\n');
      throw new Error(
        `Found ${allFindings.length} mutation endpoint(s) without RBAC protection:\n${summary}\n\n` +
          `Either add @Roles(...) (preferred), use AgentGuard for HMAC-authenticated agent endpoints, ` +
          `or add the method to KNOWN_PUBLIC_MUTATIONS in rbac-coverage.spec.ts with justification.`,
      );
    }
  });
});
