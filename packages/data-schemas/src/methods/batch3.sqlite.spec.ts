/**
 * Batch 3 contract proof: Project on the SQLite document store.
 *
 * Project's methods live in the app layer (api/models/Project.js), not
 * data-schemas — so this exercises that file's EXACT DB operations against the
 * store: getProjectByName (findOneAndUpdate upsert), addGroupIdsToProject
 * ($addToSet $each), removeGroupIdsFromProject ($pull $in), removeGroupFrom
 * AllProjects (updateMany $pull), and findById reads. Proving the store backs
 * Project's real behavior when CHAT_STORE_SQLITE flips it.
 *
 * Prompt / PromptGroup are intentionally NOT in this batch: they construct
 * mongoose.Types.ObjectId, use an aggregate $lookup/$unwind pipeline + populate
 * and manual tenant/ACL filtering (accessibleIds: ObjectId[]) — they need an
 * aggregate primitive, not the mechanical recipe. Deferred with rationale.
 */
import { createSqliteHandle, type SqliteHandle } from '~/stores/sqlite';
import type { DocModel } from '~/stores/sqlite';

const GLOBAL_PROJECT_NAME = 'instance';

describe('Project on SQLite (mirrors api/models/Project.js operations)', () => {
  let handle: SqliteHandle;
  let Project: DocModel;

  beforeEach(() => {
    handle = createSqliteHandle(['Project']);
    Project = handle.models.Project;
  });
  afterEach(() => handle.close());

  // getProjectByName: findOneAndUpdate({name}, {$setOnInsert:{name}}, {new, upsert})
  async function getProjectByName(name: string, fields = ['name', 'promptGroupIds', 'agentIds']) {
    return Project.findOneAndUpdate(
      { name },
      { $setOnInsert: { name } },
      { new: true, upsert: name === GLOBAL_PROJECT_NAME },
    )
      .select(fields.join(' '))
      .lean();
  }

  it('getProjectByName upserts the global project with default arrays', async () => {
    const p = (await getProjectByName(GLOBAL_PROJECT_NAME)) as {
      name: string;
      promptGroupIds: string[];
      agentIds: string[];
      _id: string;
    };
    expect(p.name).toBe(GLOBAL_PROJECT_NAME);
    expect(p.promptGroupIds).toEqual([]);
    expect(p.agentIds).toEqual([]);
    // second call returns the same row (no duplicate)
    const again = (await getProjectByName(GLOBAL_PROJECT_NAME)) as { _id: string };
    expect(again._id).toBe(p._id);
    expect(await Project.countDocuments({})).toBe(1);
  });

  it('addGroupIdsToProject $addToSet $each; removeGroupIdsFromProject $pull $in', async () => {
    const created = (await Project.create({ name: 'proj', promptGroupIds: [], agentIds: [] })) as {
      _id: string;
    };
    // addGroupIdsToProject
    await Project.findByIdAndUpdate(created._id, {
      $addToSet: { promptGroupIds: { $each: ['g1', 'g2', 'g1'] } },
    });
    let p = (await Project.findById(created._id).lean()) as { promptGroupIds: string[] };
    expect(p.promptGroupIds).toEqual(['g1', 'g2']); // deduped

    // removeGroupIdsFromProject
    await Project.findByIdAndUpdate(created._id, {
      $pull: { promptGroupIds: { $in: ['g1'] } },
    });
    p = (await Project.findById(created._id).lean()) as { promptGroupIds: string[] };
    expect(p.promptGroupIds).toEqual(['g2']);
  });

  it('removeGroupFromAllProjects updateMany $pull across projects', async () => {
    await Project.create({ name: 'a', promptGroupIds: ['x', 'y'], agentIds: [] });
    await Project.create({ name: 'b', promptGroupIds: ['x'], agentIds: [] });
    await Project.updateMany({}, { $pull: { promptGroupIds: 'x' } });
    const a = (await Project.findOne({ name: 'a' }).lean()) as { promptGroupIds: string[] };
    const b = (await Project.findOne({ name: 'b' }).lean()) as { promptGroupIds: string[] };
    expect(a.promptGroupIds).toEqual(['y']);
    expect(b.promptGroupIds).toEqual([]);
  });
});
