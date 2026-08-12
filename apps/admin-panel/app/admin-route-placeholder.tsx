import { AppPlaceholder } from "@repo/ui";

export function AdminRoutePlaceholder({
  description,
  title,
}: Readonly<{ description: string; title: string }>) {
  return (
    <div className="admin-route-placeholder">
      <AppPlaceholder eyebrow="Admin Console" title={title} description={description} />
    </div>
  );
}
