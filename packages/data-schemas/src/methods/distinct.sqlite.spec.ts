/**
 * Store-harness proof for `.distinct` on the SQLite DocModel — the P1 gate item.
 *
 * Two forms exist in prod and both must resolve against the store:
 *   - chained:  `Model.find(filter).distinct(field)`  (QueryBuilder.distinct)
 *       call sites: PermissionService.findPubliclyAccessibleResources,
 *       aclEntry.findAccessibleResources, agentCategory.getValidCategoryValues.
 *   - direct:   `Model.distinct(field, filter)`        (DocModel.distinct)
 *       call sites: prompt.getRandomPromptGroups, api/models/Prompt.js.
 *
 * The end-to-end assertion runs the REAL `findAccessibleResources` method
 * (`.find(...).distinct('resourceId')`) on SQLite, matching the PermissionService
 * behavior the gate requires.
 */
import { PermissionBits, PrincipalType, ResourceType } from 'librechat-data-provider';
import { createAclEntryMethods } from './aclEntry';
import { createSqliteHandle, type SqliteHandle } from '~/stores/sqlite';
import type { DocModel } from '~/stores/sqlite';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

const asStrings = (ids: unknown[]): string[] => ids.map((id) => String(id)).sort();

describe('SQLite DocModel .distinct', () => {
  let handle: SqliteHandle;

  beforeEach(() => {
    handle = createSqliteHandle(['AclEntry', 'Conversation']);
  });
  afterEach(() => handle.close());

  describe('QueryBuilder.distinct (chained after find)', () => {
    it('returns distinct scalar values honoring the filter', async () => {
      const Conversation = handle.models.Conversation as DocModel;
      await Conversation.create({ conversationId: 'c1', user: 'u1', model: 'a' });
      await Conversation.create({ conversationId: 'c2', user: 'u1', model: 'b' });
      await Conversation.create({ conversationId: 'c3', user: 'u1', model: 'a' });
      await Conversation.create({ conversationId: 'c4', user: 'u2', model: 'c' });

      const models = await Conversation.find({ user: 'u1' }).distinct('model');
      expect(asStrings(models)).toEqual(['a', 'b']);
    });

    it('supports a trailing .lean() (agentCategory chain)', async () => {
      const Conversation = handle.models.Conversation as DocModel;
      await Conversation.create({ conversationId: 'c1', user: 'u1', model: 'x' });
      await Conversation.create({ conversationId: 'c2', user: 'u1', model: 'x' });

      const models = await Conversation.find({ user: 'u1' }).distinct('model').lean();
      expect(asStrings(models)).toEqual(['x']);
    });

    it('distincts each element of an array field', async () => {
      const Conversation = handle.models.Conversation as DocModel;
      await Conversation.create({ conversationId: 'c1', user: 'u1', tags: ['red', 'blue'] });
      await Conversation.create({ conversationId: 'c2', user: 'u1', tags: ['blue', 'green'] });

      const tags = await Conversation.find({ user: 'u1' }).distinct('tags');
      expect(asStrings(tags)).toEqual(['blue', 'green', 'red']);
    });

    it('resolves a dotted field path', async () => {
      const Conversation = handle.models.Conversation as DocModel;
      await Conversation.create({ conversationId: 'c1', user: 'u1', model: 'm1' });
      const distinctModels = await Conversation.distinct('model', { user: 'u1' });
      expect(asStrings(distinctModels)).toEqual(['m1']);
    });
  });

  describe('aclEntry.findAccessibleResources (real method, .find().distinct)', () => {
    it('returns the distinct resourceIds whose permBits satisfy $bitsAllSet', async () => {
      const AclEntry = handle.models.AclEntry as DocModel;
      const grantedBy = 'aaaaaaaaaaaaaaaaaaaaaaaa';
      const principalId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
      const r1 = 'cccccccccccccccccccccccc';
      const r2 = 'dddddddddddddddddddddddd';
      const r3 = 'eeeeeeeeeeeeeeeeeeeeeeee';

      // r1 granted VIEW; r2 granted VIEW twice (dedupe); r3 granted only EDIT
      await AclEntry.create({
        principalType: PrincipalType.USER,
        principalId,
        resourceType: ResourceType.AGENT,
        resourceId: r1,
        permBits: PermissionBits.VIEW,
        grantedBy,
      });
      await AclEntry.create({
        principalType: PrincipalType.USER,
        principalId,
        resourceType: ResourceType.AGENT,
        resourceId: r2,
        permBits: PermissionBits.VIEW | PermissionBits.EDIT,
        grantedBy,
      });
      await AclEntry.create({
        principalType: PrincipalType.USER,
        principalId,
        resourceType: ResourceType.AGENT,
        resourceId: r2,
        permBits: PermissionBits.VIEW,
        grantedBy,
      });
      await AclEntry.create({
        principalType: PrincipalType.USER,
        principalId,
        resourceType: ResourceType.AGENT,
        resourceId: r3,
        permBits: PermissionBits.EDIT,
        grantedBy,
      });

      const methods = createAclEntryMethods({ models: handle.models });
      const viewable = await methods.findAccessibleResources(
        [{ principalType: PrincipalType.USER, principalId }],
        ResourceType.AGENT,
        PermissionBits.VIEW,
      );
      expect(asStrings(viewable)).toEqual(asStrings([r1, r2]));

      const editable = await methods.findAccessibleResources(
        [{ principalType: PrincipalType.USER, principalId }],
        ResourceType.AGENT,
        PermissionBits.EDIT,
      );
      expect(asStrings(editable)).toEqual(asStrings([r2, r3]));
    });
  });
});
