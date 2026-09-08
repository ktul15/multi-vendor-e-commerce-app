"use client";

import { Button, Card, CardContent, Dialog, EmptyState, ErrorState, Input, Select } from "@repo/ui";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { AdminCategoryTreeNode } from "../src/lib/category-data";

type FlatCategory = Readonly<{
  category: AdminCategoryTreeNode;
  depth: number;
  path: string;
}>;
type EditorState = Readonly<{ category?: AdminCategoryTreeNode; mode: "create" | "edit" }>;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function flattenCategories(
  categories: readonly AdminCategoryTreeNode[],
  depth = 0,
  ancestors: readonly string[] = [],
): FlatCategory[] {
  return categories.flatMap((category) => {
    const path = [...ancestors, category.name];
    return [
      { category, depth, path: path.join(" / ") },
      ...flattenCategories(category.children, depth + 1, path),
    ];
  });
}

function descendantIds(category: AdminCategoryTreeNode): Set<string> {
  const ids = new Set<string>([category.id]);
  const visit = (node: AdminCategoryTreeNode) => {
    for (const child of node.children) {
      ids.add(child.id);
      visit(child);
    }
  };
  visit(category);
  return ids;
}

function csrfToken(): string | undefined {
  const value = document.cookie
    .split(";")
    .map((entry) => entry.trim().split("="))
    .find(([name]) => name === "admin_csrf_token")
    ?.slice(1)
    .join("=");
  return value ? decodeURIComponent(value) : undefined;
}

