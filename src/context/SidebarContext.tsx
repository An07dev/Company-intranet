"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SidebarContextType {
  isOpen: boolean; // Dành cho Drawer trên Mobile
  isCollapsed: boolean; // Dành cho thu gọn/mở rộng trên Desktop
  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleCollapse: () => void;
  setIsCollapsed: (val: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Mobile drawer: mặc định đóng
  const [isOpen, setIsOpen] = useState(false);
  // Desktop collapse: mặc định mở rộng
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Tự động đóng mobile drawer khi resize lên màn hình lớn
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const closeSidebar = () => setIsOpen(false);
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isCollapsed,
        toggleSidebar,
        closeSidebar,
        toggleCollapse,
        setIsCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
