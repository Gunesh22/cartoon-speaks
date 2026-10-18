import React from 'react';
import { TopBar, TopBarProps } from './TopBar';
import { Sidebar, SidebarProps } from './Sidebar';

export interface AppShellProps {
  topBarProps: TopBarProps;
  sidebarProps: SidebarProps;
  isFullHeightLayout?: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  topBarProps,
  sidebarProps,
  isFullHeightLayout = false,
  children,
}) => {
  return (
    <div className="flex flex-col h-screen h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <TopBar {...topBarProps} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar {...sidebarProps} />

        <main
          className={`flex-1 min-h-0 bg-slate-50 flex flex-col ${
            isFullHeightLayout
              ? 'overflow-hidden p-2 sm:p-2.5 h-full'
              : 'overflow-y-auto p-4 sm:p-6'
          }`}
        >
          <div
            className={`w-full min-w-0 flex flex-col ${
              isFullHeightLayout ? 'h-full min-h-0 overflow-hidden' : 'max-w-7xl mx-auto pb-10'
            }`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
