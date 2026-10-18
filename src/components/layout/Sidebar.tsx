import React from 'react';
import { Users, Smile, Clapperboard, Video, Crosshair } from 'lucide-react';

export type ActiveTab = 'characters' | 'mouths' | 'lipsync' | 'alignment' | 'export';

export interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  characterCount: number;
  mouthCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  characterCount,
  mouthCount,
}) => {
  const tabs = [
    {
      id: 'characters' as ActiveTab,
      label: '1. Character Library',
      description: 'Avatars & placement',
      icon: <Users className="w-5 h-5" />,
      badge: characterCount > 0 ? characterCount : undefined,
    },
    {
      id: 'mouths' as ActiveTab,
      label: '2. Mouth Importer',
      description: 'Sprite sheets & charts',
      icon: <Smile className="w-5 h-5" />,
      badge: mouthCount > 0 ? mouthCount : undefined,
    },
    {
      id: 'alignment' as ActiveTab,
      label: '3. Mouth Alignment',
      description: 'Anchor debugger & overlay',
      icon: <Crosshair className="w-5 h-5" />,
      badge: mouthCount > 0 ? 'Diagnostic' : undefined,
    },
    {
      id: 'lipsync' as ActiveTab,
      label: '4. Lip-Sync Editor',
      description: 'Script, audio & timeline',
      icon: <Clapperboard className="w-5 h-5" />,
    },
    {
      id: 'export' as ActiveTab,
      label: '5. Video Export',
      description: 'MP4 & WebM with alpha',
      icon: <Video className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="w-56 md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 p-3 md:p-4 space-y-2 overflow-y-auto select-none">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
        Workflow
      </div>

      <nav className="space-y-1.5 flex-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                isActive
                  ? 'bg-indigo-50/80 text-indigo-900 border border-indigo-200/80 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.icon}
                </div>
                <div>
                  <div className="text-xs font-bold">{tab.label}</div>
                  <div className="text-[11px] text-slate-400 font-normal">{tab.description}</div>
                </div>
              </div>

              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Local-only badge */}
      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] leading-relaxed">
        <strong className="block font-bold">100% Local Processing</strong>
        All assets, audio, and videos stay strictly inside your browser. No cloud upload.
      </div>
    </aside>
  );
};
