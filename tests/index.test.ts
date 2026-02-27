import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  PluginApi,
  CommandDefinition,
  ToolDefinition,
  CommandContext,
  MemoryItem,
  SearchHit,
} from "@elvatis_com/openclaw-memory-core";
import { JsonlMemoryStore } from "@elvatis_com/openclaw-memory-core";
import { parseFlags } from "../index.js";

// ---------------------------------------------------------------------------
// Mock the heavy dependencies so tests never touch the filesystem.
// ---------------------------------------------------------------------------

const mockAdd = vi.fn<(item: MemoryItem) => Promise<void>>().mockResolvedValue(undefined);
const mockDelete = vi.fn<(id: string) => Promise<boolean>>().mockResolvedValue(false);
const mockList = vi.fn<(opts?: { limit?: number }) => Promise<MemoryItem[]>>().mockResolvedValue([]);
const mockSearch = vi.fn<(query: string, opts?: { limit?: number }) => Promise<SearchHit[]>>().mockResolvedValue([]);

vi.mock("@elvatis_com/openclaw-memory-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@elvatis_com/openclaw-memory-core")>();
  return {
    ...actual,
    JsonlMemoryStore: vi.fn().mockImplementation(() => ({
      add: mockAdd,
      delete: mockDelete,
      list: mockList,
      search: mockSearch,
    })),
  };
});

// ---------------------------------------------------------------------------
// Helper: create a fake PluginApi that captures command/tool registrations.
// ---------------------------------------------------------------------------

