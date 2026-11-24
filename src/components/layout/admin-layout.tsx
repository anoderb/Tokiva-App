"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import { cn } from "@/lib/cn";

interface AdminShellContextValue {
  setMeta: (title: string, desc?: string, breadcrumb?: string) => void;
  actionsSlot: HTMLDivElement | null;
}

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [meta, setMetaState] = useState<{
    title: string;
    desc?: string;
    breadcrumb?: string;
  }>({
    title: "Panel Admin",
    desc: undefined,
    breadcrumb: "Panel Admin",
  });
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);

  const setMeta = useMemo(
    () => (title: string, desc?: string, breadcrumb?: string) => {
      setMetaState((prev) =>
        prev.title === title && prev.desc === desc && prev.breadcrumb === breadcrumb
          ? prev
          : { title, desc, breadcrumb }
      );
    },
    []
  );

  const contextVal = useMemo(
    () => ({ setMeta, actionsSlot }),
    [setMeta, actionsSlot]
  );

  return (
    <AdminShellContext.Provider value={contextVal}>
      <div className="flex min-h-screen bg-bg">
        <AdminSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <main
          className={cn(
            "flex-1 transition-all duration-300 min-w-0",
            collapsed ? "lg:ml-[72px]" : "lg:ml-[240px]",
            "ml-0"
          )}
        >
          <AdminTopbar
            title={meta.title}
            desc={meta.desc}
            breadcrumb={meta.breadcrumb}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
            onMobileOpen={() => setMobileOpen(true)}
          >
            <div ref={setActionsSlot} className="contents" />
          </AdminTopbar>
          <div className="p-3 sm:p-5 pb-16">{children}</div>
        </main>
      </div>
    </AdminShellContext.Provider>
  );
}

export function AdminLayout({
  title,
  desc,
  breadcrumb,
  actions,
  children,
}: {
  title: string;
  desc?: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const shell = useContext(AdminShellContext);

  useEffect(() => {
    if (shell) {
      shell.setMeta(title, desc, breadcrumb);
    }
  }, [shell, title, desc, breadcrumb]);

  if (shell) {
    return (
      <>
        {actions && shell.actionsSlot ? createPortal(actions, shell.actionsSlot) : null}
        {children}
      </>
    );
  }

  return (
    <AdminShell>
      <AdminLayoutInner title={title} desc={desc} breadcrumb={breadcrumb} actions={actions}>
        {children}
      </AdminLayoutInner>
    </AdminShell>
  );
}

function AdminLayoutInner({
  title,
  desc,
  breadcrumb,
  actions,
  children,
}: {
  title: string;
  desc?: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const shell = useContext(AdminShellContext);
  useEffect(() => {
    shell?.setMeta(title, desc, breadcrumb);
  }, [shell, title, desc, breadcrumb]);

  return (
    <>
      {actions && shell?.actionsSlot ? createPortal(actions, shell.actionsSlot) : null}
      {children}
    </>
  );
}
