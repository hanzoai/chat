/**
 * MeiliSearch integration for the SQLite document store — the store-native
 * replacement for the mongoose `mongoMeili` plugin's save/delete hooks.
 *
 * MeiliSearch stays the search ENGINE; only its DATA SOURCE changes from mongoose
 * to the store. When Conversation/Message are served from SQLite (Mongo=0), the
 * mongoose schema hooks never fire, so this module drives Meili instead:
 *
 *   - live writes  → `DocModel.onMutate('upsert'|'delete', doc)` → Meili
 *     add/replace or delete, indexing the SAME fields the mongoose plugin did.
 *   - search       → `model.meiliSearch(q, params, populate)` queries Meili and
 *     hydrates the hits FROM THE STORE (not mongoose).
 *   - historical   → `backfillMeili(models)` reads convos+messages from the store
 *     and indexes them (the one-shot `config/backfill-meili.js` uses this).
 *
 * `attachMeili` is idempotent (a WeakSet guards re-wiring) and env-gated, so it is
 * safe to call from the app's model assembly on every `createModels`.
 */
import _ from 'lodash';
import { MeiliSearch, type Index } from 'meilisearch';
import { parseTextParts } from '@hanzochat/data-provider';
import logger from '~/config/meiliLogger';
import type { DocModel } from './DocModel';
import type { Doc } from './engine';

type MeiliIndexable = Record<string, unknown>;

interface MeiliCollectionConfig {
  /** Store model / CollectionSpec name. */
  modelName: string;
  /** MeiliSearch index name (matches the mongoose plugin's `indexName`). */
  indexName: string;
  /** Meili primary key (matches the mongoose plugin's `primaryKey`). */
  primaryKey: string;
  /**
   * Fields to index — the SAME set the mongoose plugin derived from the schema's
   * `meiliIndex: true` flags, in declaration order (primaryKey first), plus the
   * always-included `user` used for the `filter: user = "..."` query.
   */
  attributesToIndex: string[];
}

/**
 * Index config for the two searchable collections. Fields mirror
 * `schema/convo.ts` + `schema/message.ts` (`meiliIndex: true`) so the store
 * indexes byte-for-byte what the mongoose plugin indexed.
 */
const MEILI_COLLECTIONS: MeiliCollectionConfig[] = [
  {
    modelName: 'Conversation',
    indexName: 'convos',
    primaryKey: 'conversationId',
    attributesToIndex: ['conversationId', 'title', 'user', 'organization', 'tags'],
  },
  {
    modelName: 'Message',
    indexName: 'messages',
    primaryKey: 'messageId',
    attributesToIndex: [
      'messageId',
      'conversationId',
      'user',
      'organization',
      'sender',
      'text',
      'content',
    ],
  },
];

/**
 * Shapes a store document for the Meili index exactly as the mongoose plugin's
 * `preprocessObjectForIndex` did: pick the indexed attributes, drop `$`-prefixed
 * keys, sanitize `|` in conversationId, and flatten a `content` parts array into
 * a searchable `text` field.
 */
function preprocessForIndex(doc: Doc, attributesToIndex: string[]): MeiliIndexable {
  const object = _.omitBy(_.pick(doc, attributesToIndex), (_v, k) => k.startsWith('$')) as MeiliIndexable;

  if (
    typeof object.conversationId === 'string' &&
    object.conversationId.includes('|')
  ) {
    object.conversationId = object.conversationId.replace(/\|/g, '--');
  }

  if (Array.isArray(object.content)) {
    object.text = parseTextParts(object.content as Parameters<typeof parseTextParts>[0]);
    delete object.content;
  }

  return object;
}

/**
 * Binds one store collection to its MeiliSearch index. Live writes call
 * `onUpsert`/`onDelete`; reads call `search`. All Meili errors are logged and
 * swallowed (search is a non-authoritative index; the store is the source of
 * truth), matching the mongoose plugin's fail-open hooks.
 */
class MeiliCollectionSync {
  private readonly index: Index<MeiliIndexable>;

