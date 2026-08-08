/**
 * The fixture `e2e/specs/live-run.spec.ts` runs against.
 *
 * That spec needs two things this fork gives no other way to get:
 *
 *   A PRINCIPAL. There is no local login route — IAM OIDC or guest, nothing
 *   else — so a session is MINTED here rather than typed into a form. Note that
 *   `setAuthTokens` ROTATES the refresh token: the value printed below is good
 *   for one boot, so run this immediately before the test, not once a day.
 *
 *   A RUN IN FLIGHT. A tool call mid-command is a message whose `progress` is
 *   under 1, whose `output` is empty, and which carries a `run` — exactly what
 *   the server puts on the wire just before a command starts. Seeded into the
 *   real store so the component tree renders it through the real API.
 *
 * Both write the SAME SQLite file the server opens, and the store is an
 * in-process writer, so this MUST run before the server starts — or against a
 * server that is already up, which is what it is used for here.
 *
 *   node e2e/setup/live-run.js        # prints REFRESH=<token>
 */
const path = require('path');
require('module-alias').addAlias('~', path.join(__dirname, '..', '..', 'api'));
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const EMAIL = 'e2e@hanzo.ai';
const CONVO = '11111111-1111-4111-8111-111111111111';

(async () => {
  const api = path.join(__dirname, '..', '..', 'api');
  const { findUser, saveMessage } = require(path.join(api, 'models'));
  const { saveConvo } = require(path.join(api, 'models/Conversation'));
  const { registerUser, setAuthTokens } = require(path.join(api, 'server/services/AuthService'));

  let user = await findUser({ email: EMAIL });
  if (!user) {
    await registerUser({
      email: EMAIL,
      password: 'IloveHanzo2026!!',
      confirm_password: 'IloveHanzo2026!!',
      name: 'E2E',
      username: 'e2e',
    });
    user = await findUser({ email: EMAIL });
  }
  const uid = String(user._id ?? user.id);
  const req = { user: { id: uid } };

  await saveConvo(req, { conversationId: CONVO, title: 'live run', endpoint: 'hanzo', model: 'zen' }, { context: 'e2e' });
  await saveMessage(req, {
    messageId: '22222222-2222-4222-8222-222222222222',
    conversationId: CONVO,
    parentMessageId: '00000000-0000-0000-0000-000000000000',
    sender: 'User',
    text: 'run the build',
    isCreatedByUser: true,
    user: uid,
  });
  await saveMessage(req, {
    messageId: '33333333-3333-4333-8333-333333333333',
    conversationId: CONVO,
    parentMessageId: '22222222-2222-4222-8222-222222222222',
    sender: 'Hanzo',
    isCreatedByUser: false,
    user: uid,
    model: 'zen',
    endpoint: 'hanzo',
    text: '',
    content: [
      {
        type: 'tool_call',
        tool_call: {
          id: 'call_live_1',
          name: 'execute_code',
          args: JSON.stringify({ lang: 'py', code: 'print(build())' }),
          // Under 1 and no output: the tool has not returned.
          progress: 0.1,
          run: { session: 'sess_chat_1', sandbox: 'sbx_chat_1' },
        },
      },
    ],
  });

  const cookies = {};
  await setAuthTokens(uid, { cookie: (n, v) => (cookies[n] = v) });
  console.log('REFRESH=' + (cookies.refreshToken || ''));
  process.exit(0);
})().catch((e) => {
  console.error('live-run fixture failed:', e.message);
  process.exit(1);
});
