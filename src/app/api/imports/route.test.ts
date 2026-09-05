import { describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { POST } from "./route";

describe("statement import route", () => {
  it("returns a clear conflict before uploading an existing statement", async () => {
    const upload = vi.fn();
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { status: "active" } }),
    };
    const importQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          file_name: "venmo-august.csv",
          committed_at: "2026-09-05T12:00:00.000Z",
        },
        error: null,
      }),
    };
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn((table: string) =>
        table === "profiles" ? profileQuery : importQuery,
      ),
      storage: {
        from: vi.fn(() => ({ upload })),
      },
    });
    const form = new FormData();
    form.set("accountId", "account-1");
    form.set("fileName", "venmo-august.csv");
    form.set("fileHash", "a".repeat(64));
    form.set(
      "candidates",
      JSON.stringify([
        {
          rowNumber: 1,
          date: "2026-08-02",
          description: "Dinner",
          amountCents: -2500,
          confidence: 100,
          raw: { Date: "2026-08-02" },
          errors: [],
        },
      ]),
    );
    form.set(
      "file",
      new File(["Date,Description,Amount"], "venmo-august.csv", {
        type: "text/csv",
      }),
    );

    const response = await POST({
      formData: async () => form,
    } as Request);
    const result = await response.json();

    expect(response.status).toBe(409);
    expect(result).toEqual({
      code: "statement_already_imported",
      error:
        "“venmo-august.csv” was already imported on Sep 5, 2026. No duplicate transactions were added.",
    });
    expect(upload).not.toHaveBeenCalled();
  });
});
