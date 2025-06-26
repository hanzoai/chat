# Changelog

All notable changes to this project will be documented in this file.






## [Unreleased]

### ✨ New Features

<<<<<<< HEAD
- ✨ feat: implement search parameter updates by **@mawburn** in [#7151](https://github.com/hanzoai/Chat/pull/7151)
- 🎏 feat: Add MCP support for Streamable HTTP Transport by **@benverhees** in [#7353](https://github.com/hanzoai/Chat/pull/7353)
- 🔒 feat: Add Content Security Policy using Helmet middleware by **@rubentalstra** in [#7377](https://github.com/hanzoai/Chat/pull/7377)
- ✨ feat: Add Normalization for MCP Server Names by **@hanzoai** in [#7421](https://github.com/hanzoai/Chat/pull/7421)
- 📊 feat: Improve Helm Chart by **@hofq** in [#3638](https://github.com/hanzoai/Chat/pull/3638)
- 🦾 feat: Claude-4 Support by **@hanzoai** in [#7509](https://github.com/hanzoai/Chat/pull/7509)
- 🪨 feat: Bedrock Support for Claude-4 Reasoning by **@hanzoai** in [#7517](https://github.com/hanzoai/Chat/pull/7517)

### 🌍 Internationalization

- 🌍 i18n: Add `Danish` and `Czech` and `Catalan` localization support by **@rubentalstra** in [#7373](https://github.com/hanzoai/Chat/pull/7373)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#7375](https://github.com/hanzoai/Chat/pull/7375)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#7468](https://github.com/hanzoai/Chat/pull/7468)

### 🔧 Fixes

- 💬 fix: update aria-label for accessibility in ConvoLink component by **@berry-13** in [#7320](https://github.com/hanzoai/Chat/pull/7320)
- 🔑 fix: use `apiKey` instead of `openAIApiKey` in OpenAI-like Config by **@hanzoai** in [#7337](https://github.com/hanzoai/Chat/pull/7337)
- 🔄 fix: update navigation logic in `useFocusChatEffect` to ensure correct search parameters are used by **@mawburn** in [#7340](https://github.com/hanzoai/Chat/pull/7340)
- 🔄 fix: Improve MCP Connection Cleanup by **@hanzoai** in [#7400](https://github.com/hanzoai/Chat/pull/7400)
- 🛡️ fix: Preset and Validation Logic for URL Query Params by **@hanzoai** in [#7407](https://github.com/hanzoai/Chat/pull/7407)
- 🌘 fix: artifact of preview text is illegible in dark mode by **@nhtruong** in [#7405](https://github.com/hanzoai/Chat/pull/7405)
- 🛡️ fix: Temporarily Remove CSP until Configurable by **@hanzoai** in [#7419](https://github.com/hanzoai/Chat/pull/7419)
- 💽 fix: Exclude index page `/` from static cache settings by **@sbruel** in [#7382](https://github.com/hanzoai/Chat/pull/7382)

### ⚙️ Other Changes

- 📜 docs: CHANGELOG for release v0.7.8 by **@github-actions[bot]** in [#7290](https://github.com/hanzoai/Chat/pull/7290)
- 📦 chore: Update API Package Dependencies by **@hanzoai** in [#7359](https://github.com/hanzoai/Chat/pull/7359)
- 📜 docs: Unreleased Changelog by **@github-actions[bot]** in [#7321](https://github.com/hanzoai/Chat/pull/7321)
- 📜 docs: Unreleased Changelog by **@github-actions[bot]** in [#7434](https://github.com/hanzoai/Chat/pull/7434)
- 🛡️ chore: `multer` v2.0.0 for CVE-2025-47935 and CVE-2025-47944 by **@hanzoai** in [#7454](https://github.com/hanzoai/Chat/pull/7454)
- 📂 refactor: Improve `FileAttachment` & File Form Deletion by **@hanzoai** in [#7471](https://github.com/hanzoai/Chat/pull/7471)
- 📊 chore: Remove Old Helm Chart by **@hofq** in [#7512](https://github.com/hanzoai/Chat/pull/7512)
- 🪖 chore: bump helm app version to v0.7.8 by **@austin-barrington** in [#7524](https://github.com/hanzoai/Chat/pull/7524)



---
## [v0.7.8] - 

Changes from v0.7.8-rc1 to v0.7.8.

### ✨ New Features

- ✨ feat: Enhance form submission for touch screens by **@berry-13** in [#7198](https://github.com/hanzoai/Chat/pull/7198)
- 🔍 feat: Additional Tavily API Tool Parameters by **@glowforge-opensource** in [#7232](https://github.com/hanzoai/Chat/pull/7232)
- 🐋 feat: Add python to Dockerfile for increased MCP compatibility by **@technicalpickles** in [#7270](https://github.com/hanzoai/Chat/pull/7270)

### 🔧 Fixes

- 🔧 fix: Google Gemma Support & OpenAI Reasoning Instructions by **@hanzoai** in [#7196](https://github.com/hanzoai/Chat/pull/7196)
- 🛠️ fix: Conversation Navigation State by **@hanzoai** in [#7210](https://github.com/hanzoai/Chat/pull/7210)
- 🔄 fix: o-Series Model Regex for System Messages by **@hanzoai** in [#7245](https://github.com/hanzoai/Chat/pull/7245)
- 🔖 fix: Custom Headers for Initial MCP SSE Connection by **@hanzoai** in [#7246](https://github.com/hanzoai/Chat/pull/7246)
- 🛡️ fix: Deep Clone `MCPOptions` for User MCP Connections by **@hanzoai** in [#7247](https://github.com/hanzoai/Chat/pull/7247)
- 🔄 fix: URL Param Race Condition and File Draft Persistence by **@hanzoai** in [#7257](https://github.com/hanzoai/Chat/pull/7257)
- 🔄 fix: Assistants Endpoint & Minor Issues by **@hanzoai** in [#7274](https://github.com/hanzoai/Chat/pull/7274)
- 🔄 fix: Ollama Think Tag Edge Case with Tools by **@hanzoai** in [#7275](https://github.com/hanzoai/Chat/pull/7275)

### ⚙️ Other Changes

- 📜 docs: CHANGELOG for release v0.7.8-rc1 by **@github-actions[bot]** in [#7153](https://github.com/hanzoai/Chat/pull/7153)
- 🔄 refactor: Artifact Visibility Management by **@hanzoai** in [#7181](https://github.com/hanzoai/Chat/pull/7181)
- 📦 chore: Bump Package Security by **@hanzoai** in [#7183](https://github.com/hanzoai/Chat/pull/7183)
- 🌿 refactor: Unmount Fork Popover on Hide for Better Performance by **@hanzoai** in [#7189](https://github.com/hanzoai/Chat/pull/7189)
- 🧰 chore: ESLint configuration to enforce Prettier formatting rules by **@mawburn** in [#7186](https://github.com/hanzoai/Chat/pull/7186)
- 🎨 style: Improve KaTeX Rendering for LaTeX Equations by **@andresgit** in [#7223](https://github.com/hanzoai/Chat/pull/7223)
- 📝 docs: Update `.env.example` Google models by **@marlonka** in [#7254](https://github.com/hanzoai/Chat/pull/7254)
- 💬 refactor: MCP Chat Visibility Option, Google Rates, Remove OpenAPI Plugins by **@hanzoai** in [#7286](https://github.com/hanzoai/Chat/pull/7286)
- 📜 docs: Unreleased Changelog by **@github-actions[bot]** in [#7214](https://github.com/hanzoai/Chat/pull/7214)



[See full release details][release-v0.7.8]

[release-v0.7.8]: https://github.com/hanzoai/Chat/releases/tag/v0.7.8

---
## [v0.7.8-rc1] - 

Changes from v0.7.7 to v0.7.8-rc1.

### ✨ New Features

- 🔍 feat: Mistral OCR API / Upload Files as Text by **@hanzoai** in [#6274](https://github.com/hanzoai/Chat/pull/6274)
- 🤖 feat: Support OpenAI Web Search models by **@hanzoai** in [#6313](https://github.com/hanzoai/Chat/pull/6313)
- 🔗 feat: Agent Chain (Mixture-of-Agents) by **@hanzoai** in [#6374](https://github.com/hanzoai/Chat/pull/6374)
- ⌛ feat: `initTimeout` for Slow Starting MCP Servers by **@perweij** in [#6383](https://github.com/hanzoai/Chat/pull/6383)
- 🚀 feat: `S3` Integration for File handling and Image uploads by **@rubentalstra** in [#6142](https://github.com/hanzoai/Chat/pull/6142)
- 🔒feat: Enable OpenID Auto-Redirect by **@leondape** in [#6066](https://github.com/hanzoai/Chat/pull/6066)
- 🚀 feat: Integrate `Azure Blob Storage` for file handling and image uploads by **@rubentalstra** in [#6153](https://github.com/hanzoai/Chat/pull/6153)
- 🚀 feat: Add support for custom `AWS` endpoint in `S3` by **@rubentalstra** in [#6431](https://github.com/hanzoai/Chat/pull/6431)
- 🚀 feat: Add support for LDAP STARTTLS in LDAP authentication by **@rubentalstra** in [#6438](https://github.com/hanzoai/Chat/pull/6438)
- 🚀 feat: Refactor schema exports and update package version to 0.0.4 by **@rubentalstra** in [#6455](https://github.com/hanzoai/Chat/pull/6455)
- 🔼 feat: Add Auto Submit For URL Query Params by **@mjaverto** in [#6440](https://github.com/hanzoai/Chat/pull/6440)
- 🛠 feat: Enhance Redis Integration, Rate Limiters & Log Headers by **@hanzoai** in [#6462](https://github.com/hanzoai/Chat/pull/6462)
- 💵 feat: Add Automatic Balance Refill by **@rubentalstra** in [#6452](https://github.com/hanzoai/Chat/pull/6452)
- 🗣️ feat: add support for gpt-4o-transcribe models by **@berry-13** in [#6483](https://github.com/hanzoai/Chat/pull/6483)
- 🎨 feat: UI Refresh for Enhanced UX by **@berry-13** in [#6346](https://github.com/hanzoai/Chat/pull/6346)
- 🌍 feat: Add support for Hungarian language localization by **@rubentalstra** in [#6508](https://github.com/hanzoai/Chat/pull/6508)
- 🚀 feat: Add Gemini 2.5 Token/Context Values, Increase Max Possible Output to 64k by **@hanzoai** in [#6563](https://github.com/hanzoai/Chat/pull/6563)
- 🚀 feat: Enhance MCP Connections For Multi-User Support by **@hanzoai** in [#6610](https://github.com/hanzoai/Chat/pull/6610)
- 🚀 feat: Enhance S3 URL Expiry with Refresh; fix: S3 File Deletion by **@hanzoai** in [#6647](https://github.com/hanzoai/Chat/pull/6647)
- 🚀 feat: enhance UI components and refactor settings by **@berry-13** in [#6625](https://github.com/hanzoai/Chat/pull/6625)
- 💬 feat: move TemporaryChat to the Header by **@berry-13** in [#6646](https://github.com/hanzoai/Chat/pull/6646)
- 🚀 feat: Use Model Specs + Specific Endpoints, Limit Providers for Agents by **@hanzoai** in [#6650](https://github.com/hanzoai/Chat/pull/6650)
- 🪙 feat: Sync Balance Config on Login by **@hanzoai** in [#6671](https://github.com/hanzoai/Chat/pull/6671)
- 🔦 feat: MCP Support for Non-Agent Endpoints by **@hanzoai** in [#6775](https://github.com/hanzoai/Chat/pull/6775)
- 🗃️ feat: Code Interpreter File Persistence between Sessions by **@hanzoai** in [#6790](https://github.com/hanzoai/Chat/pull/6790)
- 🖥️ feat: Code Interpreter API for Non-Agent Endpoints by **@hanzoai** in [#6803](https://github.com/hanzoai/Chat/pull/6803)
- ⚡ feat: Self-hosted Artifacts Static Bundler URL by **@hanzoai** in [#6827](https://github.com/hanzoai/Chat/pull/6827)
- 🐳 feat: Add Jemalloc and UV to Docker Builds by **@hanzoai** in [#6836](https://github.com/hanzoai/Chat/pull/6836)
- 🤖 feat: GPT-4.1 by **@hanzoai** in [#6880](https://github.com/hanzoai/Chat/pull/6880)
- 👋 feat: remove Edge TTS by **@berry-13** in [#6885](https://github.com/hanzoai/Chat/pull/6885)
- feat: nav optimization  by **@berry-13** in [#5785](https://github.com/hanzoai/Chat/pull/5785)
- 🗺️ feat: Add Parameter Location Mapping for OpenAPI actions by **@peeeteeer** in [#6858](https://github.com/hanzoai/Chat/pull/6858)
- 🤖 feat: Support `o4-mini` and `o3` Models by **@hanzoai** in [#6928](https://github.com/hanzoai/Chat/pull/6928)
- 🎨 feat: OpenAI Image Tools (GPT-Image-1) by **@hanzoai** in [#7079](https://github.com/hanzoai/Chat/pull/7079)
- 🗓️ feat: Add Special Variables for Prompts & Agents, Prompt UI Improvements by **@hanzoai** in [#7123](https://github.com/hanzoai/Chat/pull/7123)

### 🌍 Internationalization

- 🌍 i18n: Add Thai Language Support and Update Translations by **@rubentalstra** in [#6219](https://github.com/hanzoai/Chat/pull/6219)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#6220](https://github.com/hanzoai/Chat/pull/6220)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#6240](https://github.com/hanzoai/Chat/pull/6240)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#6241](https://github.com/hanzoai/Chat/pull/6241)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#6277](https://github.com/hanzoai/Chat/pull/6277)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#6414](https://github.com/hanzoai/Chat/pull/6414)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#6505](https://github.com/hanzoai/Chat/pull/6505)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#6530](https://github.com/hanzoai/Chat/pull/6530)
- 🌍 i18n: Add Persian Localization Support by **@rubentalstra** in [#6669](https://github.com/hanzoai/Chat/pull/6669)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#6667](https://github.com/hanzoai/Chat/pull/6667)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#7126](https://github.com/hanzoai/Chat/pull/7126)
- 🌍 i18n: Update translation.json with latest translations by **@github-actions[bot]** in [#7148](https://github.com/hanzoai/Chat/pull/7148)

### 👐 Accessibility

- 🎨 a11y: Update Model Spec Description Text by **@berry-13** in [#6294](https://github.com/hanzoai/Chat/pull/6294)
- 🗑️ a11y: Add Accessible Name to Button for File Attachment Removal by **@kangabell** in [#6709](https://github.com/hanzoai/Chat/pull/6709)
- ⌨️ a11y: enhance accessibility & visual consistency by **@berry-13** in [#6866](https://github.com/hanzoai/Chat/pull/6866)
- 🙌 a11y: Searchbar/Conversations List Focus by **@hanzoai** in [#7096](https://github.com/hanzoai/Chat/pull/7096)
- 👐 a11y: Improve Fork and SplitText Accessibility by **@hanzoai** in [#7147](https://github.com/hanzoai/Chat/pull/7147)

### 🔧 Fixes

- 🐛 fix: Avatar Type Definitions in Agent/Assistant Schemas by **@hanzoai** in [#6235](https://github.com/hanzoai/Chat/pull/6235)
- 🔧 fix: MeiliSearch Field Error and Patch Incorrect Import by #6210 by **@rubentalstra** in [#6245](https://github.com/hanzoai/Chat/pull/6245)
- 🔏 fix: Enhance Two-Factor Authentication by **@rubentalstra** in [#6247](https://github.com/hanzoai/Chat/pull/6247)
- 🐛 fix: Await saveMessage in abortMiddleware to ensure proper execution by **@sh4shii** in [#6248](https://github.com/hanzoai/Chat/pull/6248)
- 🔧 fix: Axios Proxy Usage And Bump `mongoose` by **@hanzoai** in [#6298](https://github.com/hanzoai/Chat/pull/6298)
- 🔧 fix: comment out MCP servers to resolve service run issues by **@KunalScriptz** in [#6316](https://github.com/hanzoai/Chat/pull/6316)
- 🔧 fix: Update Token Calculations and Mapping, MCP `env` Initialization by **@hanzoai** in [#6406](https://github.com/hanzoai/Chat/pull/6406)
- 🐞 fix: Agent "Resend" Message Attachments + Source Icon Styling by **@hanzoai** in [#6408](https://github.com/hanzoai/Chat/pull/6408)
- 🐛 fix: Prevent Crash on Duplicate Message ID by **@Odrec** in [#6392](https://github.com/hanzoai/Chat/pull/6392)
- 🔐 fix: Invalid Key Length in 2FA Encryption by **@rubentalstra** in [#6432](https://github.com/hanzoai/Chat/pull/6432)
- 🏗️ fix: Fix Agents Token Spend Race Conditions, Expand Test Coverage by **@hanzoai** in [#6480](https://github.com/hanzoai/Chat/pull/6480)
- 🔃 fix: Draft Clearing, Claude Titles, Remove Default Vision Max Tokens by **@hanzoai** in [#6501](https://github.com/hanzoai/Chat/pull/6501)
- 🔧 fix: Update username reference to use user.name in greeting display by **@rubentalstra** in [#6534](https://github.com/hanzoai/Chat/pull/6534)
- 🔧 fix: S3 Download Stream with Key Extraction and Blob Storage Encoding for Vision by **@hanzoai** in [#6557](https://github.com/hanzoai/Chat/pull/6557)
- 🔧 fix: Mistral type strictness for `usage` & update token values/windows by **@hanzoai** in [#6562](https://github.com/hanzoai/Chat/pull/6562)
- 🔧 fix: Consolidate Text Parsing and TTS Edge Initialization by **@hanzoai** in [#6582](https://github.com/hanzoai/Chat/pull/6582)
- 🔧 fix: Ensure continuation in image processing on base64 encoding from Blob Storage by **@hanzoai** in [#6619](https://github.com/hanzoai/Chat/pull/6619)
- ✉️ fix: Fallback For User Name In Email Templates by **@hanzoai** in [#6620](https://github.com/hanzoai/Chat/pull/6620)
- 🔧 fix: Azure Blob Integration and File Source References by **@rubentalstra** in [#6575](https://github.com/hanzoai/Chat/pull/6575)
- 🐛 fix: Safeguard against undefined addedEndpoints by **@wipash** in [#6654](https://github.com/hanzoai/Chat/pull/6654)
- 🤖 fix: Gemini 2.5 Vision Support by **@hanzoai** in [#6663](https://github.com/hanzoai/Chat/pull/6663)
- 🔄 fix: Avatar & Error Handling Enhancements by **@hanzoai** in [#6687](https://github.com/hanzoai/Chat/pull/6687)
- 🔧 fix: Chat Middleware, Zod Conversion, Auto-Save and S3 URL Refresh by **@hanzoai** in [#6720](https://github.com/hanzoai/Chat/pull/6720)
- 🔧 fix: Agent Capability Checks & DocumentDB Compatibility for Agent Resource Removal by **@hanzoai** in [#6726](https://github.com/hanzoai/Chat/pull/6726)
- 🔄 fix: Improve audio MIME type detection and handling by **@berry-13** in [#6707](https://github.com/hanzoai/Chat/pull/6707)
- 🪺 fix: Update Role Handling due to New Schema Shape by **@hanzoai** in [#6774](https://github.com/hanzoai/Chat/pull/6774)
- 🗨️ fix: Show ModelSpec Greeting by **@berry-13** in [#6770](https://github.com/hanzoai/Chat/pull/6770)
- 🔧 fix: Keyv and Proxy Issues, and More Memory Optimizations by **@hanzoai** in [#6867](https://github.com/hanzoai/Chat/pull/6867)
- ✨ fix: Implement dynamic text sizing for greeting and name display by **@berry-13** in [#6833](https://github.com/hanzoai/Chat/pull/6833)
- 📝 fix: Mistral OCR Image Support and Azure Agent Titles by **@hanzoai** in [#6901](https://github.com/hanzoai/Chat/pull/6901)
- 📢 fix: Invalid `engineTTS` and Conversation State on Navigation by **@berry-13** in [#6904](https://github.com/hanzoai/Chat/pull/6904)
- 🛠️ fix: Improve Accessibility and Display of Conversation Menu by **@hanzoai** in [#6913](https://github.com/hanzoai/Chat/pull/6913)
- 🔧 fix: Agent Resource Form, Convo Menu Style, Ensure Draft Clears on Submission by **@hanzoai** in [#6925](https://github.com/hanzoai/Chat/pull/6925)
- 🔀 fix: MCP Improvements, Auto-Save Drafts, Artifact Markup by **@hanzoai** in [#7040](https://github.com/hanzoai/Chat/pull/7040)
- 🐋 fix: Improve Deepseek Compatbility by **@hanzoai** in [#7132](https://github.com/hanzoai/Chat/pull/7132)
- 🐙 fix: Add Redis Ping Interval to Prevent Connection Drops by **@peeeteeer** in [#7127](https://github.com/hanzoai/Chat/pull/7127)

### ⚙️ Other Changes

- 📦 refactor: Move DB Models to `@chat/data-schemas` by **@rubentalstra** in [#6210](https://github.com/hanzoai/Chat/pull/6210)
- 📦 chore: Patch `axios` to address CVE-2025-27152 by **@hanzoai** in [#6222](https://github.com/hanzoai/Chat/pull/6222)
- ⚠️ refactor: Use Error Content Part Instead Of Throwing Error for Agents by **@hanzoai** in [#6262](https://github.com/hanzoai/Chat/pull/6262)
- 🏃‍♂️ refactor: Improve Agent Run Context & Misc. Changes by **@hanzoai** in [#6448](https://github.com/hanzoai/Chat/pull/6448)
- 📝 docs: chat.example.yaml by **@ineiti** in [#6442](https://github.com/hanzoai/Chat/pull/6442)
- 🏃‍♂️ refactor: More Agent Context Improvements during Run by **@hanzoai** in [#6477](https://github.com/hanzoai/Chat/pull/6477)
- 🔃 refactor: Allow streaming for `o1` models by **@hanzoai** in [#6509](https://github.com/hanzoai/Chat/pull/6509)
- 🔧 chore: `Vite` Plugin Upgrades & Config Optimizations by **@rubentalstra** in [#6547](https://github.com/hanzoai/Chat/pull/6547)
- 🔧 refactor: Consolidate Logging, Model Selection & Actions Optimizations, Minor Fixes by **@hanzoai** in [#6553](https://github.com/hanzoai/Chat/pull/6553)
- 🎨 style: Address Minor UI Refresh Issues by **@berry-13** in [#6552](https://github.com/hanzoai/Chat/pull/6552)
- 🔧 refactor: Enhance Model & Endpoint Configurations with Global Indicators 🌍 by **@berry-13** in [#6578](https://github.com/hanzoai/Chat/pull/6578)
- 💬 style: Chat UI, Greeting, and Message adjustments by **@berry-13** in [#6612](https://github.com/hanzoai/Chat/pull/6612)
- ⚡ refactor: DocumentDB Compatibility for Balance Updates by **@hanzoai** in [#6673](https://github.com/hanzoai/Chat/pull/6673)
- 🧹 chore: Update ESLint rules for React hooks by **@rubentalstra** in [#6685](https://github.com/hanzoai/Chat/pull/6685)
- 🪙 chore: Update Gemini Pricing by **@RedwindA** in [#6731](https://github.com/hanzoai/Chat/pull/6731)
- 🪺 refactor: Nest Permission fields for Roles by **@rubentalstra** in [#6487](https://github.com/hanzoai/Chat/pull/6487)
- 📦 chore: Update `caniuse-lite` dependency to version 1.0.30001706 by **@rubentalstra** in [#6482](https://github.com/hanzoai/Chat/pull/6482)
- ⚙️ refactor: OAuth Flow Signal, Type Safety, Tool Progress & Updated Packages by **@hanzoai** in [#6752](https://github.com/hanzoai/Chat/pull/6752)
- 📦 chore: bump vite from 6.2.3 to 6.2.5 by **@dependabot[bot]** in [#6745](https://github.com/hanzoai/Chat/pull/6745)
- 💾 chore: Enhance Local Storage Handling and Update MCP SDK by **@hanzoai** in [#6809](https://github.com/hanzoai/Chat/pull/6809)
- 🤖 refactor: Improve Agents Memory Usage, Bump Keyv, Grok 3 by **@hanzoai** in [#6850](https://github.com/hanzoai/Chat/pull/6850)
- 💾 refactor: Enhance Memory In Image Encodings & Client Disposal by **@hanzoai** in [#6852](https://github.com/hanzoai/Chat/pull/6852)
- 🔁 refactor: Token Event Handler and Standardize `maxTokens` Key by **@hanzoai** in [#6886](https://github.com/hanzoai/Chat/pull/6886)
- 🔍 refactor: Search & Message Retrieval by **@berry-13** in [#6903](https://github.com/hanzoai/Chat/pull/6903)
- 🎨 style: standardize dropdown styling & fix z-Index layering by **@berry-13** in [#6939](https://github.com/hanzoai/Chat/pull/6939)
- 📙 docs: CONTRIBUTING.md by **@dblock** in [#6831](https://github.com/hanzoai/Chat/pull/6831)
- 🧭 refactor: Modernize Nav/Header by **@hanzoai** in [#7094](https://github.com/hanzoai/Chat/pull/7094)
- 🪶 refactor: Chat Input Focus for Conversation Navigations & ChatForm Optimizations by **@hanzoai** in [#7100](https://github.com/hanzoai/Chat/pull/7100)
- 🔃 refactor: Streamline Navigation, Message Loading UX by **@hanzoai** in [#7118](https://github.com/hanzoai/Chat/pull/7118)
- 📜 docs: Unreleased changelog by **@github-actions[bot]** in [#6265](https://github.com/hanzoai/Chat/pull/6265)



[See full release details][release-v0.7.8-rc1]

[release-v0.7.8-rc1]: https://github.com/hanzoai/Chat/releases/tag/v0.7.8-rc1
=======
- 🪄 feat: Agent Artifacts by **@hanzoai** in [#5804](https://github.com/hanzoai/chat/pull/5804)

### ⚙️ Other Changes

- 🔄 chore: Enforce 18next Language Keys by **@rubentalstra** in [#5803](https://github.com/hanzoai/chat/pull/5803)
- 🔃 refactor: Parent Message ID Handling on Error, Update Translations, Bump Agents by **@hanzoai** in [#5833](https://github.com/hanzoai/chat/pull/5833)
>>>>>>> 1c21f3543 (Update brand)

---
