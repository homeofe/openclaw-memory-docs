import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  PluginApi,
  CommandDefinition,
  ToolDefinition,
  CommandContext,
  MemoryItem,
  SearchHit,
} from "@elvatis_com/openclaw-memory-core";

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

    it("returns formatted results for matching items", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          item: {
            id: "abc123",
            kind: "doc",
            text: "First matching doc about residency",
            createdAt: "2026-01-15T00:00:00Z",
            tags: ["docs"],
          },
          score: 0.85,
        },
        {
          item: {
            id: "def456",
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
  });
});
