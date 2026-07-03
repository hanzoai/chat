/**
 * Batch 7b contract proof: the aggregate primitive + Prompt/PromptGroup.
 *
 * - DocModel.aggregate: $match/$lookup/$unwind directly (the new primitive).
 * - getPromptGroup: the REAL method, which casts _id -> ObjectId and runs a
 *   $match/$lookup(from:'prompts', foreignField:'_id')/$unwind pipeline to
 *   populate productionPrompt. Proven end-to-end on SQLite.
 */
import { createPromptMethods } from './prompt';
import { createSqliteHandle, ObjectId, type SqliteHandle } from '~/stores/sqlite';
import type { DocModel } from '~/stores/sqlite';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

const deps = {
  removeAllPermissions: jest.fn(async () => undefined),
  getSoleOwnedResourceIds: jest.fn(async () => []),
} as never;

describe('DocModel.aggregate primitive', () => {
  let handle: SqliteHandle;
  let PromptGroup: DocModel;
  let Prompt: DocModel;

  beforeEach(() => {
    handle = createSqliteHandle(['PromptGroup', 'Prompt']);
    PromptGroup = handle.models.PromptGroup;
    Prompt = handle.models.Prompt;
  });
  afterEach(() => handle.close());

  it('$match → $lookup(_id) → $unwind joins the production prompt', async () => {
    const p = (await Prompt.create({ prompt: 'hello', author: 'a1', type: 'text' })) as {
      _id: string;
    };
    const g = (await PromptGroup.create({
      name: 'greetings',
      author: 'a1',
      productionId: p._id,
    })) as { _id: string };

    const result = await PromptGroup.aggregate([
      { $match: { _id: g._id } },
      {
        $lookup: {
          from: 'prompts',
          localField: 'productionId',
          foreignField: '_id',
          as: 'productionPrompt',
        },
      },
      { $unwind: { path: '$productionPrompt', preserveNullAndEmptyArrays: true } },
    ]);
    expect(result).toHaveLength(1);
    expect((result[0].productionPrompt as { prompt: string }).prompt).toBe('hello');
  });

  it('$unwind preserveNullAndEmptyArrays keeps a group with no production prompt', async () => {
    const g = (await PromptGroup.create({ name: 'orphan', author: 'a1' })) as { _id: string };
    const result = await PromptGroup.aggregate([
      { $match: { _id: g._id } },
      {
        $lookup: {
          from: 'prompts',
          localField: 'productionId',
          foreignField: '_id',
          as: 'productionPrompt',
        },
      },
      { $unwind: { path: '$productionPrompt', preserveNullAndEmptyArrays: true } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].productionPrompt).toBeUndefined();
  });
});

describe('getPromptGroup on SQLite (real method, aggregate join)', () => {
  let handle: SqliteHandle;
  let prompts: ReturnType<typeof createPromptMethods>;

  beforeEach(() => {
    handle = createSqliteHandle(['PromptGroup', 'Prompt']);
    prompts = createPromptMethods(handle, deps);
  });
  afterEach(() => handle.close());

  it('populates productionPrompt via the $lookup pipeline', async () => {
    const p = (await handle.models.Prompt.create({
      prompt: 'production body',
      author: '507f1f77bcf86cd799439011',
      type: 'text',
    })) as { _id: string };
    const g = (await handle.models.PromptGroup.create({
      name: 'grp',
      author: '507f1f77bcf86cd799439011',
      productionId: new ObjectId(p._id),
    })) as { _id: string };

    // real method casts _id string -> ObjectId, aggregates, unwinds
    const group = (await prompts.getPromptGroup({ _id: g._id })) as {
      name: string;
      productionPrompt: { prompt: string };
      author: string;
    } | null;

    expect(group?.name).toBe('grp');
    expect(group?.productionPrompt.prompt).toBe('production body');
    expect(typeof group?.author).toBe('string');
  });

  it('returns the group with no productionPrompt when productionId is unset', async () => {
    const g = (await handle.models.PromptGroup.create({
      name: 'empty',
      author: '507f1f77bcf86cd799439011',
    })) as { _id: string };
    const group = (await prompts.getPromptGroup({ _id: g._id })) as {
      name: string;
      productionPrompt?: unknown;
    } | null;
    expect(group?.name).toBe('empty');
    expect(group?.productionPrompt).toBeUndefined();
  });
});
