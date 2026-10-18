import React, { useRef } from 'react';
import { Project } from '../../types/project';
import { Button } from '../common/Button';
import { Video, HardDrive, Download, UploadCloud } from 'lucide-react';
import { useIndexedDBStorage } from '../../hooks/useIndexedDB';

export interface TopBarProps {
  project: Project | null;
  onUpdateProjectName: (newName: string) => void;
  onOpenExportDialog: () => void;
  onExportProjectBackup: () => void;
  onImportProjectBackup: (fileContent: string) => void;
  canExportVideo: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  onUpdateProjectName,
  onOpenExportDialog,
  onExportProjectBackup,
  onImportProjectBackup,
  canExportVideo,
}) => {
  const { storageInfo } = useIndexedDBStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) onImportProjectBackup(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-30">
      {/* Brand & Project Name */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
            CS
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-base hidden sm:inline">
            Cartoon Speaks
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {project && (
          <input
            type="text"
            value={project.name}
            onChange={(e) => onUpdateProjectName(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded-md px-2 py-1 transition-all outline-none"
            placeholder="Project Name..."
          />
        )}
      </div>

      {/* Right Tools & Export Button */}
      <div className="flex items-center gap-3">
        {/* Storage indicator */}
        {storageInfo && (
          <div
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200"
            title={`IndexedDB Storage: ${storageInfo.usageFormatted} used of ${storageInfo.quotaFormatted}`}
          >
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>{storageInfo.usageFormatted} local</span>
          </div>
        )}

        {/* Backup export/import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleBackupUpload}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Restore project from backup file"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs flex items-center gap-1"
        >
          <UploadCloud className="w-4 h-4" />
          <span className="hidden lg:inline">Restore</span>
        </button>

        <button
          onClick={onExportProjectBackup}
          title="Backup full project to file"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          <span className="hidden lg:inline">Backup</span>
        </button>

        {/* Video Export Button */}
        <Button
          variant="primary"
          size="sm"
          disabled={!canExportVideo}
          onClick={onOpenExportDialog}
          icon={<Video className="w-4 h-4" />}
        >
          Export Video
        </Button>
      </div>
    </header>
  );
};
