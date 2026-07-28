import type * as t from '~/types';
import mongoMeili from '~/models/plugins/mongoMeili';
import messageSchema from '~/schema/message';

/**
 * Creates or returns the Message model using the provided mongoose instance and schema
 */
export function createMessageModel(mongoose: typeof import('mongoose')) {
  if (process.env.INDEX_URL && process.env.INDEX_KEY) {
    messageSchema.plugin(mongoMeili, {
      mongoose,
      host: process.env.INDEX_URL,
      apiKey: process.env.INDEX_KEY,
      indexName: 'messages',
      primaryKey: 'messageId',
    });
  }

  return mongoose.models.Message || mongoose.model<t.IMessage>('Message', messageSchema);
}
