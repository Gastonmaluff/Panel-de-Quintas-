export const ROLES = {
  admin: "admin",
  manager: "manager",
};

export const ROLE_LABELS = {
  [ROLES.admin]: "Dueño / Admin",
  [ROLES.manager]: "Encargado",
};

const ROLE_PERMISSIONS = {
  [ROLES.admin]: ["all"],
  [ROLES.manager]: [
    "reservations:read",
    "reservations:create",
    "reservations:update_basic",
    "payments:create",
    "receipts:upload",
    "calendar:read",
    "calendar:create_reservation",
    "expenses:read",
    "expenses:create",
    "tasks:read",
    "tasks:complete",
    "availability:share",
    "activityLog:create",
  ],
};

export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes("all") || permissions.includes(permission);
}

export function isAdminRole(role) {
  return role === ROLES.admin;
}
