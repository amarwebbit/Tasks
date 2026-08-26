import React from 'react';

export const TaskTableSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-[#E8E2D5] rounded-xl overflow-hidden shadow-2xs animate-pulse">
      <div className="p-4 border-b border-stone-100 flex items-center justify-between">
        <div className="h-4 w-32 bg-stone-200 rounded" />
        <div className="h-4 w-20 bg-stone-200 rounded" />
      </div>
      <div className="divide-y divide-stone-100 p-2 space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-16 bg-stone-200 rounded" />
              <div className="h-4 w-48 bg-stone-200 rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-20 bg-stone-200 rounded" />
              <div className="h-5 w-16 bg-stone-200 rounded-full" />
              <div className="h-4 w-12 bg-stone-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const KanbanBoardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map(col => (
        <div key={col} className="bg-[#F4EFE6]/60 border border-[#E8E2D5] rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <div className="h-4 w-24 bg-stone-200 rounded" />
            <div className="h-4 w-6 bg-stone-200 rounded-full" />
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3].map(item => (
              <div key={item} className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-12 bg-stone-200 rounded" />
                  <div className="h-3 w-14 bg-stone-200 rounded-full" />
                </div>
                <div className="h-4 w-full bg-stone-200 rounded" />
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <div className="h-3 w-20 bg-stone-200 rounded" />
                  <div className="w-5 h-5 rounded-full bg-stone-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="p-8 space-y-8 max-w-7xl w-full mx-auto animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs space-y-2">
            <div className="h-3 w-16 bg-stone-200 rounded" />
            <div className="h-6 w-12 bg-stone-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-[#E8E2D5] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="h-5 w-32 bg-stone-200 rounded" />
            <div className="h-3 w-full bg-stone-200 rounded" />
            <div className="h-2 w-full bg-stone-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};