function createMockApi(config?: Record<string, unknown>): {
  api: PluginApi;
  commands: Map<string, CommandDefinition>;
  tools: Map<string, ToolDefinition>;
} {
  const commands = new Map<string, CommandDefinition>();
  const tools = new Map<string, ToolDefinition>();
  const api: PluginApi = {
    pluginConfig: config,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    registerCommand(def: CommandDefinition) {
      commands.set(def.name, def);
    },
    registerTool(def: ToolDefinition) {
      tools.set(def.name, def);
    },
    on: vi.fn(),
  };
  return { api, commands, tools };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("openclaw-memory-docs plugin", () => {
  let commands: Map<string, CommandDefinition>;
  let tools: Map<string, ToolDefinition>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamically import so mocks are in place for each test run.
    const mod = await import("../index.js");
    const mock = createMockApi();
    mod.default(mock.api);
    commands = mock.commands;
    tools = mock.tools;
  });

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  describe("registration", () => {
    it("registers all four commands", () => {
      expect(commands.has("remember-doc")).toBe(true);
      expect(commands.has("search-docs")).toBe(true);
      expect(commands.has("list-docs")).toBe(true);
      expect(commands.has("forget-doc")).toBe(true);
    });

    it("registers the docs_memory_search tool", () => {
      expect(tools.has("docs_memory_search")).toBe(true);
    });

    it("does not register anything when enabled is false", async () => {
      const mod = await import("../index.js");
      const mock = createMockApi({ enabled: false });
      mod.default(mock.api);
      expect(mock.commands.size).toBe(0);
      expect(mock.tools.size).toBe(0);
    });

    it("logs info on successful initialization", async () => {
      const mod = await import("../index.js");
      const mock = createMockApi();
      mod.default(mock.api);
      expect(mock.api.logger!.info).toHaveBeenCalledTimes(1);
      expect(mock.api.logger!.info).toHaveBeenCalledWith(
        expect.stringContaining("[memory-docs] enabled")
      );
    });

    it("logs error and does not register on invalid storePath", async () => {
      const mod = await import("../index.js");
      const mock = createMockApi({ storePath: "/../../../etc/passwd" });
      mod.default(mock.api);
      expect(mock.api.logger!.error).toHaveBeenCalledTimes(1);
      expect(mock.api.logger!.error).toHaveBeenCalledWith(
        expect.stringContaining("[memory-docs]")
      );
      expect(mock.commands.size).toBe(0);
      expect(mock.tools.size).toBe(0);
    });

    it("passes custom maxItems to the store constructor", async () => {
      const mod = await import("../index.js");
      const MockedStore = JsonlMemoryStore as unknown as ReturnType<typeof vi.fn>;
      MockedStore.mockClear();
      const mock = createMockApi({ maxItems: 100 });
      mod.default(mock.api);
      expect(MockedStore).toHaveBeenCalledWith(
        expect.objectContaining({ maxItems: 100 })
      );
    });

    it("uses default maxItems of 5000 when not configured", async () => {
      const mod = await import("../index.js");
      const MockedStore = JsonlMemoryStore as unknown as ReturnType<typeof vi.fn>;
      MockedStore.mockClear();
      const mock = createMockApi();
      mod.default(mock.api);
      expect(MockedStore).toHaveBeenCalledWith(
        expect.objectContaining({ maxItems: 5000 })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Command metadata
  // -------------------------------------------------------------------------

  describe("command metadata", () => {
    it("all commands accept args", () => {
      for (const name of ["remember-doc", "search-docs", "list-docs", "forget-doc"]) {
        expect(commands.get(name)!.acceptsArgs).toBe(true);
      }
    });

    it("only forget-doc requires auth", () => {
      expect(commands.get("remember-doc")!.requireAuth).toBe(false);
      expect(commands.get("search-docs")!.requireAuth).toBe(false);
      expect(commands.get("list-docs")!.requireAuth).toBe(false);
      expect(commands.get("forget-doc")!.requireAuth).toBe(true);
    });

    it("all commands have a usage string starting with /", () => {
      for (const [, def] of commands) {
        expect(def.usage).toMatch(/^\//);
      }
    });

    it("all commands have non-empty descriptions", () => {
      for (const [, def] of commands) {
        expect(def.description.length).toBeGreaterThan(0);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Tool schema
  // -------------------------------------------------------------------------

  describe("docs_memory_search tool schema", () => {
    it("has a valid inputSchema with query as required", () => {
      const schema = tools.get("docs_memory_search")!.inputSchema as Record<string, unknown>;
      expect(schema.type).toBe("object");
      expect(schema.required).toEqual(["query"]);
    });

    it("defines query as string and limit as number in the schema", () => {
      const schema = tools.get("docs_memory_search")!.inputSchema as {
        properties: Record<string, { type: string }>;
      };
      expect(schema.properties.query.type).toBe("string");
      expect(schema.properties.limit.type).toBe("number");
    });
  });

  // -------------------------------------------------------------------------
  // /remember-doc
  // -------------------------------------------------------------------------

  describe("/remember-doc", () => {
    it("returns usage text when no args are provided", async () => {
      const handler = commands.get("remember-doc")!.handler;
      const result = await handler({ args: "" });
      expect(result.text).toContain("Usage:");
    });

    it("returns usage text when args is whitespace", async () => {
      const handler = commands.get("remember-doc")!.handler;
      const result = await handler({ args: "   " });
      expect(result.text).toContain("Usage:");
    });

    it("saves a memory item and confirms", async () => {
      const handler = commands.get("remember-doc")!.handler;
      const result = await handler({ args: "test doc note" });
      expect(result.text).toContain("Saved docs memory");
      expect(mockAdd).toHaveBeenCalledTimes(1);
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.kind).toBe("doc");
      expect(savedItem.text).toBe("test doc note");
      expect(savedItem.tags).toEqual(["docs"]);
    });

    it("redacts secrets and notes it in the response", async () => {
      const handler = commands.get("remember-doc")!.handler;
      const result = await handler({
        args: "my key is sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn",
      });
      expect(result.text).toContain("secrets were redacted");
      expect(mockAdd).toHaveBeenCalledTimes(1);
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.text).not.toContain("sk-proj-");
      expect(savedItem.text).toContain("[REDACTED:OPENAI_KEY]");
    });

    it("generates a valid id and ISO createdAt on the saved item", async () => {
      const handler = commands.get("remember-doc")!.handler;
      await handler({ args: "structure check" });
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.id).toBeTruthy();
      expect(savedItem.id.length).toBeGreaterThan(0);
      // createdAt should be a valid ISO 8601 date string
      expect(new Date(savedItem.createdAt).toISOString()).toBe(savedItem.createdAt);
    });

    it("does not set meta.redaction when no secrets are found", async () => {
      const handler = commands.get("remember-doc")!.handler;
      await handler({ args: "clean text no secrets" });
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.meta).toBeUndefined();
    });

    it("uses custom defaultTags from config", async () => {
      const mod = await import("../index.js");
      const mock = createMockApi({ defaultTags: ["custom", "project-x"] });
      mod.default(mock.api);
      const handler = mock.commands.get("remember-doc")!.handler;
      await handler({ args: "tagged text" });
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.tags).toEqual(["custom", "project-x"]);
    });

    it("skips redaction when redactSecrets is false", async () => {
      const mod = await import("../index.js");
      const mock = createMockApi({ redactSecrets: false });
      mod.default(mock.api);
      const handler = mock.commands.get("remember-doc")!.handler;
      const secretText = "my key is sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn";
      const result = await handler({ args: secretText });
      expect(result.text).not.toContain("secrets were redacted");
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.text).toContain("sk-proj-");
    });

    it("preserves source context from the command context", async () => {
      const handler = commands.get("remember-doc")!.handler;
      const ctx: CommandContext = {
        args: "preserve context test",
        channel: "general",
        from: "user-1",
        conversationId: "conv-42",
        messageId: "msg-99",
      };
      await handler(ctx);
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.source).toEqual({
        channel: "general",
        from: "user-1",
        conversationId: "conv-42",
        messageId: "msg-99",
      });
    });
  });

  // -------------------------------------------------------------------------
  // /search-docs
  // -------------------------------------------------------------------------

  describe("/search-docs", () => {
    it("returns usage text when no query is provided", async () => {
      const handler = commands.get("search-docs")!.handler;
      const result = await handler({ args: "" });
      expect(result.text).toContain("Usage:");
    });

    it("returns 'no memories found' when store is empty", async () => {
      mockSearch.mockResolvedValueOnce([]);
      const handler = commands.get("search-docs")!.handler;
      const result = await handler({ args: "test query" });
      expect(result.text).toContain("No docs memories found");
    });

    it("returns formatted results with IDs for matching items (issue #4)", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          item: {
            id: "abc12345-6789-0abc-def0-123456789abc",
            kind: "doc",
            text: "First matching doc about residency",
            createdAt: "2026-01-15T00:00:00Z",
            tags: ["docs"],
          },
          score: 0.85,
        },
        {
          item: {
            id: "def45678-9abc-0def-1234-567890abcdef",
            kind: "doc",
            text: "Second doc about banking",
            createdAt: "2026-01-16T00:00:00Z",
            tags: ["docs"],
          },
          score: 0.62,
        },
      ]);
      const handler = commands.get("search-docs")!.handler;
      const result = await handler({ args: "residency" });
      expect(result.text).toContain("Docs memory results");
      expect(result.text).toContain("1.");
      expect(result.text).toContain("2.");
      expect(result.text).toContain("0.85");
      expect(result.text).toContain("First matching doc");
      // Issue #4: search results must include item IDs
      expect(result.text).toContain("[id:abc12345]");
      expect(result.text).toContain("[id:def45678]");
    });

    it("shows short IDs for items with IDs shorter than 8 chars in search results", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          item: {
            id: "tiny",
            kind: "doc",
            text: "Short id search result",
            createdAt: "2026-02-01T00:00:00Z",
            tags: ["docs"],
          },
          score: 0.75,
        },
      ]);
      const handler = commands.get("search-docs")!.handler;
      const result = await handler({ args: "short" });
      expect(result.text).toContain("[id:tiny]");
    });

    it("parses an explicit limit from args", async () => {
      mockSearch.mockResolvedValueOnce([]);
      const handler = commands.get("search-docs")!.handler;
      await handler({ args: "residency 3" });
      expect(mockSearch).toHaveBeenCalledWith("residency", { limit: 3 });
    });

    it("defaults limit to 5 when no number is provided", async () => {
      mockSearch.mockResolvedValueOnce([]);
      const handler = commands.get("search-docs")!.handler;
      await handler({ args: "banking setup" });
      expect(mockSearch).toHaveBeenCalledWith("banking setup", { limit: 5 });
    });

    it("clamps limit to maximum of 20", async () => {
      mockSearch.mockResolvedValueOnce([]);
      const handler = commands.get("search-docs")!.handler;
      await handler({ args: "query 99" });
      expect(mockSearch).toHaveBeenCalledWith("query", { limit: 20 });
    });

    it("includes the query in the 'no results' message", async () => {
      mockSearch.mockResolvedValueOnce([]);
      const handler = commands.get("search-docs")!.handler;
      const result = await handler({ args: "unicorn setup" });
      expect(result.text).toContain("unicorn setup");
    });

    it("truncates long text in results to 120 characters", async () => {
      const longText = "A".repeat(200);
      mockSearch.mockResolvedValueOnce([
        {
          item: {
            id: "long1",
            kind: "doc",
            text: longText,
            createdAt: "2026-01-15T00:00:00Z",
            tags: ["docs"],
          },
          score: 0.9,
        },
      ]);
      const handler = commands.get("search-docs")!.handler;
      const result = await handler({ args: "test" });
      // Should not contain the full 200 chars; truncated at 120
      expect(result.text).not.toContain("A".repeat(200));
      expect(result.text).toContain("A".repeat(120));
    });
  });

  // -------------------------------------------------------------------------
  // /list-docs
  // -------------------------------------------------------------------------

  describe("/list-docs", () => {
    it("returns empty message when no items exist", async () => {
      mockList.mockResolvedValueOnce([]);
      const handler = commands.get("list-docs")!.handler;
      const result = await handler({ args: "" });
      expect(result.text).toContain("No docs memories stored yet");
    });

    it("lists items with their IDs (issue #4)", async () => {
      const items: MemoryItem[] = [
        {
          id: "abcdef12-3456-7890-abcd-ef1234567890",
          kind: "doc",
          text: "First doc item",
          createdAt: "2026-01-15T00:00:00Z",
          tags: ["docs"],
        },
        {
          id: "deadbeef-cafe-1234-5678-abcdef012345",
          kind: "doc",
          text: "Second doc item",
          createdAt: "2026-01-16T00:00:00Z",
          tags: ["docs"],
        },
      ];
      mockList.mockResolvedValueOnce(items);
      const handler = commands.get("list-docs")!.handler;
      const result = await handler({ args: "" });

      // Issue #4: output must include item IDs so users can reference them with /forget-doc
      expect(result.text).toContain("abcdef12");
      expect(result.text).toContain("deadbeef");
      // Should also contain the date and text preview
      expect(result.text).toContain("2026-01-15");
      expect(result.text).toContain("First doc item");
      expect(result.text).toContain("2026-01-16");
      expect(result.text).toContain("Second doc item");
    });

    it("includes full IDs in the footer for copy-paste", async () => {
      const items: MemoryItem[] = [
        {
          id: "abcdef12-3456-7890-abcd-ef1234567890",
          kind: "doc",
          text: "A doc",
          createdAt: "2026-01-15T00:00:00Z",
          tags: ["docs"],
        },
      ];
      mockList.mockResolvedValueOnce(items);
      const handler = commands.get("list-docs")!.handler;
      const result = await handler({ args: "" });
      // Full ID should appear in the footer
      expect(result.text).toContain("abcdef12-3456-7890-abcd-ef1234567890");
      expect(result.text).toContain("/forget-doc");
    });

    it("shows short IDs for items with IDs shorter than 8 chars", async () => {
      const items: MemoryItem[] = [
        {
          id: "short",
          kind: "doc",
          text: "Short id item",
          createdAt: "2026-02-01T00:00:00Z",
          tags: ["docs"],
        },
      ];
      mockList.mockResolvedValueOnce(items);
      const handler = commands.get("list-docs")!.handler;
      const result = await handler({ args: "" });
      expect(result.text).toContain("[id:short]");
    });

    it("passes limit to the store", async () => {
      mockList.mockResolvedValueOnce([]);
      const handler = commands.get("list-docs")!.handler;
      await handler({ args: "5" });
      expect(mockList).toHaveBeenCalledWith({ limit: 5 });
    });

    it("defaults limit to 10 when no arg is given", async () => {
      mockList.mockResolvedValueOnce([]);
      const handler = commands.get("list-docs")!.handler;
      await handler({ args: "" });
      expect(mockList).toHaveBeenCalledWith({ limit: 10 });
    });

    it("clamps limit to maximum of 50", async () => {
      mockList.mockResolvedValueOnce([]);
      const handler = commands.get("list-docs")!.handler;
      await handler({ args: "999" });
      expect(mockList).toHaveBeenCalledWith({ limit: 50 });
    });

    it("truncates long text in list output to 120 characters", async () => {
      const longText = "B".repeat(200);
      mockList.mockResolvedValueOnce([
        {
          id: "trunc-id-1234",
          kind: "doc",
          text: longText,
          createdAt: "2026-02-01T00:00:00Z",
          tags: ["docs"],
        },
      ]);
      const handler = commands.get("list-docs")!.handler;
      const result = await handler({ args: "" });
      expect(result.text).not.toContain("B".repeat(200));
      expect(result.text).toContain("B".repeat(120));
    });

    it("shows item count in header", async () => {
      mockList.mockResolvedValueOnce([
        {
          id: "count-1",
          kind: "doc",
          text: "Item one",
          createdAt: "2026-01-01T00:00:00Z",
          tags: ["docs"],
        },
        {
          id: "count-2",
          kind: "doc",
          text: "Item two",
          createdAt: "2026-01-02T00:00:00Z",
          tags: ["docs"],
        },
      ]);
      const handler = commands.get("list-docs")!.handler;
      const result = await handler({ args: "" });
      expect(result.text).toContain("(2)");
    });
  });

  // -------------------------------------------------------------------------
  // /forget-doc
  // -------------------------------------------------------------------------

  describe("/forget-doc", () => {
    it("returns usage text when no id is provided", async () => {
      const handler = commands.get("forget-doc")!.handler;
      const result = await handler({ args: "" });
      expect(result.text).toContain("Usage:");
    });

    it("deletes an existing item and confirms", async () => {
      mockDelete.mockResolvedValueOnce(true);
      const handler = commands.get("forget-doc")!.handler;
      const result = await handler({ args: "abc123" });
      expect(result.text).toContain("Deleted docs memory");
      expect(result.text).toContain("abc123");
      expect(mockDelete).toHaveBeenCalledWith("abc123");
    });

    it("returns 'not found' when deleting a non-existent id", async () => {
      mockDelete.mockResolvedValueOnce(false);
      const handler = commands.get("forget-doc")!.handler;
      const result = await handler({ args: "ghost-id" });
      expect(result.text).toContain("No memory found");
      expect(result.text).toContain("ghost-id");
    });

    it("returns usage text when id is whitespace", async () => {
      const handler = commands.get("forget-doc")!.handler;
      const result = await handler({ args: "   " });
      expect(result.text).toContain("Usage:");
    });

    it("requires authentication", () => {
      const def = commands.get("forget-doc")!;
      expect(def.requireAuth).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // docs_memory_search tool
  // -------------------------------------------------------------------------

  describe("docs_memory_search tool", () => {
    it("returns empty hits array when query is empty", async () => {
      const handler = tools.get("docs_memory_search")!.handler;
      const result = (await handler({ query: "" })) as { hits: unknown[] };
      expect(result.hits).toEqual([]);
    });

    it("returns empty hits array when query is whitespace", async () => {
      const handler = tools.get("docs_memory_search")!.handler;
      const result = (await handler({ query: "   " })) as { hits: unknown[] };
      expect(result.hits).toEqual([]);
    });

    it("returns formatted search results", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          item: {
            id: "hit-1",
            kind: "doc" as const,
            text: "Found document text",
            createdAt: "2026-01-10T00:00:00Z",
            tags: ["docs"],
          },
          score: 0.92,
        },
      ]);
      const handler = tools.get("docs_memory_search")!.handler;
      const result = (await handler({ query: "document" })) as {
        hits: Array<{ score: number; id: string; text: string; createdAt: string; tags: string[] }>;
      };
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0]!.id).toBe("hit-1");
      expect(result.hits[0]!.score).toBe(0.92);
      expect(result.hits[0]!.text).toBe("Found document text");
      expect(result.hits[0]!.createdAt).toBe("2026-01-10T00:00:00Z");
      expect(result.hits[0]!.tags).toEqual(["docs"]);
    });

    it("passes limit to the store search", async () => {
      mockSearch.mockResolvedValueOnce([]);
      const handler = tools.get("docs_memory_search")!.handler;
      await handler({ query: "test", limit: 3 });
      expect(mockSearch).toHaveBeenCalledWith("test", { limit: 3 });
    });

    it("defaults limit to 5 when not specified", async () => {
      mockSearch.mockResolvedValueOnce([]);
      const handler = tools.get("docs_memory_search")!.handler;
      await handler({ query: "test" });
      expect(mockSearch).toHaveBeenCalledWith("test", { limit: 5 });
    });

    it("clamps limit to maximum of 20", async () => {
      mockSearch.mockResolvedValueOnce([]);
      const handler = tools.get("docs_memory_search")!.handler;
      await handler({ query: "test", limit: 50 });
      expect(mockSearch).toHaveBeenCalledWith("test", { limit: 20 });
    });

    it("passes tags filter to the store search", async () => {
      mockSearch.mockResolvedValueOnce([]);
      const handler = tools.get("docs_memory_search")!.handler;
      await handler({ query: "test", tags: ["api", "auth"] });
      expect(mockSearch).toHaveBeenCalledWith("test", { limit: 5, tags: ["api", "auth"] });
    });

    it("filters results by project when provided", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          item: { id: "p1", kind: "doc", text: "Match", createdAt: "2026-01-01T00:00:00Z", tags: ["docs"], meta: { project: "AEGIS" } },
          score: 0.9,
        },
        {
          item: { id: "p2", kind: "doc", text: "No match", createdAt: "2026-01-02T00:00:00Z", tags: ["docs"] },
          score: 0.8,
        },
      ]);
      const handler = tools.get("docs_memory_search")!.handler;
      const result = (await handler({ query: "test", project: "AEGIS" })) as { hits: Array<{ id: string }> };
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0]!.id).toBe("p1");
    });

    it("includes project in result objects", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          item: { id: "proj-1", kind: "doc", text: "With project", createdAt: "2026-01-01T00:00:00Z", tags: ["docs"], meta: { project: "AEGIS" } },
          score: 0.9,
        },
      ]);
      const handler = tools.get("docs_memory_search")!.handler;
      const result = (await handler({ query: "test" })) as { hits: Array<{ project?: string }> };
      expect(result.hits[0]!.project).toBe("AEGIS");
    });

    it("returns undefined project when item has no project metadata", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          item: { id: "no-proj", kind: "doc", text: "No project", createdAt: "2026-01-01T00:00:00Z", tags: ["docs"] },
          score: 0.9,
        },
      ]);
      const handler = tools.get("docs_memory_search")!.handler;
      const result = (await handler({ query: "test" })) as { hits: Array<{ project?: string }> };
      expect(result.hits[0]!.project).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // /remember-doc with --tags and --project (T-004)
  // -------------------------------------------------------------------------

  describe("/remember-doc with metadata flags", () => {
    it("merges --tags with defaultTags", async () => {
      const handler = commands.get("remember-doc")!.handler;
      const result = await handler({ args: "--tags api,auth Some API auth note" });
      expect(result.text).toContain("Saved docs memory.");
      expect(result.text).toContain("Tags: docs, api, auth.");
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.tags).toEqual(["docs", "api", "auth"]);
    });

    it("accepts --tags=val syntax", async () => {
      const handler = commands.get("remember-doc")!.handler;
      await handler({ args: "--tags=infra,deploy Server setup notes" });
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.tags).toEqual(["docs", "infra", "deploy"]);
    });

    it("stores project in meta.project", async () => {
      const handler = commands.get("remember-doc")!.handler;
      const result = await handler({ args: "--project AEGIS Important AEGIS note" });
      expect(result.text).toContain("Project: AEGIS.");
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.meta).toBeDefined();
      expect((savedItem.meta as Record<string, unknown>).project).toBe("AEGIS");
    });

    it("accepts --project=val syntax", async () => {
      const handler = commands.get("remember-doc")!.handler;
      await handler({ args: "--project=CRM Note for CRM project" });
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect((savedItem.meta as Record<string, unknown>).project).toBe("CRM");
    });

    it("combines --tags and --project together", async () => {
      const handler = commands.get("remember-doc")!.handler;
      const result = await handler({ args: "--tags api --project AEGIS Auth flow doc" });
      expect(result.text).toContain("Tags: docs, api.");
      expect(result.text).toContain("Project: AEGIS.");
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.tags).toEqual(["docs", "api"]);
      expect((savedItem.meta as Record<string, unknown>).project).toBe("AEGIS");
    });

    it("deduplicates tags when user provides a tag that is already in defaultTags", async () => {
      const handler = commands.get("remember-doc")!.handler;
      await handler({ args: "--tags docs,api Already has docs tag" });
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.tags).toEqual(["docs", "api"]);
    });

    it("returns usage when only flags are provided with no text", async () => {
      const handler = commands.get("remember-doc")!.handler;
      const result = await handler({ args: "--tags api --project X" });
      expect(result.text).toContain("Usage:");
    });

    it("does not set meta when neither secrets nor project are present", async () => {
      const handler = commands.get("remember-doc")!.handler;
      await handler({ args: "Plain text no flags" });
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.meta).toBeUndefined();
    });

    it("sets meta with both redaction and project when both apply", async () => {
      const handler = commands.get("remember-doc")!.handler;
      await handler({
        args: "--project SecretProj my key is sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn",
      });
      const savedItem = mockAdd.mock.calls[0]![0] as MemoryItem;
      expect(savedItem.meta).toBeDefined();
      expect((savedItem.meta as Record<string, unknown>).project).toBe("SecretProj");
      expect((savedItem.meta as Record<string, unknown>).redaction).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // /search-docs with metadata display and filtering (T-004)
  // -------------------------------------------------------------------------

  describe("/search-docs with metadata", () => {
    it("shows tags badge for items with non-default tags", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          item: { id: "tagged-1234", kind: "doc", text: "Tagged item", createdAt: "2026-01-01T00:00:00Z", tags: ["docs", "api"] },
          score: 0.9,
        },
      ]);
      const handler = commands.get("search-docs")!.handler;
      const result = await handler({ args: "tagged" });
      expect(result.text).toContain("[tags:api]");
    });

    it("shows project badge for items with project metadata", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          item: { id: "proj-1234", kind: "doc", text: "Project item", createdAt: "2026-01-01T00:00:00Z", tags: ["docs"], meta: { project: "AEGIS" } },
          score: 0.9,
        },
      ]);
      const handler = commands.get("search-docs")!.handler;
      const result = await handler({ args: "project" });
      expect(result.text).toContain("[project:AEGIS]");
    });

    it("does not show tags badge when only default tags are present", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          item: { id: "default-1234", kind: "doc", text: "Default tags only", createdAt: "2026-01-01T00:00:00Z", tags: ["docs"] },
          score: 0.9,
        },
      ]);
      const handler = commands.get("search-docs")!.handler;
      const result = await handler({ args: "default" });
      expect(result.text).not.toContain("[tags:");
    });

    it("passes --tags filter to the store search", async () => {
      mockSearch.mockResolvedValueOnce([]);
      const handler = commands.get("search-docs")!.handler;
      await handler({ args: "--tags api some query" });
      expect(mockSearch).toHaveBeenCalledWith("some query", { limit: 5, tags: ["api"] });
    });

    it("post-filters by --project flag", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          item: { id: "aegis-1", kind: "doc", text: "AEGIS doc", createdAt: "2026-01-01T00:00:00Z", tags: ["docs"], meta: { project: "AEGIS" } },
          score: 0.9,
        },
        {
          item: { id: "other-1", kind: "doc", text: "Other doc", createdAt: "2026-01-02T00:00:00Z", tags: ["docs"], meta: { project: "CRM" } },
          score: 0.8,
        },
      ]);
      const handler = commands.get("search-docs")!.handler;
      const result = await handler({ args: "--project AEGIS doc" });
      expect(result.text).toContain("AEGIS doc");
      expect(result.text).not.toContain("Other doc");
    });
  });

  // -------------------------------------------------------------------------
  // /list-docs with metadata display and filtering (T-004)
  // -------------------------------------------------------------------------

  describe("/list-docs with metadata", () => {
    it("shows tags badge for items with non-default tags", async () => {
      mockList.mockResolvedValueOnce([
        { id: "tagged-list", kind: "doc", text: "Tagged item", createdAt: "2026-01-01T00:00:00Z", tags: ["docs", "infra"] },
      ]);
      const handler = commands.get("list-docs")!.handler;
      const result = await handler({ args: "" });
      expect(result.text).toContain("[tags:infra]");
    });

    it("shows project badge for items with project metadata", async () => {
      mockList.mockResolvedValueOnce([
        { id: "proj-list", kind: "doc", text: "Project item", createdAt: "2026-01-01T00:00:00Z", tags: ["docs"], meta: { project: "AEGIS" } },
      ]);
      const handler = commands.get("list-docs")!.handler;
      const result = await handler({ args: "" });
      expect(result.text).toContain("[project:AEGIS]");
    });

    it("passes --tags filter to the store list", async () => {
      mockList.mockResolvedValueOnce([]);
      const handler = commands.get("list-docs")!.handler;
      await handler({ args: "--tags api" });
      expect(mockList).toHaveBeenCalledWith({ limit: 10, tags: ["api"] });
    });

    it("post-filters by --project flag", async () => {
      mockList.mockResolvedValueOnce([
        { id: "aegis-l1", kind: "doc", text: "AEGIS item", createdAt: "2026-01-01T00:00:00Z", tags: ["docs"], meta: { project: "AEGIS" } },
        { id: "crm-l1", kind: "doc", text: "CRM item", createdAt: "2026-01-02T00:00:00Z", tags: ["docs"], meta: { project: "CRM" } },
      ]);
      const handler = commands.get("list-docs")!.handler;
      const result = await handler({ args: "--project AEGIS" });
      expect(result.text).toContain("AEGIS item");
      expect(result.text).not.toContain("CRM item");
      expect(result.text).toContain("(1)");
    });

    it("combines --tags and --project filtering", async () => {
      mockList.mockResolvedValueOnce([
        { id: "both-1", kind: "doc", text: "Both match", createdAt: "2026-01-01T00:00:00Z", tags: ["docs", "api"], meta: { project: "AEGIS" } },
      ]);
      const handler = commands.get("list-docs")!.handler;
      const result = await handler({ args: "--tags api --project AEGIS" });
      expect(mockList).toHaveBeenCalledWith({ limit: 10, tags: ["api"] });
      expect(result.text).toContain("Both match");
    });

    it("returns empty message when project filter excludes all items", async () => {
      mockList.mockResolvedValueOnce([
        { id: "no-match", kind: "doc", text: "Wrong project", createdAt: "2026-01-01T00:00:00Z", tags: ["docs"], meta: { project: "CRM" } },
      ]);
      const handler = commands.get("list-docs")!.handler;
      const result = await handler({ args: "--project AEGIS" });
      expect(result.text).toContain("No docs memories stored yet.");
    });
  });
});

