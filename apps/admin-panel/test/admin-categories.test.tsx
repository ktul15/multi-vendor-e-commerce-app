import { renderWithProviders } from "@repo/test-utils";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCategoriesView } from "../app/admin-categories-view";
import type { AdminCategoryTreeNode } from "../src/lib/category-data";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("next/image", () => ({
  default: (props: ComponentProps<"img"> & { unoptimized?: boolean }) => {
    const { unoptimized, ...imageProps } = props;
    void unoptimized;
    return createElement("img", imageProps);
  },
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  navigation.refresh.mockReset();
  vi.unstubAllGlobals();
  document.cookie = "admin_csrf_token=csrf-token; path=/";
});

const dates = { createdAt: "2026-08-14T08:00:00.000Z", updatedAt: "2026-08-14T08:00:00.000Z" };
const phones: AdminCategoryTreeNode = {
  ...dates,
  children: [],
  id: "22222222-2222-4222-8222-222222222222",
  image: null,
  name: "Phones with an exceptionally long catalog category name",
  parentId: "11111111-1111-4111-8111-111111111111",
  slug: "phones",
};
const electronics: AdminCategoryTreeNode = {
  ...dates,
  children: [phones],
  id: "11111111-1111-4111-8111-111111111111",
  image: "https://cdn.test/electronics.jpg",
  name: "Electronics",
  parentId: null,
  slug: "electronics",
};

describe("admin category management", () => {
  it("visually identifies hierarchy depth and preserves long paths", () => {
    renderWithProviders(<AdminCategoriesView categories={[electronics]} />);
    const root = screen.getByRole("listitem", { name: "Electronics, hierarchy level 1" });
    const child = screen.getByRole("listitem", {
      name: /Electronics \/ Phones with an exceptionally long catalog category name, hierarchy level 2/,
    });
    expect(within(root).getByText("Electronics", { selector: "strong" })).toBeVisible();
    expect(within(child).getByTitle(/Electronics \/ Phones/)).toBeVisible();
    expect(within(root).getByText("1 direct children")).toBeVisible();
  });

  it("creates a child with an image and refreshes the server tree", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: { id: "new-category" }, success: true })),
    );
    const actor = userEvent.setup();
    renderWithProviders(<AdminCategoriesView categories={[electronics]} />);
    await actor.click(screen.getByRole("button", { name: "Create category" }));
    const dialog = screen.getByRole("dialog", { name: "Create category" });
    await actor.type(within(dialog).getByRole("textbox", { name: /Category name/ }), "Wearables");
    await actor.selectOptions(within(dialog).getByLabelText("Parent category"), electronics.id);
    const image = new File(["image"], "wearables.webp", { type: "image/webp" });
    await actor.upload(within(dialog).getByLabelText("Category image"), image);
    await actor.click(within(dialog).getByRole("button", { name: "Save category" }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
    const fetch = vi.mocked(globalThis.fetch);
    expect(fetch).toHaveBeenCalledWith(
      "/api/categories",
      expect.objectContaining({
        body: expect.any(FormData),
        headers: { "X-CSRF-Token": "csrf-token" },
        method: "POST",
      }),
    );
    const body = fetch.mock.calls[0]?.[1]?.body as FormData;
    expect(body.get("name")).toBe("Wearables");
    expect(body.get("parentId")).toBe(electronics.id);
    expect(body.get("image")).toBe(image);
  });

  it("supports keyboard editing and disables self and descendant parents", async () => {
    const actor = userEvent.setup();
    renderWithProviders(<AdminCategoriesView categories={[electronics]} />);
    const root = screen.getByRole("listitem", { name: "Electronics, hierarchy level 1" });
    const edit = within(root).getByRole("button", { name: "Edit" });
    edit.focus();
    await actor.keyboard("{Enter}");
    const dialog = screen.getByRole("dialog", { name: "Edit Electronics" });
    const select = within(dialog).getByLabelText("Parent category");
    expect(within(select).getByRole("option", { name: "Electronics" })).toBeDisabled();
    expect(
      within(select).getByRole("option", { name: /Phones with an exceptionally/ }),
    ).toBeDisabled();
    expect(dialog).toBeVisible();
  });

  it("edits and deletes a leaf category through refreshable mutations", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ data: {}, success: true }),
    );
    vi.stubGlobal("fetch", fetch);
    const actor = userEvent.setup();
    renderWithProviders(<AdminCategoriesView categories={[electronics]} />);
    const child = screen.getByRole("listitem", { name: /Phones.+hierarchy level 2/ });
    await actor.click(within(child).getByRole("button", { name: "Edit" }));
    const editDialog = screen.getByRole("dialog", { name: /Edit Phones/ });
    const name = within(editDialog).getByRole("textbox", { name: /Category name/ });
    await actor.clear(name);
    await actor.type(name, "Smartphones");
    await actor.selectOptions(within(editDialog).getByLabelText("Parent category"), "");
    await actor.click(within(editDialog).getByRole("button", { name: "Save category" }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
    expect(fetch.mock.calls[0]?.[0]).toBe(`/api/categories/${phones.id}`);
    expect(fetch.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: "PUT" }));

    await actor.click(within(child).getByRole("button", { name: "Delete" }));
    await actor.click(screen.getByRole("button", { name: "Delete category" }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls[1]?.[0]).toBe(`/api/categories/${phones.id}`);
    expect(fetch.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: "DELETE" }));
  });

  it("prevents child-bearing deletes and explains product dependency failures", async () => {
    const actor = userEvent.setup();
    const fetch = vi.fn(async () =>
      Response.json(
        { message: "Cannot delete category with attached products", success: false },
        { status: 400 },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    renderWithProviders(<AdminCategoriesView categories={[electronics]} />);
    const root = screen.getByRole("listitem", { name: "Electronics, hierarchy level 1" });
    await actor.click(within(root).getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Delete category" })).toBeDisabled();
    expect(screen.getByRole("dialog")).toHaveTextContent("Move or delete this category’s children");
    await actor.click(screen.getByRole("button", { name: "Cancel" }));

    const child = screen.getByRole("listitem", { name: /Phones.+hierarchy level 2/ });
    await actor.click(within(child).getByRole("button", { name: "Delete" }));
    await actor.click(screen.getByRole("button", { name: "Delete category" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("attached products");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("shows empty and retryable error states", () => {
    const { rerender } = renderWithProviders(<AdminCategoriesView />);
    expect(screen.getByRole("heading", { name: "No categories yet" })).toBeVisible();
    rerender(<AdminCategoriesView error="Categories could not be loaded." />);
    expect(screen.getByRole("heading", { name: "Categories unavailable" })).toBeVisible();
  });
});
