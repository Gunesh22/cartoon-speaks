import React from 'react';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  sublabel?: string;
  color?: 'indigo' | 'green' | 'amber';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  sublabel,
  color = 'indigo',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  const colorClasses = {
    indigo: 'bg-indigo-600',
    green: 'bg-emerald-600',
    amber: 'bg-amber-500',
  }[color];

  return (
    <div className="w-full">
      {(label || sublabel) && (
        <div className="flex justify-between items-center text-xs mb-1.5 font-medium text-slate-700">
          <span>{label}</span>
          <span className="text-slate-500">{sublabel || `${clamped}%`}</span>
        </div>
      )}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
        <div
          className={`h-full ${colorClasses} transition-all duration-200 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
