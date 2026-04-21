import { SetMetadata } from '@nestjs/common';

export enum Role {
  Admin = 'admin',
  Approver = 'approver',
  Auditor = 'auditor',
  Compliance = 'compliance',
  Helpdesk = 'helpdesk',
  Dpo = 'dpo',
}

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const ROLE_FLAG_MAP: Record<Role, keyof RoleFlags> = {
  [Role.Admin]: 'isAdmin',
  [Role.Approver]: 'isApprover',
  [Role.Auditor]: 'isAuditor',
  [Role.Compliance]: 'isCompliance',
  [Role.Helpdesk]: 'isHelpdesk',
  [Role.Dpo]: 'isDpo',
};

export type RoleFlags = {
  isAdmin?: boolean | null;
  isApprover?: boolean | null;
  isAuditor?: boolean | null;
  isCompliance?: boolean | null;
  isHelpdesk?: boolean | null;
  isDpo?: boolean | null;
};

export const userHasAnyRole = (
  user: RoleFlags | null | undefined,
  roles: Role[],
): boolean => {
  if (!user) return false;
  if (user.isAdmin) return true;
  return roles.some((role) => Boolean(user[ROLE_FLAG_MAP[role]]));
};
