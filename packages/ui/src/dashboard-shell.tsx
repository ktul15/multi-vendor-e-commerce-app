"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ComponentType, MouseEvent, ReactNode } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";

export type DashboardNavItem = Readonly<{
  children?: readonly DashboardNavItem[];
  href: string;
  icon?: ReactNode;
  label: string;
  navigationOnly?: boolean;
}>;

type DashboardAccountLinkAction = Readonly<{
  href: string;
  label: string;
  onSelect?: never;
}>;

type DashboardAccountCommandAction = Readonly<{
  href?: never;
  label: string;
  onSelect: () => void;
}>;

export type DashboardAccountAction = DashboardAccountLinkAction | DashboardAccountCommandAction;

export type DashboardAccount = Readonly<{
  actions: readonly DashboardAccountAction[];
  email: string;
  name: string;
}>;

type DashboardLinkProps = Readonly<{
  "aria-current"?: "page";
  children: ReactNode;
  className?: string;
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}>;

export type DashboardShellProps = Readonly<{
  account: DashboardAccount;
  brand: string;
  children: ReactNode;
  currentPath: string;
  LinkComponent?: ComponentType<DashboardLinkProps>;
  navigation: readonly DashboardNavItem[];
}>;

function pathIsWithin(currentPath: string, href: string) {
  return href === "/"
    ? currentPath === "/"
    : currentPath === href || currentPath.startsWith(`${href}/`);
}

