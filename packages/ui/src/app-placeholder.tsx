type AppPlaceholderProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
}>;

export function AppPlaceholder({
  eyebrow,
  title,
  description,
}: AppPlaceholderProps) {
  return (
    <section aria-labelledby="app-title">
      <p>{eyebrow}</p>
      <h1 id="app-title">{title}</h1>
      <p>{description}</p>
    </section>
  );
}
