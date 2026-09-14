// Parser for `claude -p --output-format stream-json --verbose` output (one JSON object per line).
// Tolerant by design: unknown line types are ignored and unparseable lines are counted, never thrown.
export interface ToolCall {
  id: string;
  name: string;
  /** Segment after the last `__`, e.g. `get_activity` for `mcp__plugin_child-learning_child-learning-local__get_activity`. */
  shortName: string;
  input: unknown;
  resultText: string;
  isError: boolean;
  index: number;
}

export interface TranscriptInit {
  sessionId?: string;
  model?: string;
  tools: string[];
  mcpServers: Array<{ name: string; status: string }>;
}

export interface TranscriptResult {
  subtype: string;
  isError: boolean;
  durationMs: number;
  numTurns: number;
  costUsd: number;
  permissionDenials: unknown[];
}

export interface ParsedTranscript {
  init?: TranscriptInit;
  toolCalls: ToolCall[];
  finalText: string;
  result: TranscriptResult;
  exitCode: number;
  parseErrors: number;
  lineCount: number;
}

interface ContentBlock { type?: string; id?: string; name?: string; input?: unknown; text?: string; tool_use_id?: string; content?: unknown; is_error?: boolean; }

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function contentBlocks(message: unknown): ContentBlock[] {
  const record = asRecord(message);
  const content = record?.content;
  if (typeof content === "string") return [{ type: "text", text: content }];
  return Array.isArray(content) ? (content as ContentBlock[]) : [];
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((block) => (typeof block === "string" ? block : typeof asRecord(block)?.text === "string" ? String(asRecord(block)!.text) : JSON.stringify(block))).join("\n");
  return content === undefined || content === null ? "" : JSON.stringify(content);
}

export function shortToolName(name: string): string {
  const index = name.lastIndexOf("__");
  return index === -1 ? name : name.slice(index + 2);
}

export function parseStreamJson(jsonl: string, exitCode = 0): ParsedTranscript {
  const toolCalls = new Map<string, ToolCall>();
  let init: TranscriptInit | undefined;
  let lastAssistantText = "";
  let result: TranscriptResult = { subtype: "missing", isError: true, durationMs: 0, numTurns: 0, costUsd: 0, permissionDenials: [] };
  let resultText: string | undefined;
  let parseErrors = 0;
  let lineCount = 0;
  for (const rawLine of jsonl.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    lineCount += 1;
    let entry: Record<string, unknown> | undefined;
    try { entry = asRecord(JSON.parse(line)); } catch { parseErrors += 1; continue; }
    if (!entry) { parseErrors += 1; continue; }
    const type = entry.type;
    if (type === "system" && entry.subtype === "init") {
      const servers = Array.isArray(entry.mcp_servers) ? entry.mcp_servers : [];
      init = {
        ...(typeof entry.session_id === "string" ? { sessionId: entry.session_id } : {}),
        ...(typeof entry.model === "string" ? { model: entry.model } : {}),
        tools: Array.isArray(entry.tools) ? entry.tools.filter((tool): tool is string => typeof tool === "string") : [],
        mcpServers: servers.map((server) => { const record = asRecord(server) ?? {}; return { name: String(record.name ?? ""), status: String(record.status ?? "") }; })
      };
      continue;
    }
    if (type === "assistant") {
      const texts: string[] = [];
      for (const block of contentBlocks(entry.message)) {
        if (block.type === "tool_use" && typeof block.id === "string" && typeof block.name === "string") {
          if (!toolCalls.has(block.id)) toolCalls.set(block.id, { id: block.id, name: block.name, shortName: shortToolName(block.name), input: block.input, resultText: "", isError: false, index: toolCalls.size });
        } else if (block.type === "text" && typeof block.text === "string") {
          texts.push(block.text);
        }
      }
      if (texts.length > 0) lastAssistantText = texts.join("\n");
      continue;
    }
    if (type === "user") {
      for (const block of contentBlocks(entry.message)) {
        if (block.type === "tool_result" && typeof block.tool_use_id === "string") {
          const call = toolCalls.get(block.tool_use_id);
          if (call) { call.resultText = textOf(block.content); call.isError = block.is_error === true; }
        }
      }
      continue;
    }
    if (type === "result") {
      result = {
        subtype: typeof entry.subtype === "string" ? entry.subtype : "unknown",
        isError: entry.is_error === true,
        durationMs: typeof entry.duration_ms === "number" ? entry.duration_ms : 0,
        numTurns: typeof entry.num_turns === "number" ? entry.num_turns : 0,
        costUsd: typeof entry.total_cost_usd === "number" ? entry.total_cost_usd : 0,
        permissionDenials: Array.isArray(entry.permission_denials) ? entry.permission_denials : []
      };
      if (typeof entry.result === "string") resultText = entry.result;
    }
  }
  return {
    ...(init ? { init } : {}),
    toolCalls: [...toolCalls.values()].sort((a, b) => a.index - b.index),
    finalText: resultText ?? lastAssistantText,
    result,
    exitCode,
    parseErrors,
    lineCount
  };
}
