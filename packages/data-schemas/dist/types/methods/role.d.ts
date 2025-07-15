export declare function createRoleMethods(mongoose: typeof import('mongoose')): {
    listRoles: () => Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    initializeRoles: () => Promise<void>;
};
export type RoleMethods = ReturnType<typeof createRoleMethods>;
