/**
 * Move pre-tenancy S3 objects under their owning org's prefix.
 *
 * New uploads are written to `t/<org>/<basePath>/<userId>/<file>` (see getS3Key).
 * Objects written before that keep the flat `<basePath>/<userId>/<file>` key, so
 * this backfills the bucket to one shape.
 *
 * The org is read from IAM, never from a stored tenant field: each file's owning
 * user carries `organization`, the projection of the verified IAM `owner` claim.
 * A user with no IAM org is SKIPPED — there is nothing to scope them to, and
 * inventing a value here would be inventing tenancy.
 *
 * Safety:
 *  - DRY RUN by default; pass `--apply` to actually copy.
 *  - Copy-then-verify-then-delete. The source is removed only after the
 *    destination is confirmed present, so an interrupted run can be re-run.
 *  - Re-runnable: an object already at its org key is left alone.
 *  - Reads keep working throughout — getS3URL falls back to the flat key while a
 *    file is still un-migrated, and refreshS3Url derives keys from the stored URL.
 *
 * Usage:
 *   node api/server/services/Files/S3/migrateToOrgKeys.js            # dry run
 *   node api/server/services/Files/S3/migrateToOrgKeys.js --apply    # perform
 *   node api/server/services/Files/S3/migrateToOrgKeys.js --apply --limit 100
 */
const path = require('path');
const mongoose = require('mongoose');
const {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const { initializeS3 } = require('@hanzochat/api');
const { logger } = require('@hanzochat/data-schemas');

const bucketName = process.env.AWS_BUCKET_NAME;
const TENANT_PREFIX = 't/';

const argHas = (flag) => process.argv.includes(flag);
const argValue = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

/**
 * Map userId -> IAM org for every user that has one. One pass, so the migration
 * does not issue a query per object.
 */
async function loadUserOrgs() {
  const users = await mongoose.connection
    .collection('users')
    .find({ organization: { $exists: true, $ne: '' } }, { projection: { organization: 1 } })
    .toArray();
  const orgs = new Map();
  for (const u of users) {
    orgs.set(u._id.toString(), u.organization);
  }
  return orgs;
}

/** Every object currently at a flat (un-scoped) key. */
async function* listFlatObjects(s3) {
  let ContinuationToken;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucketName, ContinuationToken }),
    );
    for (const obj of page.Contents ?? []) {
      if (!obj.Key.startsWith(TENANT_PREFIX)) {
        yield obj.Key;
      }
    }
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);
}

/** `<basePath>/<userId>/<fileName...>` — the historical flat key shape. */
function parseFlatKey(key) {
  const parts = key.split('/');
  if (parts.length < 3) {
    return null;
  }
  const [basePath, userId, ...rest] = parts;
  return { basePath, userId, fileName: rest.join('/') };
}

async function objectExists(s3, Key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const apply = argHas('--apply');
  const limit = parseInt(argValue('--limit', '0'), 10) || Infinity;

  if (!bucketName) {
    throw new Error('AWS_BUCKET_NAME is not set');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const s3 = initializeS3();
  if (!s3) {
    throw new Error('S3 is not initialized (check S3/AWS credentials)');
  }

  const orgs = await loadUserOrgs();
  logger.info(
    `[migrateToOrgKeys] ${apply ? 'APPLY' : 'DRY RUN'} — ${orgs.size} users carry an IAM org`,
  );

  const stats = { scanned: 0, moved: 0, skippedNoOrg: 0, skippedShape: 0, failed: 0 };

  for await (const key of listFlatObjects(s3)) {
    if (stats.scanned >= limit) {
      break;
    }
    stats.scanned++;

    const parsed = parseFlatKey(key);
    if (!parsed) {
      stats.skippedShape++;
      continue;
    }

    const org = orgs.get(parsed.userId);
    if (!org) {
      // No IAM org for this owner — nothing to scope to. Left exactly as-is.
      stats.skippedNoOrg++;
      continue;
    }

    const destKey = `${TENANT_PREFIX}${org}/${key}`;
    if (!apply) {
      logger.info(`[migrateToOrgKeys] would move: ${key} -> ${destKey}`);
      stats.moved++;
      continue;
    }

    try {
      if (await objectExists(s3, destKey)) {
        // A previous run already placed it; drop the leftover source.
        await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
        stats.moved++;
        continue;
      }
      await s3.send(
        new CopyObjectCommand({
          Bucket: bucketName,
          CopySource: `${bucketName}/${key}`,
          Key: destKey,
        }),
      );
      // Verify before removing the only remaining copy.
      if (!(await objectExists(s3, destKey))) {
        throw new Error('destination missing after copy');
      }
      await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
      stats.moved++;
    } catch (err) {
      stats.failed++;
      logger.error(`[migrateToOrgKeys] FAILED ${key} -> ${destKey}: ${err.message}`);
    }
  }

  logger.info(
    `[migrateToOrgKeys] done — scanned=${stats.scanned} moved=${stats.moved} ` +
      `skipped(no IAM org)=${stats.skippedNoOrg} skipped(shape)=${stats.skippedShape} failed=${stats.failed}`,
  );
  if (!apply) {
    logger.info('[migrateToOrgKeys] DRY RUN — re-run with --apply to perform the move');
  }

  await mongoose.disconnect();
  process.exit(stats.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch((err) => {
    logger.error(`[migrateToOrgKeys] ${err.stack || err.message}`);
    process.exit(1);
  });
}

module.exports = { parseFlatKey };
