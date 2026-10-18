import React from 'react';

export interface WorkspaceLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomPanel?: React.ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  leftPanel,
  rightPanel,
  bottomPanel,
}) => {
  return (
    <div className="flex flex-col w-full h-full min-h-0 gap-2 overflow-hidden">
      {/* Top 2-Column Section: Left (Preview) & Right (Audio & Script) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 w-full flex-1 min-h-0 items-stretch overflow-hidden">
        {/* Left Column: Character Preview & Framing */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 h-full w-full overflow-hidden">
          {leftPanel}
        </div>

        {/* Right Column: Audio & Script Controls */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-0 h-full w-full overflow-hidden">
          {rightPanel}
        </div>
      </div>

      {/* Bottom Section: Timeline (Dedicated full-width row, completely visible) */}
      {bottomPanel && (
        <div className="w-full min-w-0 shrink-0">
          {bottomPanel}
        </div>
      )}
    </div>
  );
};
