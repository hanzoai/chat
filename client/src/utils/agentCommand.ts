/**
 * The ONE definition of the `/agent <name> [prompt]` command grammar. Pure, so
 * it is directly unit-testable and shared by the run hook, the command popover,
 * and the ChatForm submit interception.
 */

export type ParsedAgentCommand = {
  name: string;
  prompt: string;
};

const AGENT_COMMAND_RE = /^\/agents?\s+(\S+)\s*([\s\S]*)$/;

/**
 * Parse a chat-input string into a cloud-agent command, or null if it is not
 * one. Accepts `/agent name`, `/agent name the prompt`, and the `/agents` alias.
 * Prompt whitespace is trimmed.
 */
export function parseAgentCommand(text: string): ParsedAgentCommand | null {
  const m = AGENT_COMMAND_RE.exec((text ?? '').trim());
  if (!m) {
    return null;
  }
  return { name: m[1], prompt: (m[2] ?? '').trim() };
}

/** True once the input has begun a `/agent` command (used to open the picker). */
export function isAgentCommandPrefix(text: string): boolean {
  return /^\/agents?(\s|$)/.test((text ?? '').trimStart());
}
