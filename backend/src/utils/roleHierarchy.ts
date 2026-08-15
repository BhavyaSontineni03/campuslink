// Role hierarchy and permission system
export type UserRole = 'student' | 'organizer' | 'admin' | 'super_admin';

export interface RolePermissions {
  canPromoteTo: UserRole[];
  canDemoteFrom: UserRole[];
  canDeleteUsers: UserRole[];
  canManageUsers: boolean;
  canManageSessions: boolean;
  canManageReservations: boolean;
  canViewAuditLogs: boolean;
  canManageAdmins: boolean;
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 1,
  organizer: 2,
  admin: 3,
  super_admin: 4
};

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  student: {
    canPromoteTo: [],
    canDemoteFrom: [],
    canDeleteUsers: [],
    canManageUsers: false,
    canManageSessions: false,
    canManageReservations: false,
    canViewAuditLogs: false,
    canManageAdmins: false
  },
  organizer: {
    canPromoteTo: ['student'],
    canDemoteFrom: ['student'],
    canDeleteUsers: [],
    canManageUsers: false,
    canManageSessions: true,
    canManageReservations: false,
    canViewAuditLogs: false,
    canManageAdmins: false
  },
  admin: {
    canPromoteTo: ['student', 'organizer'],
    canDemoteFrom: ['student', 'organizer'],
    canDeleteUsers: ['student', 'organizer'],
    canManageUsers: true,
    canManageSessions: true,
    canManageReservations: true,
    canViewAuditLogs: true,
    canManageAdmins: false
  },
  super_admin: {
    canPromoteTo: ['student', 'organizer', 'admin'],
    canDemoteFrom: ['student', 'organizer', 'admin'],
    canDeleteUsers: ['student', 'organizer', 'admin', 'super_admin'],
    canManageUsers: true,
    canManageSessions: true,
    canManageReservations: true,
    canViewAuditLogs: true,
    canManageAdmins: true
  }
};

export function canPromoteUser(currentUserRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_PERMISSIONS[currentUserRole].canPromoteTo.includes(targetRole);
}

export function canDemoteUser(currentUserRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_PERMISSIONS[currentUserRole].canDemoteFrom.includes(targetRole);
}

export function hasPermission(currentUserRole: UserRole, permission: keyof RolePermissions): boolean {
  const perm = ROLE_PERMISSIONS[currentUserRole][permission];
  if (typeof perm === 'boolean') {
    return perm;
  }
  return false;
}

export function isHigherRole(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

export function canManageUser(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  // Can't manage users of same or higher role
  if (ROLE_HIERARCHY[currentUserRole] <= ROLE_HIERARCHY[targetUserRole]) {
    return false;
  }
  
  // Check if current user has permission to manage this role
  return ROLE_PERMISSIONS[currentUserRole].canPromoteTo.includes(targetUserRole) ||
         ROLE_PERMISSIONS[currentUserRole].canDemoteFrom.includes(targetUserRole);
}

export function canDeleteUser(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  // Check if current user has permission to delete this role
  return ROLE_PERMISSIONS[currentUserRole].canDeleteUsers.includes(targetUserRole);
}
