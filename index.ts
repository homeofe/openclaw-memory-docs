import {
  DefaultRedactor,
  HashEmbedder,
  JsonlMemoryStore,
  uuid,
  expandHome,
  safePath,
  safeLimit,
  type MemoryItem,
  type PluginApi,
  type CommandContext,
  type ToolCallParams,
} from "@elvatis_com/openclaw-memory-core";

export default function register(api: PluginApi) {
  const cfg = (api.pluginConfig ?? {}) as {
    enabled?: boolean;
    storePath?: string;
    dims?: number;
    redactSecrets?: boolean;
    defaultTags?: string[];
    maxItems?: number;
  };

  if (cfg.enabled === false) return;

  let storePath: string;
  try {
    storePath = safePath(expandHome(cfg.storePath ?? "~/.openclaw/workspace/memory/docs-memory.jsonl"), "[memory-docs] storePath");
  } catch (err: unknown) {
    api.logger?.error?.(`[memory-docs] ${(err as Error).message}`);
    return;
  }

  const embedder = new HashEmbedder(cfg.dims ?? 256);
  const store = new JsonlMemoryStore({ filePath: storePath, embedder, maxItems: cfg.maxItems ?? 5000 });
  const redactor = new DefaultRedactor();
  const defaultTags = cfg.defaultTags ?? ["docs"];
  const redactSecrets = cfg.redactSecrets !== false;

  api.logger?.info?.(`[memory-docs] enabled. store=${storePath}`);

  // Command: /remember-doc <text>
  api.registerCommand({
    name: "remember-doc",
    description: "Save a documentation memory item (explicit capture)",
    usage: "/remember-doc <text>",
    requireAuth: false,
    acceptsArgs: true,
    handler: async (ctx: CommandContext) => {
      const text = String(ctx?.args ?? "").trim();
      if (!text) {
        return { text: "Usage: /remember-doc <text>" };
      }

      const r = redactSecrets ? redactor.redact(text) : { redactedText: text, hadSecrets: false, matches: [] };
      const item: MemoryItem = {
        id: uuid(),
        kind: "doc",
        text: r.redactedText,
        createdAt: new Date().toISOString(),
        tags: defaultTags,
        source: {
          channel: ctx?.channel,
          from: ctx?.from,
          conversationId: ctx?.conversationId,
          messageId: ctx?.messageId,
        },
        meta: r.hadSecrets ? { redaction: { hadSecrets: true, matches: r.matches } } : undefined,
      };

      await store.add(item);

      const note = r.hadSecrets ? " (note: secrets were redacted)" : "";
      return { text: `Saved docs memory.${note}` };
    },
  });

  // Command: /search-docs <query> [limit]
  api.registerCommand({
    name: "search-docs",
    description: "Search documentation memory items by query",
    usage: "/search-docs <query> [limit]",
    requireAuth: false,
    acceptsArgs: true,
    handler: async (ctx: CommandContext) => {
      const args = String(ctx?.args ?? "").trim().split(/\s+/);
      const lastArg = args[args.length - 1] ?? "";
      const maybeLimit = Number(lastArg);
      let query: string;
      let limit: number;
      if (!isNaN(maybeLimit) && maybeLimit >= 1 && args.length > 1) {
        limit = safeLimit(maybeLimit, 5, 20);
        query = args.slice(0, -1).join(" ");
      } else {
        limit = 5;
        query = args.join(" ");
      }
      if (!query) return { text: "Usage: /search-docs <query> [limit]" };
      const hits = await store.search(query, { limit });
      if (hits.length === 0) return { text: `No docs memories found for: ${query}` };
      const lines = hits.map((h, n) =>
        `${n + 1}. [score:${h.score.toFixed(2)}] ${h.item.text.slice(0, 120)}${h.item.text.length > 120 ? "…" : ""}`
      );
      return { text: `Docs memory results for "${query}":\n${lines.join("\n")}` };
    },
  });

  // Command: /list-docs [limit]
  api.registerCommand({
    name: "list-docs",
    description: "List the most recent documentation memory items",
    usage: "/list-docs [limit]",
    requireAuth: false,
    acceptsArgs: true,
    handler: async (ctx: CommandContext) => {
      const limit = safeLimit(String(ctx?.args ?? "").trim(), 10, 50);
      const items = await store.list({ limit });
      if (items.length === 0) return { text: "No docs memories stored yet." };
      const lines = items.map((i, n) =>
        `${n + 1}. [${i.createdAt.slice(0, 10)}] ${i.text.slice(0, 120)}${i.text.length > 120 ? "…" : ""}`
      );
      return { text: `Docs memories (${items.length}):\n${lines.join("\n")}` };
    },
  });

  // Command: /forget-doc <id>
  api.registerCommand({
    name: "forget-doc",
    description: "Delete a documentation memory item by ID",
    usage: "/forget-doc <id>",
    requireAuth: true,
    acceptsArgs: true,
    handler: async (ctx: CommandContext) => {
      const id = String(ctx?.args ?? "").trim();
      if (!id) return { text: "Usage: /forget-doc <id>" };
      const deleted = await store.delete(id);
      return { text: deleted ? `Deleted docs memory: ${id}` : `No memory found with id: ${id}` };
    },
  });

  // Tool: docs_memory_search
  api.registerTool({
    name: "docs_memory_search",
    description: "Search documentation memory items (local JSONL store)",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 20, default: 5 },
      },
      required: ["query"],
    },
    handler: async (params: ToolCallParams) => {
      const q = String(params['query'] ?? "").trim();
      const limit = safeLimit(params['limit'], 5, 20);
      if (!q) return { hits: [] };

      const hits = await store.search(q, { limit });
      return {
        hits: hits.map((h) => ({
          score: h.score,
          id: h.item.id,
          createdAt: h.item.createdAt,
          tags: h.item.tags,
          text: h.item.text,
        })),
      };
    },
  });
}
