import { Schema } from 'mongoose';
import { SystemRoles } from '@hanzochat/data-provider';
import { IUser } from '~/types';

// Session sub-schema
const SessionSchema = new Schema(
  {
    refreshToken: {
      type: String,
      default: '',
    },
  },
  { _id: false },
);

// Backup code sub-schema
const BackupCodeSchema = new Schema(
  {
    codeHash: { type: String, required: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
    },
    username: {
      type: String,
      lowercase: true,
      default: '',
    },
    email: {
      type: String,
      required: [true, "can't be blank"],
      lowercase: true,
      unique: true,
      match: [/\S+@\S+\.\S+/, 'is invalid'],
      index: true,
    },
    emailVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    // No local password credential. Identity is owned by Hanzo IAM (hanzo.id):
    // authenticated chat is OIDC-only (provider='openid', keyed by openidId=sub),
    // so the User doc is a thin IAM projection, never a second credential store.
    // Local email registration / password reset are removed (see AuthService).
    avatar: {
      type: String,
      required: false,
    },
    provider: {
      type: String,
      required: true,
      default: 'local',
    },
    role: {
      type: String,
      default: SystemRoles.USER,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },
    openidId: {
      type: String,
      unique: true,
      sparse: true,
    },
    samlId: {
      type: String,
      unique: true,
      sparse: true,
    },
    ldapId: {
      type: String,
      unique: true,
      sparse: true,
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true,
    },
    discordId: {
      type: String,
      unique: true,
      sparse: true,
    },
    appleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    plugins: {
      type: Array,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    totpSecret: {
      type: String,
      select: false,
    },
    backupCodes: {
      type: [BackupCodeSchema],
      select: false,
    },
    /**
     * LEGACY, and empty. Sessions live in their own collection now
     * (`schema/session.ts`), which stores a `refreshTokenHash` — never the
     * token. This array predates that and holds `refreshToken` as a plain
     * String, so it is the one credential-shaped field on this schema.
     *
     * `select: false`, matching `backupCodes` above, for the reason
     * `backupCodes` has it: a field the default projection returns is a field
     * every future reader has to remember to strip. This one was not excluded,
     * and it rode `GET /v1/chat/user` and every `/auth/refresh` into the
     * browser until `services/publicUser` started projecting. This is the
     * second lock, at the layer that cannot be bypassed by a new endpoint.
     *
     * Measured in production before changing it: 28 users, ZERO with a
     * non-empty array, zero plaintext tokens at rest, against 130 rows in the
     * hashed `Session` store. Nothing writes it and nothing reads it — the only
     * `.refreshToken` reads in the tree are session objects and local
     * variables, not this field.
     *
     * DELETING it is the honest end state and is deliberately not done here:
     * chat is OSS, and another deployment may still hold rows this fork has
     * migrated past. Dropping the field would orphan that data silently. The
     * precondition for removal is a migration that clears it, not a grep of
     * this repository.
     */
    refreshToken: {
      type: [SessionSchema],
      select: false,
    },
    expiresAt: {
      type: Date,
      expires: 604800, // 7 days in seconds
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    /**
     * Whether this account has been shown the welcome card.
     *
     * NO DEFAULT, deliberately. `false` means "show it"; ABSENT means the
     * account predates the card and never sees one. A default of `false` would
     * hand every existing user a first-run greeting on the deploy that shipped
     * it. `reconcileUser` writes `false` at creation, so exactly the accounts
     * born from here on qualify — which is what "when users first sign up"
     * means. The client tests `=== false` for the same reason.
     */
    toured: {
      type: Boolean,
    },
    personalization: {
      type: {
        memories: {
          type: Boolean,
          default: true,
        },
      },
      default: {},
    },
    favorites: {
      type: [
        {
          _id: false,
          agentId: String, // for agent
          skillId: String, // for skill
          spec: String, // for model spec
          model: String, // for model
          endpoint: String, // for model
        },
      ],
      default: [],
    },
    /** Field for external source identification (for consistency with TPrincipal schema) */
    idOnTheSource: {
      type: String,
      sparse: true,
    },
    /** Organization the user belongs to (from Hanzo IAM 'owner' claim) */
    organization: {
      type: String,
      index: true,
    },
    /** User's title/role within their organization */
    organizationTitle: {
      type: String,
    },
    /** User's tag within their organization (e.g. 'founder', 'member') */
    organizationTag: {
      type: String,
    },
    /** Org's default project from the Hanzo IAM 'project' claim; the gateway mints X-Project-Id from it */
    project: {
      type: String,
      index: true,
    },
    /** Org/role memberships from the Hanzo IAM 'groups' claim */
    groups: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

export default userSchema;