async function categoryRequest(url: string, method: "DELETE" | "POST" | "PUT", body?: FormData) {
  const token = csrfToken();
  const response = await fetch(url, {
    body,
    headers: token ? { "X-CSRF-Token": token } : undefined,
    method,
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) throw new Error(payload.message || "Category request failed");
}

function CategoryEditor({
  allCategories,
  editor,
  onClose,
}: Readonly<{
  allCategories: readonly FlatCategory[];
  editor: EditorState;
  onClose: () => void;
}>) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [imageName, setImageName] = useState<string>();
  const [selectedImage, setSelectedImage] = useState<File>();
  const blockedParents = editor.category ? descendantIds(editor.category) : new Set<string>();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestInFlight.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (selectedImage) data.set("image", selectedImage);
    const name = String(data.get("name") ?? "").trim();
    if (name.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    data.set("name", name);
    const image = data.get("image");
    if (image instanceof File && image.size) {
      if (!acceptedImageTypes.has(image.type)) {
        setError("Image must be JPEG, PNG, or WebP");
        return;
      }
      if (image.size > MAX_IMAGE_BYTES) {
        setError("Image must be 5 MB or smaller");
        return;
      }
    } else {
      data.delete("image");
    }
    if (editor.mode === "create" && !data.get("parentId")) data.delete("parentId");
    requestInFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      await categoryRequest(
        editor.category ? `/api/categories/${editor.category.id}` : "/api/categories",
        editor.mode === "create" ? "POST" : "PUT",
        data,
      );
      onClose();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Category could not be saved");
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  };
  const title = editor.mode === "create" ? "Create category" : `Edit ${editor.category?.name}`;
  return (
    <Dialog
      description="Names and hierarchy paths are shown throughout the catalog. Images accept JPEG, PNG, or WebP up to 5 MB."
      footer={null}
      onClose={() => {
        if (!pending) onClose();
      }}
      open
      title={title}
    >
      <form className="admin-category-form" onSubmit={(event) => void submit(event)}>
        <Input
          defaultValue={editor.category?.name ?? ""}
          label="Category name"
          maxLength={120}
          name="name"
          required
        />
        <Select
          defaultValue={editor.category?.parentId ?? ""}
          hint="A category cannot be placed beneath itself or its descendants."
          label="Parent category"
          name="parentId"
        >
          <option value="">No parent (root category)</option>
          {allCategories.map(({ category, depth, path }) => (
            <option
              disabled={blockedParents.has(category.id)}
              key={category.id}
              value={category.id}
            >
              {`${"— ".repeat(depth)}${path}`}
            </option>
          ))}
        </Select>
        <Input
          accept="image/jpeg,image/png,image/webp"
          hint={imageName ? `Selected: ${imageName}` : "Optional; replaces the current image."}
          label="Category image"
          name="image"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            setImageName(file?.name);
            setSelectedImage(file);
          }}
          type="file"
        />
        {editor.category?.image ? (
          <div className="admin-category-form__current">
            <Image alt="" height={64} src={editor.category.image} unoptimized width={64} />
            <span>Current image</span>
          </div>
        ) : null}
        {error ? (
          <p className="admin-category-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="admin-category-form__actions">
          <Button disabled={pending} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button loading={pending} loadingLabel="Saving category" type="submit">
            Save category
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteCategory({
  category,
  onClose,
}: Readonly<{ category: AdminCategoryTreeNode; onClose: () => void }>) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const hasChildren = category.children.length > 0;
  const remove = async () => {
    if (requestInFlight.current || hasChildren) return;
    requestInFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      await categoryRequest(`/api/categories/${category.id}`, "DELETE");
      onClose();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Category could not be deleted");
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  };
  return (
    <Dialog
      description={
        hasChildren
          ? "Move or delete this category’s children before deleting it. Categories with products must also be reassigned first."
          : "Deletion is permanent. If products use this category, the request will be blocked until they are reassigned."
      }
      footer={
        <>
          <Button disabled={pending} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={hasChildren}
            loading={pending}
            loadingLabel="Deleting category"
            onClick={() => void remove()}
            variant="danger"
          >
            Delete category
          </Button>
        </>
      }
      onClose={() => {
        if (!pending) onClose();
      }}
      open
      title={`Delete ${category.name}?`}
    >
      {error ? (
        <p className="admin-category-error" role="alert">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}

export function AdminCategoriesView({
  categories = [],
  error,
}: Readonly<{ categories?: readonly AdminCategoryTreeNode[]; error?: string }>) {
  const [editor, setEditor] = useState<EditorState>();
  const [deleting, setDeleting] = useState<AdminCategoryTreeNode>();
  const flattened = useMemo(() => flattenCategories(categories), [categories]);
  return (
    <div className="admin-category-list">
      <header className="admin-category-list__header">
        <div>
          <p>Catalog structure</p>
          <h1>Categories</h1>
          <p>Organize products into an accessible hierarchy at any depth.</p>
        </div>
        <Button onClick={() => setEditor({ mode: "create" })}>Create category</Button>
      </header>
      {error ? (
        <ErrorState
          action={
            <Button onClick={() => window.location.reload()} variant="secondary">
              Try again
            </Button>
          }
          description={error}
          title="Categories unavailable"
        />
      ) : flattened.length ? (
        <Card>
          <CardContent>
            <div aria-label="Category hierarchy" className="admin-category-tree" role="list">
              {flattened.map(({ category, depth, path }) => (
                <div
                  aria-label={`${path}, hierarchy level ${depth + 1}`}
                  className="admin-category-row"
                  key={category.id}
                  role="listitem"
                  style={{ "--category-depth": depth } as CSSProperties}
                >
                  <div className="admin-category-row__identity">
                    {category.image ? (
                      <Image alt="" height={48} src={category.image} unoptimized width={48} />
                    ) : (
                      <span aria-hidden="true" className="admin-category-row__placeholder">
                        {category.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span>
                      <strong>{category.name}</strong>
                      <small title={path}>{path}</small>
                    </span>
                  </div>
                  <div className="admin-category-row__meta">
                    <code>{category.slug}</code>
                    <span>{category.children.length} direct children</span>
                  </div>
                  <div className="admin-category-row__actions">
                    <Button
                      onClick={() => setEditor({ category, mode: "edit" })}
                      size="sm"
                      variant="secondary"
                    >
                      Edit
                    </Button>
                    <Button onClick={() => setDeleting(category)} size="sm" variant="danger">
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          action={<Button onClick={() => setEditor({ mode: "create" })}>Create category</Button>}
          description="Create a root category, then add children as your catalog grows."
          title="No categories yet"
        />
      )}
      {editor ? (
        <CategoryEditor
          allCategories={flattened}
          editor={editor}
          onClose={() => setEditor(undefined)}
        />
      ) : null}
      {deleting ? (
        <DeleteCategory category={deleting} onClose={() => setDeleting(undefined)} />
      ) : null}
    </div>
  );
}