// ---------------------------------------------------------------------------
// parseFlags unit tests
// ---------------------------------------------------------------------------

describe("parseFlags", () => {
  it("returns empty tags and no project for plain text", () => {
    const result = parseFlags("hello world");
    expect(result.tags).toEqual([]);
    expect(result.project).toBeUndefined();
    expect(result.text).toBe("hello world");
  });

  it("parses --tags=val syntax", () => {
    const result = parseFlags("--tags=api,auth some text");
    expect(result.tags).toEqual(["api", "auth"]);
    expect(result.text).toBe("some text");
  });

  it("parses --tags val syntax", () => {
    const result = parseFlags("--tags infra,deploy some text");
    expect(result.tags).toEqual(["infra", "deploy"]);
    expect(result.text).toBe("some text");
  });

  it("parses --project=val syntax", () => {
    const result = parseFlags("--project=AEGIS some text");
    expect(result.project).toBe("AEGIS");
    expect(result.text).toBe("some text");
  });

  it("parses --project val syntax", () => {
    const result = parseFlags("--project AEGIS some text");
    expect(result.project).toBe("AEGIS");
    expect(result.text).toBe("some text");
  });

  it("parses both --tags and --project together", () => {
    const result = parseFlags("--tags api --project AEGIS the actual text");
    expect(result.tags).toEqual(["api"]);
    expect(result.project).toBe("AEGIS");
    expect(result.text).toBe("the actual text");
  });

  it("handles single tag", () => {
    const result = parseFlags("--tags=api text");
    expect(result.tags).toEqual(["api"]);
  });

  it("filters out empty tags from trailing commas", () => {
    const result = parseFlags("--tags=api, text");
    expect(result.tags).toEqual(["api"]);
  });

  it("handles flags at end of string", () => {
    const result = parseFlags("some text --tags=api");
    expect(result.tags).toEqual(["api"]);
    expect(result.text).toBe("some text");
  });

  it("returns empty text when only flags are given", () => {
    const result = parseFlags("--tags api --project X");
    expect(result.text).toBe("");
  });

  it("normalizes whitespace in remaining text", () => {
    const result = parseFlags("--tags api   extra   spaces   here");
    expect(result.text).toBe("extra spaces here");
  });
});