function NavigationList({
  currentPath,
  LinkComponent,
  navigation,
  onNavigate,
}: Readonly<{
  currentPath: string;
  LinkComponent: ComponentType<DashboardLinkProps>;
  navigation: readonly DashboardNavItem[];
  onNavigate?: () => void;
}>) {
  const disclosureId = useId();
  const [expandedItems, setExpandedItems] = useState<Readonly<Record<string, boolean>>>({});

  return (
    <ul className="ui-shell-nav__list">
      {navigation.map((item, itemIndex) => {
        const children = item.children ?? [];
        const active = pathIsWithin(currentPath, item.href);
        const exact = currentPath === item.href;
        const hasChildren = children.length > 0;
        const expanded = expandedItems[item.href] ?? active;
        const childrenId = `${disclosureId}-${itemIndex}-${item.href.replaceAll(
          /[^a-zA-Z0-9_-]/g,
          "-",
        )}`;

        return (
          <li key={item.href}>
            <div className="ui-shell-nav__row">
              {item.navigationOnly ? (
                <span
                  className={`ui-shell-nav__link ui-shell-nav__label${active ? " ui-shell-nav__link--active" : ""}`}
                >
                  {item.icon ? (
                    <span aria-hidden="true" className="ui-shell-nav__icon">
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                </span>
              ) : (
                <LinkComponent
                  aria-current={exact ? "page" : undefined}
                  className={`ui-shell-nav__link${active ? " ui-shell-nav__link--active" : ""}`}
                  href={item.href}
                  onClick={onNavigate}
                >
                  {item.icon ? (
                    <span aria-hidden="true" className="ui-shell-nav__icon">
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                </LinkComponent>
              )}
              {hasChildren ? (
                <button
                  aria-controls={childrenId}
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label} navigation`}
                  className="ui-shell-nav__disclosure"
                  onClick={() =>
                    setExpandedItems((items) => ({ ...items, [item.href]: !expanded }))
                  }
                  type="button"
                >
                  <span aria-hidden="true">›</span>
                </button>
              ) : null}
            </div>
            {hasChildren && expanded ? (
              <ul className="ui-shell-nav__list ui-shell-nav__list--nested" id={childrenId}>
                {children.map((child) => {
                  const childActive = pathIsWithin(currentPath, child.href);
                  return (
                    <li key={child.href}>
                      <LinkComponent
                        aria-current={currentPath === child.href ? "page" : undefined}
                        className={`ui-shell-nav__link ui-shell-nav__link--nested${
                          childActive ? " ui-shell-nav__link--active" : ""
                        }`}
                        href={child.href}
                        onClick={onNavigate}
                      >
                        {child.label}
                      </LinkComponent>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Sidebar({
  brand,
  currentPath,
  LinkComponent,
  navigation,
  onNavigate,
}: Readonly<{
  brand: string;
  currentPath: string;
  LinkComponent: ComponentType<DashboardLinkProps>;
  navigation: readonly DashboardNavItem[];
  onNavigate?: () => void;
}>) {
  return (
    <div className="ui-shell-sidebar__inner">
      <LinkComponent className="ui-shell-brand" href="/" onClick={onNavigate}>
        <span aria-hidden="true" className="ui-shell-brand__mark">
          M
        </span>
        <span>{brand}</span>
      </LinkComponent>
      <nav aria-label={`${brand} navigation`} className="ui-shell-nav">
        <NavigationList
          currentPath={currentPath}
          LinkComponent={LinkComponent}
          navigation={navigation}
          onNavigate={onNavigate}
        />
      </nav>
    </div>
  );
}

function findBreadcrumbs(navigation: readonly DashboardNavItem[], currentPath: string) {
  for (const item of navigation) {
    if (currentPath === item.href) return [item];
    const child = item.children?.find((candidate) => pathIsWithin(currentPath, candidate.href));
    if (child) return [item, child];
    if (pathIsWithin(currentPath, item.href)) return [item];
  }
  return [];
}

function Breadcrumbs({
  currentPath,
  LinkComponent,
  navigation,
}: Readonly<{
  currentPath: string;
  LinkComponent: ComponentType<DashboardLinkProps>;
  navigation: readonly DashboardNavItem[];
}>) {
  const matchedCrumbs = findBreadcrumbs(navigation, currentPath);
  const pageCrumb: DashboardNavItem = {
    href: currentPath,
    label: currentPath.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ?? "Page",
  };
  const crumbs =
    matchedCrumbs.at(-1)?.href === currentPath ? matchedCrumbs : [...matchedCrumbs, pageCrumb];
  if (currentPath === "/") return <span className="ui-shell-page-title">Dashboard</span>;

  return (
    <nav aria-label="Breadcrumb" className="ui-breadcrumbs">
      <ol>
        <li>
          <LinkComponent href="/">Home</LinkComponent>
        </li>
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          return (
            <li key={crumb.href}>
              <span aria-hidden="true">/</span>
              {current ? (
                <span aria-current="page">{crumb.label}</span>
              ) : crumb.navigationOnly ? (
                <span>{crumb.label}</span>
              ) : (
                <LinkComponent href={crumb.href}>{crumb.label}</LinkComponent>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function AccountMenu({
  account,
  LinkComponent,
}: Readonly<{ account: DashboardAccount; LinkComponent: ComponentType<DashboardLinkProps> }>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function dismiss(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function dismissWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        containerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    }

    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismissWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismissWithKeyboard);
    };
  }, [open]);

  return (
    <div className="ui-account" ref={containerRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        className="ui-account__trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span aria-hidden="true" className="ui-account__avatar">
          {account.name.charAt(0).toUpperCase()}
        </span>
        <span className="ui-account__identity">
          <strong>{account.name}</strong>
          <small>{account.email}</small>
        </span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="ui-account__menu" id={menuId}>
          {account.actions.map((action) => {
            if (action.href !== undefined) {
              return (
                <LinkComponent
                  className="ui-account__action"
                  href={action.href}
                  key={action.label}
                  onClick={() => setOpen(false)}
                >
                  {action.label}
                </LinkComponent>
              );
            }

            const onSelect = action.onSelect;
            return (
              <button
                className="ui-account__action"
                key={action.label}
                onClick={() => {
                  setOpen(false);
                  onSelect();
                }}
                type="button"
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AnchorLink({ children, ...props }: DashboardLinkProps) {
  return <a {...props}>{children}</a>;
}

export function DashboardShell({
  account,
  brand,
  children,
  currentPath,
  LinkComponent = AnchorLink,
  navigation,
}: DashboardShellProps) {
  const [drawerState, setDrawerState] = useState({ open: false, path: currentPath });
  const drawerOpen = drawerState.path === currentPath && drawerState.open;

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 75rem)");
    const closeDrawerOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawerState({ open: false, path: currentPath });
    };

    desktopQuery.addEventListener("change", closeDrawerOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeDrawerOnDesktop);
  }, [currentPath]);

  return (
    <div className="ui-shell">
      <a className="ui-skip-link" href="#dashboard-content">
        Skip to content
      </a>
      <aside className="ui-shell-sidebar">
        <Sidebar
          brand={brand}
          currentPath={currentPath}
          LinkComponent={LinkComponent}
          navigation={navigation}
        />
      </aside>
      <div className="ui-shell-main">
        <header className="ui-shell-header">
          <Button
            aria-label="Open navigation"
            className="ui-shell-menu-button"
            onClick={() => setDrawerState({ open: true, path: currentPath })}
            size="sm"
            variant="secondary"
          >
            <span aria-hidden="true">☰</span>
          </Button>
          <Breadcrumbs
            currentPath={currentPath}
            LinkComponent={LinkComponent}
            navigation={navigation}
          />
          <AccountMenu account={account} LinkComponent={LinkComponent} />
        </header>
        <main className="ui-shell-content" id="dashboard-content" tabIndex={-1}>
          {children}
        </main>
      </div>
      <Dialog
        onClose={() => setDrawerState({ open: false, path: currentPath })}
        open={drawerOpen}
        title="Navigation"
        variant="drawer"
      >
        <Sidebar
          brand={brand}
          currentPath={currentPath}
          LinkComponent={LinkComponent}
          navigation={navigation}
          onNavigate={() => setDrawerState({ open: false, path: currentPath })}
        />
      </Dialog>
    </div>
  );
}
