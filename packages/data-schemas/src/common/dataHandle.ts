/**
 * The minimal storage handle the data-access methods depend on: a registry of
 * collection models, each exposing the Model API the methods call. This is the
 * migration seam — it is satisfied structurally by both:
 *   - mongoose (`mongoose.models`), the legacy backend, and
 *   - the SQLite document store (`createSqliteHandle().models`), the new backend.
 *
 * Methods take a `DataHandle` instead of `typeof import('mongoose')` so a domain
 * can be flipped from mongoose to SQLite/Base by swapping the handle, with no
 * change to the method logic.
 */
export interface DataHandle {
  models: Record<string, unknown>;
  /**
   * BSON value helpers. Satisfied by mongoose (`mongoose.Types`) and by the
   * SQLite handle (a hex-string ObjectId shim). Optional — only method files
   * that construct ObjectIds (Skill, MCPServer) read it.
   */
  Types?: { ObjectId: new (id?: string | { toHexString(): string }) => unknown };
}
