export declare function createRoleMethods(mongoose: typeof import('mongoose')): {
    listRoles: () => Promise<any[]>;
    initializeRoles: () => Promise<void>;
};
export type RoleMethods = ReturnType<typeof createRoleMethods>;
