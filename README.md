<p align="center">
  <a href="https://hanzo.ai">
    <img src="client/public/assets/logo.svg" height="256">
  </a>
  <h1 align="center">
    <a href="https://hanzo.ai">Hanzo Chat</a>
  </h1>
</p>

<p align="center">
  <a href="https://discord.gg/hanzo"> 
    <img
      src="https://img.shields.io/badge/DISCORD-black.svg?style=for-the-badge&logo=discord&logoColor=white&labelColor=000000">
  </a>
  <a href="https://hanzo.ai"> 
    <img
      src="https://img.shields.io/badge/WEBSITE-black.svg?style=for-the-badge&logo=globe&logoColor=white&labelColor=000000">
  </a>
  <a href="https://docs.hanzo.ai"> 
    <img
      src="https://img.shields.io/badge/DOCS-black.svg?style=for-the-badge&logo=read-the-docs&logoColor=white&labelColor=000000">
  </a>
  <a aria-label="GitHub" href="https://github.com/hanzoai/chat">
    <img
      src="https://img.shields.io/badge/GITHUB-black.svg?style=for-the-badge&logo=github&logoColor=white&labelColor=000000">
  </a>
</p>



# ✨ Features

- 🖥️ **UI & Experience** inspired by ChatGPT with enhanced design and features

