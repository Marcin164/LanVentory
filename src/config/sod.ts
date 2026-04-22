import { Role, ROLE_FLAG_MAP, RoleFlags } from 'src/decorators/roles.decorator';

/**
 * Segregation of Duties matrix — role pairs that may not coexist on one user.
 * Edit this list to tune organisational separation. Order within a pair is
 * irrelevant; each pair is enforced symmetrically.
 */
export const SOD_INCOMPATIBLE_PAIRS: [Role, Role][] = [
  [Role.Auditor, Role.Admin],
  [Role.Auditor, Role.Helpdesk],
  [Role.Auditor, Role.Approver],
  [Role.Auditor, Role.Compliance],
  [Role.Compliance, Role.Admin],
  [Role.Dpo, Role.Admin],
  [Role.Dpo, Role.Helpdesk],
];

export type SodConflict = {
  a: Role;
  b: Role;
  reason: string;
};

const REASONS: Record<string, string> = {
  [pairKey(Role.Auditor, Role.Admin)]:
    'Auditor must remain independent of users who mutate system state.',
  [pairKey(Role.Auditor, Role.Helpdesk)]:
    'Auditor reviews ticket activity and cannot also perform it.',
  [pairKey(Role.Auditor, Role.Approver)]:
    'Auditor reviews approvals and cannot also issue them.',
  [pairKey(Role.Auditor, Role.Compliance)]:
    'Auditor verifies compliance policies and cannot also define them.',
  [pairKey(Role.Compliance, Role.Admin)]:
    'Policy maker and primary executor must be different people.',
  [pairKey(Role.Dpo, Role.Admin)]:
    'DPO oversees privacy access and cannot hold unrestricted admin power.',
  [pairKey(Role.Dpo, Role.Helpdesk)]:
    'DPO oversees access to personal data and cannot also routinely access it.',
};

function pairKey(a: Role, b: Role): string {
  return [a, b].sort().join('|');
}

export function describeSodPair(a: Role, b: Role): string {
  return (
    REASONS[pairKey(a, b)] ??
    `Roles ${a} and ${b} cannot be assigned to the same user.`
  );
}

/**
 * Return every incompatible pair that the given flags activate simultaneously.
 * Empty array means the role set is valid.
 */
export function validateSod(flags: RoleFlags | null | undefined): SodConflict[] {
  if (!flags) return [];
  const conflicts: SodConflict[] = [];
  for (const [a, b] of SOD_INCOMPATIBLE_PAIRS) {
    if (flags[ROLE_FLAG_MAP[a]] && flags[ROLE_FLAG_MAP[b]]) {
      conflicts.push({ a, b, reason: describeSodPair(a, b) });
    }
  }
  return conflicts;
}

/**
 * Public, serializable view of the SoD matrix for the frontend.
 */
export function getSodMatrix(): {
  pairs: { a: Role; b: Role; reason: string }[];
} {
  return {
    pairs: SOD_INCOMPATIBLE_PAIRS.map(([a, b]) => ({
      a,
      b,
      reason: describeSodPair(a, b),
    })),
  };
}
