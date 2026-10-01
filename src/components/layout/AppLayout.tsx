"use client";

import React, { ReactNode } from "react";
import { SidebarProvider } from "@/context/SidebarContext";
import { Header } from "@/components/common/Header";
import { Sidebar } from "@/components/common/Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
        <Header />
        <div className="flex flex-1 w-full relative">
          <Sidebar />
          <div className="flex-1 w-full min-w-0">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
