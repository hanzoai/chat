import { roleDefaults, SystemRoles } from 'librechat-data-provider';
import type { DataHandle } from '~/common/dataHandle';

// Factory function that takes mongoose instance and returns the methods
export function createRoleMethods(handle: DataHandle) {
  /**
   * Initialize default roles in the system.
   * Creates the default roles (ADMIN, USER) if they don't exist in the database.
   * Updates existing roles with new permission types if they're missing.
   */
  async function initializeRoles() {
    const Role = handle.models.Role;

    for (const roleName of [SystemRoles.ADMIN, SystemRoles.USER]) {
      const role = await Role.findOne({ name: roleName }).lean();
      const defaultPerms = roleDefaults[roleName].permissions;

      if (!role) {
        await Role.create(roleDefaults[roleName]);
        continue;
      }
      const permissions: Record<string, unknown> = { ...(role.permissions ?? {}) };
      for (const permType of Object.keys(defaultPerms)) {
        const cur = permissions[permType] as Record<string, unknown> | undefined;
        if (cur == null || Object.keys(cur).length === 0) {
          permissions[permType] = defaultPerms[permType as keyof typeof defaultPerms];
        }
      }
      await Role.updateOne({ name: roleName }, { $set: { permissions } });
    }
  }

  /**
   * List all roles in the system (for testing purposes)
   * Returns an array of all roles with their names and permissions
   */
  async function listRoles() {
    const Role = handle.models.Role;
    return await Role.find({}).select('name permissions').lean();
  }

  // Return all methods you want to expose
  return {
    listRoles,
    initializeRoles,
  };
}

export type RoleMethods = ReturnType<typeof createRoleMethods>;