  constructor(
    private readonly client: MeiliSearch,
    private readonly config: MeiliCollectionConfig,
    private readonly model: DocModel,
  ) {
    this.index = client.index<MeiliIndexable>(config.indexName);
  }

  /** Idempotently ensure the index exists and `user` is filterable. */
  async ensureIndex(): Promise<void> {
    try {
      await this.index.getRawInfo();
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'index_not_found') {
        try {
          await this.client.createIndex(this.config.indexName, {
            primaryKey: this.config.primaryKey,
          });
          logger.info(`[meili] created index ${this.config.indexName}`);
        } catch (createError) {
          logger.debug(`[meili] index ${this.config.indexName} may already exist:`, createError);
        }
      } else {
        logger.error(`[meili] error checking index ${this.config.indexName}:`, error);
      }
    }
    try {
      await this.index.updateSettings({ filterableAttributes: ['user'] });
    } catch (settingsError) {
      logger.error(`[meili] error updating settings for ${this.config.indexName}:`, settingsError);
    }
  }

  /** Add-or-replace the document in the index (skip / evict TTL documents). */
  onUpsert(doc: Doc): void {
    // A doc with a TTL (`expiredAt`) is never indexed; if one gained a TTL on
    // update, evict any prior entry — mirrors the mongoose plugin's guard.
    if (doc.expiredAt != null) {
      this.onDelete(doc);
      return;
    }
    const object = preprocessForIndex(doc, this.config.attributesToIndex);
    if (object[this.config.primaryKey] == null) {
      return;
    }
    // `addDocuments` is add-or-replace keyed by primaryKey — idempotent for both
    // create and update, so no `_meiliIndex` bookkeeping is needed.
    this.index
      .addDocuments([object], { primaryKey: this.config.primaryKey })
      .catch((err: unknown) =>
        logger.error(`[meili] add to ${this.config.indexName} failed:`, err),
      );
  }

  /** Remove the document from the index by its primary key. */
  onDelete(doc: Doc): void {
    const key = this.keyOf(doc);
    if (key == null) {
      return;
    }
    this.index
      .deleteDocument(key)
      .catch((err: unknown) =>
        logger.error(`[meili] delete from ${this.config.indexName} failed:`, err),
      );
  }

  /**
   * The document's key AS THE INDEX HOLDS IT — derived through the same
   * `preprocessForIndex` that wrote it, so the two cannot disagree. Reading the
   * raw field instead would delete under an id that was never written whenever
   * preprocessing rewrites it (a conversationId carrying `|`, which Meili does
   * not admit in a primary key), and the real entry would survive every delete
   * for the life of the index. Only the key field is preprocessed, so this stays
   * cheap on a bulk delete.
   */
  private keyOf(doc: Doc): string | null {
    const key = preprocessForIndex(doc, [this.config.primaryKey])[this.config.primaryKey];
    return key == null ? null : String(key);
  }

  /**
   * Search the index, optionally hydrating hits FROM THE STORE. The store is the
   * source of truth: hits are merged over the store document (store fields first,
   * meili fields — incl. the derived `text` — win on overlap), and a hit with no
   * store document simply carries only the indexed fields (the message-search
   * route re-fetches from the store and drops orphans).
   */
  async search(
    q: string,
    params: Record<string, unknown>,
    populate: boolean,
  ): Promise<{ hits: Array<Record<string, unknown>> }> {
    const data = (await this.index.search(q, params)) as { hits: Array<Record<string, unknown>> };
    if (!populate || !Array.isArray(data.hits) || data.hits.length === 0) {
      return data;
    }
    const key = this.config.primaryKey;
    const ids = data.hits.map((h) => h[key]).filter((v) => v != null);
    const docs = ids.length
      ? ((await this.model.find({ [key]: { $in: ids } }).lean()) as Doc[])
      : [];
    const byKey = new Map(docs.map((d) => [String(d[key]), d]));
    data.hits = data.hits.map((hit) => {
      const original = byKey.get(String(hit[key]));
      return { ...(original ?? {}), ...hit };
    });
    return data;
  }

  /**
   * One-shot backfill: index every non-expired store document. Awaited (unlike
   * the live fire-and-forget path) so the caller gets an accurate count.
   */
  async backfill(batchSize: number): Promise<number> {
    const docs = (await this.model
      .find({ $or: [{ expiredAt: null }, { expiredAt: { $exists: false } }] })
      .lean()) as Doc[];
    let indexed = 0;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs
        .slice(i, i + batchSize)
        .map((d) => preprocessForIndex(d, this.config.attributesToIndex))
        .filter((o) => o[this.config.primaryKey] != null);
      if (batch.length === 0) {
        continue;
      }
      await this.index.addDocuments(batch, { primaryKey: this.config.primaryKey });
      indexed += batch.length;
    }
    return indexed;
  }
}

