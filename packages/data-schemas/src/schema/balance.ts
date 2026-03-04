import { Schema } from 'mongoose';
import type * as t from '~/types';

const balanceSchema = new Schema<t.IBalance>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true,
  },
  // 1000 tokenCredits = 1 mill ($0.001 USD)
  tokenCredits: {
    type: Number,
    default: 0,
  },
  // Automatic refill settings
  autoRefillEnabled: {
    type: Boolean,
    default: false,
  },
  refillIntervalValue: {
    type: Number,
    default: 30,
  },
  refillIntervalUnit: {
    type: String,
    enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
    default: 'days',
  },
  lastRefill: {
    type: Date,
    default: Date.now,
  },
  // amount to add on each refill
  refillAmount: {
    type: Number,
    default: 0,
  },
  // Credit expiry: date when signup credits expire
  expiresAt: {
    type: Date,
    default: null,
  },
  // When credits were initially granted
  creditsGrantedAt: {
    type: Date,
    default: null,
  },
  // Credit type: trial (signup), paid (purchased), or combined
  creditType: {
    type: String,
    enum: ['trial', 'paid', 'combined'],
    default: 'trial',
  },
  // Billing tier ID from Commerce (free, starter, pro, enterprise)
  tierId: {
    type: String,
    default: 'free',
  },
  // Maps to Commerce userId (e.g. "hanzo/alice")
  commerceUserId: {
    type: String,
    default: null,
  },
});

export default balanceSchema;
