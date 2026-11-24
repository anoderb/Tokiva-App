"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomNav } from "./bottom-nav";
import { cn } from "@/lib/cn";

interface OwnerShellContextValue {
  setMeta: (title: string, desc?: string) => void;
  actionsSlot: HTMLDivElement | null;
}

const OwnerShellContext = createContext<OwnerShellContextValue | null>(null);

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [meta, setMetaState] = useState<{ title: string; desc?: string }>({
    title: "Panel Toko",
    desc: undefined,
  });
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);

  const setMeta = useMemo(
    () => (title: string, desc?: string) => {
      setMetaState((prev) =>
        prev.title === title && prev.desc === desc ? prev : { title, desc }
      );
    },
    []
  );

  const contextVal = useMemo(
    () => ({ setMeta, actionsSlot }),
    [setMeta, actionsSlot]
  );

  return (
    <OwnerShellContext.Provider value={contextVal}>
      <div className="flex min-h-screen bg-bg text-fg">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <main
          className={cn(
            "flex-1 min-w-0 overflow-x-hidden transition-all duration-300",
            collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]",
            "ml-0"
          )}
        >
          <Topbar
            title={meta.title}
            desc={meta.desc}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
            onMobileOpen={() => setMobileOpen(true)}
          >
            <div ref={setActionsSlot} className="contents" />
          </Topbar>
          <div className="p-5 max-lg:p-3 max-lg:pb-[130px]">{children}</div>
        </main>
        <BottomNav />
      </div>
    </OwnerShellContext.Provider>
  );
}

export function OwnerLayout({
  title,
  desc,
  actions,
  children,
}: {
  title: string;
  desc?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const shell = useContext(OwnerShellContext);

  useEffect(() => {
    if (shell) {
      shell.setMeta(title, desc);
    }
  }, [shell, title, desc]);

  // Jika sudah berada di dalam Persistent OwnerShell (/owner/*), cukup render children
  if (shell) {
    return (
      <>
        {actions && shell.actionsSlot ? createPortal(actions, shell.actionsSlot) : null}
        {children}
      </>
    );
  }

  // Fallback jika dipanggil di luar rute /owner/*
  return (
    <OwnerShell>
      <OwnerLayoutInner title={title} desc={desc} actions={actions}>
        {children}
      </OwnerLayoutInner>
    </OwnerShell>
  );
}

function OwnerLayoutInner({
  title,
  desc,
  actions,
  children,
}: {
  title: string;
  desc?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const shell = useContext(OwnerShellContext);
  useEffect(() => {
    shell?.setMeta(title, desc);
  }, [shell, title, desc]);

  return (
    <>
      {actions && shell?.actionsSlot ? createPortal(actions, shell.actionsSlot) : null}
      {children}
    </>
  );
}
