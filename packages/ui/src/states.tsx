import type { ReactNode } from "react";

type StateProps = Readonly<{
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}>;

export function EmptyState({ action, description, icon = "◇", title }: StateProps) {
  return (
    <section className="ui-state">
      <span aria-hidden="true" className="ui-state__icon">
        {icon}
      </span>
      <h3 className="ui-state__title">{title}</h3>
      <p className="ui-state__description">{description}</p>
      {action}
    </section>
  );
}

export function ErrorState({ action, description, icon = "!", title }: StateProps) {
  return (
    <section aria-live="polite" className="ui-state ui-state--error" role="alert">
      <span aria-hidden="true" className="ui-state__icon">
        {icon}
      </span>
      <h3 className="ui-state__title">{title}</h3>
      <p className="ui-state__description">{description}</p>
      {action}
    </section>
  );
}
