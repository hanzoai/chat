import type { DataHandle } from '~/common/dataHandle';
export declare function createRoleMethods(handle: DataHandle): {
    listRoles: () => Promise<any>;
    initializeRoles: () => Promise<void>;
};
export type RoleMethods = ReturnType<typeof createRoleMethods>;