/** Search is enabled and MeiliSearch is configured (matches mongoMeili). */
export function isMeiliEnabled(): boolean {
  const searchEnabled =
    process.env.SEARCH != null && process.env.SEARCH.toLowerCase() === 'true';
  return (
    searchEnabled && process.env.INDEX_URL != null && process.env.INDEX_KEY != null
  );
}

function buildClient(client?: MeiliSearch): MeiliSearch {
  return (
    client ??
    new MeiliSearch({
      host: process.env.INDEX_URL as string,
      apiKey: process.env.INDEX_KEY as string,
    })
  );
}

/** Models already wired, so re-calling attachMeili (3x at boot) is a no-op. */
const attached = new WeakSet<object>();

/**
 * Wires MeiliSearch onto the Conversation/Message store models: their
 * `onMutate` drives live indexing and `meiliSearch` serves store-hydrated
 * search. Env-gated (no-op unless SEARCH + MEILI_* are set, or a `client` is
 * injected for tests) and idempotent.
 */
export function attachMeili(
  models: Record<string, DocModel | undefined>,
  opts: { client?: MeiliSearch } = {},
): void {
  if (!opts.client && !isMeiliEnabled()) {
    return;
  }
  const client = buildClient(opts.client);
  for (const config of MEILI_COLLECTIONS) {
    const model = models[config.modelName];
    if (!model || attached.has(model)) {
      continue;
    }
    const sync = new MeiliCollectionSync(client, config, model);
    model.onMutate = (change, doc) => {
      // Total by construction: the store calls this AFTER the write is on disk,
      // so anything raised here would fail a call that already succeeded. An
      // unreachable Meili costs a stale index entry and nothing else — the
      // request rejections are caught in onUpsert/onDelete, this catches the
      // preprocessing that runs before them.
      try {
        if (change === 'delete') {
          sync.onDelete(doc);
        } else {
          sync.onUpsert(doc);
        }
      } catch (err) {
        logger.error(`[meili] indexing ${config.indexName} failed:`, err);
      }
    };
    model.meiliSearch = (query, params, populate) =>
      sync.search(query, params ?? {}, populate ?? false);
    attached.add(model);
    void sync.ensureIndex();
  }
}

/**
 * One-shot backfill of MeiliSearch from the store — indexes existing convo +
 * message history so it becomes searchable after the flip. Returns a per-index
 * count. Used by `config/backfill-meili.js`.
 */
export async function backfillMeili(
  models: Record<string, DocModel | undefined>,
  opts: { client?: MeiliSearch; batchSize?: number } = {},
): Promise<Array<{ collection: string; indexed: number }>> {
  const client = buildClient(opts.client);
  const report: Array<{ collection: string; indexed: number }> = [];
  for (const config of MEILI_COLLECTIONS) {
    const model = models[config.modelName];
    if (!model) {
      continue;
    }
    const sync = new MeiliCollectionSync(client, config, model);
    await sync.ensureIndex();
    const indexed = await sync.backfill(opts.batchSize ?? 100);
    report.push({ collection: config.indexName, indexed });
  }
  return report;
}
