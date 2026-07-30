const { getUserPluginAuthValue } = require('~/server/services/PluginService');

/**
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string[]} params.authFields
 * @param {Set<string>} [params.optional]
 * @param {boolean} [params.throwError]
 * @returns
 */
const loadAuthValues = async ({ userId, authFields, optional, throwError = true }) => {
  let authValues = {};

  /**
   * Finds the first non-empty value for the given authentication field, supporting alternate fields.
   * @param {string[]} fields Array of strings representing the authentication fields. Supports alternate fields delimited by "||".
   * @returns {Promise<{ authField: string, authValue: string} | null>} An object containing the authentication field and value, or null if not found.
   */
  const findAuthValue = async (fields) => {
    for (const field of fields) {
      let value = process.env[field];
      if (value) {
        return { authField: field, authValue: value };
      }
      try {
        value = await getUserPluginAuthValue(userId, field, throwError);
      } catch (err) {
        if (optional && optional.has(field)) {
          return { authField: field, authValue: undefined };
        }
        if (field === fields[fields.length - 1] && !value) {
          throw err;
        }
      }
      if (value) {
        return { authField: field, authValue: value };
      }
    }
    return null;
  };

  for (let authField of authFields) {
    /**
     * A field that is not a string is NOT an auth field, and asking for its value
     * is not a failure worth an error-level log.
     *
     * `@hanzochat/agents@3.2.63` exports an `EnvVar` with only CODE_BASEURL and
     * CODE_API_RUN_TIMEOUT_MS — `EnvVar.CODE_API_KEY` is `undefined`, at five call
     * sites. So `authFields` arrives as `[undefined]` and this line threw
     * `Cannot read properties of undefined (reading 'split')` on every
     * `/v1/chat/agents/tools/execute_code/auth`. The throw was caught upstream and
     * answered `200 {authenticated:false}` — the correct answer — but it logged at
     * ERROR on every page load, which is how real errors get buried.
     *
     * Skipping is exactly the honest outcome: an unnamed field has no value, which
     * is the same `authenticated:false` the caller already reported. The MISSING
     * enum member is a separate, upstream defect (the intended literal is
     * 'CODE_API_KEY', per packages/api/src/tools/classification.spec.ts) and needs
     * an `@hanzochat/agents` bump — it is not something this loop can invent.
     */
    if (typeof authField !== 'string' || authField.length === 0) {
      continue;
    }
    const fields = authField.split('||');
    const result = await findAuthValue(fields);
    if (result) {
      authValues[result.authField] = result.authValue;
    }
  }

  return authValues;
};

module.exports = {
  loadAuthValues,
};