- 🤖 **AI Model Selection**:  
  - Anthropic (Claude), AWS Bedrock, OpenAI, Azure OpenAI, Google, Vertex AI, OpenAI Assistants API (incl. Azure)
  - [Custom Endpoints](https://www.hanzo.ai/docs/quick_start/custom_endpoints): Use any OpenAI-compatible API with Hanzo, no proxy required
  - Compatible with [Local & Remote AI Providers](https://www.hanzo.ai/docs/configuration/chat_yaml/ai_endpoints):
    - Ollama, groq, Cohere, Mistral AI, Apple MLX, koboldcpp, together.ai,
    - OpenRouter, Perplexity, ShuttleAI, Deepseek, Qwen, and more

- 🔧 **[Code Interpreter API](https://www.hanzo.ai/docs/features/code_interpreter)**: 
  - Secure, Sandboxed Execution in Python, Node.js (JS/TS), Go, C/C++, Java, PHP, Rust, and Fortran
  - Seamless File Handling: Upload, process, and download files directly
  - No Privacy Concerns: Fully isolated and secure execution

- 🔦 **Agents & Tools Integration**:  
  - **[Hanzo Agents](https://www.hanzo.ai/docs/features/agents)**:
    - No-Code Custom Assistants: Build specialized, AI-driven helpers without coding  
    - Flexible & Extensible: Attach tools like DALL-E-3, file search, code execution, and more  
    - Compatible with Custom Endpoints, OpenAI, Azure, Anthropic, AWS Bedrock, and more
    - [Model Context Protocol (MCP) Support](https://modelcontextprotocol.io/clients#chat) for Tools
  - Use Hanzo Agents and OpenAI Assistants with Files, Code Interpreter, Tools, and API Actions

- 🔍 **Web Search**:  
  - Search the internet and retrieve relevant information to enhance your AI context
  - Combines search providers, content scrapers, and result rerankers for optimal results
  - **[Learn More →](https://www.hanzo.ai/docs/features/web_search)**

- 🪄 **Generative UI with Code Artifacts**:  
  - [Code Artifacts](https://youtu.be/GfTj7O4gmd0?si=WJbdnemZpJzBrJo3) allow creation of React, HTML, and Mermaid diagrams directly in chat

- 🎨 **Image Generation & Editing**
  - Text-to-image and image-to-image with [GPT-Image-1](https://www.hanzo.ai/docs/features/image_gen#1--openai-image-tools-recommended)
  - Text-to-image with [DALL-E (3/2)](https://www.hanzo.ai/docs/features/image_gen#2--dalle-legacy), [Stable Diffusion](https://www.hanzo.ai/docs/features/image_gen#3--stable-diffusion-local), [Flux](https://www.hanzo.ai/docs/features/image_gen#4--flux), or any [MCP server](https://www.hanzo.ai/docs/features/image_gen#5--model-context-protocol-mcp)
  - Produce stunning visuals from prompts or refine existing images with a single instruction

- 💾 **Presets & Context Management**:  
  - Create, Save, & Share Custom Presets  
  - Switch between AI Endpoints and Presets mid-chat
  - Edit, Resubmit, and Continue Messages with Conversation branching  
  - [Fork Messages & Conversations](https://www.hanzo.ai/docs/features/fork) for Advanced Context control

- 💬 **Multimodal & File Interactions**:  
  - Upload and analyze images with Claude 3, GPT-4.5, GPT-4o, o1, Llama-Vision, and Gemini 📸  
  - Chat with Files using Custom Endpoints, OpenAI, Azure, Anthropic, AWS Bedrock, & Google 🗃️

- 🌎 **Multilingual UI**:  
  - English, 中文, Deutsch, Español, Français, Italiano, Polski, Português Brasileiro
  - Русский, 日本語, Svenska, 한국어, Tiếng Việt, 繁體中文, العربية, Türkçe, Nederlands, עברית

- 🧠 **Reasoning UI**:  
  - Dynamic Reasoning UI for Chain-of-Thought/Reasoning AI models like DeepSeek-R1

- 🎨 **Customizable Interface**:  
  - Customizable Dropdown & Interface that adapts to both power users and newcomers

- 🗣️ **Speech & Audio**:  
  - Chat hands-free with Speech-to-Text and Text-to-Speech  
  - Automatically send and play Audio  
  - Supports OpenAI, Azure OpenAI, and Elevenlabs

- 📥 **Import & Export Conversations**:  
  - Import Conversations from Hanzo, ChatGPT, Chatbot UI  
  - Export conversations as screenshots, markdown, text, json

- 🔍 **Search & Discovery**:  
  - Search all messages/conversations

- 👥 **Multi-User & Secure Access**:
  - Multi-User, Secure Authentication with OAuth2, LDAP, & Email Login Support
  - Built-in Moderation, and Token spend tools

- ⚙️ **Configuration & Deployment**:  
  - Configure Proxy, Reverse Proxy, Docker, & many Deployment options  
  - Use completely local or deploy on the cloud

- 📖 **Open-Source & Community**:  
  - Completely Open-Source & Built in Public  
  - Community-driven development, support, and feedback

[For a thorough review of our features, see our docs here](https://docs.hanzo.ai/) 📚

## 🪶 All-In-One AI Conversations with Hanzo

Hanzo brings together the future of assistant AIs with the revolutionary technology of OpenAI's ChatGPT. Celebrating the original styling, Hanzo gives you the ability to integrate multiple AI models. It also integrates and enhances original client features such as conversation and message search, prompt templates and plugins.

With Hanzo, you no longer need to opt for ChatGPT Plus and can instead use free or pay-per-call APIs. We welcome contributions, cloning, and forking to enhance the capabilities of this advanced chatbot platform.

[![Watch the video](https://raw.githubusercontent.com/Hanzo-AI/hanzo.ai/main/public/images/changelog/v0.7.6.gif)](https://www.youtube.com/watch?v=ilfwGQtJNlI)

Click on the thumbnail to open the video☝️

---

## 🌐 Resources

**GitHub Repo:**
  - **RAG API:** [github.com/hanzoai/rag_api](https://github.com/hanzoai/rag_api)
  - **Website:** [github.com/Hanzo-AI/hanzo.ai](https://github.com/Hanzo-AI/hanzo.ai)

**Other:**
  - **Website:** [hanzo.ai](https://hanzo.ai)
  - **Documentation:** [hanzo.ai/docs](https://hanzo.ai/docs)
  - **Blog:** [hanzo.ai/blog](https://hanzo.ai/blog)

---

## 📝 Changelog

Keep up with the latest updates by visiting the releases page and notes:
- [Releases](https://github.com/hanzoai/chat/releases)
- [Changelog](https://www.hanzo.ai/changelog) 

**⚠️ Please consult the [changelog](https://www.hanzo.ai/changelog) for breaking changes before updating.**

---

## ⭐ Star History

<p align="center">
  <a href="https://star-history.com/#hanzoai/chat&Date">
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=hanzoai/chat&type=Date&theme=dark" onerror="this.src='https://api.star-history.com/svg?repos=hanzoai/chat&type=Date'" />
  </a>
</p>
<p align="center">
  <a href="https://trendshift.io/repositories/4685" target="_blank" style="padding: 10px;">
    <img src="https://trendshift.io/api/badge/repositories/4685" alt="hanzoai%2FHanzo | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/>
  </a>
  <a href="https://runacap.com/ross-index/q1-24/" target="_blank" rel="noopener" style="margin-left: 20px;">
    <img style="width: 260px; height: 56px" src="https://runacap.com/wp-content/uploads/2024/04/ROSS_badge_white_Q1_2024.svg" alt="ROSS Index - Fastest Growing Open-Source Startups in Q1 2024 | Runa Capital" width="260" height="56"/>
  </a>
</p>

---

## ✨ Contributions

Contributions, suggestions, bug reports and fixes are welcome!

For new features, components, or extensions, please open an issue and discuss before sending a PR.

If you'd like to help translate Hanzo into your language, we'd love your contribution! Improving our translations not only makes Hanzo more accessible to users around the world but also enhances the overall user experience. Please check out our [Translation Guide](https://www.hanzo.ai/docs/translation).

---

## 💖 This project exists in its current state thanks to all the people who contribute

<a href="https://github.com/hanzoai/chat/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=hanzoai/chat" />
</a>

---

## 🎉 Special Thanks

We thank [Locize](https://locize.com) for their translation management tools that support multiple languages in Hanzo.

<p align="center">
  <a href="https://locize.com" target="_blank" rel="noopener noreferrer">
    <img src="https://github.com/user-attachments/assets/d6b70894-6064-475e-bb65-92a9e23e0077" alt="Locize Logo" height="50">
  </a>
</p>
