import React from 'react';

export const TaskRowSkeleton: React.FC = () => {
  return (
    <tr className="animate-pulse border-b border-stone-100">
      <td className="py-3.5 px-4"><div className="h-4 w-16 bg-stone-200 rounded"></div></td>
      <td className="py-3.5 px-4"><div className="h-4 w-48 bg-stone-200 rounded"></div></td>
      <td className="py-3.5 px-4"><div className="h-4 w-28 bg-stone-200 rounded"></div></td>
      <td className="py-3.5 px-4"><div className="h-5 w-20 bg-stone-200 rounded-full"></div></td>
      <td className="py-3.5 px-4"><div className="h-5 w-24 bg-stone-200 rounded-full"></div></td>
      <td className="py-3.5 px-4"><div className="h-4 w-20 bg-stone-200 rounded"></div></td>
      <td className="py-3.5 px-4 text-right"><div className="h-6 w-16 bg-stone-200 rounded ml-auto"></div></td>
    </tr>
  );
};

export const MetricsCardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse bg-white border border-[#E8E2D5] rounded-xl p-5 space-y-3">
      <div className="flex justify-between items-center">
        <div className="h-3 w-24 bg-stone-200 rounded"></div>
        <div className="h-5 w-5 bg-stone-200 rounded-full"></div>
      </div>
      <div className="h-8 w-16 bg-stone-200 rounded"></div>
      <div className="h-3 w-32 bg-stone-200 rounded"></div>
    </div>
  );
};

export const DiffSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse p-6 bg-[#FDFBF7] border border-[#E8E2D5] rounded-xl space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-4 w-36 bg-stone-200 rounded"></div>
        <div className="h-6 w-24 bg-stone-200 rounded-lg"></div>
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-10 w-full bg-stone-200/70 rounded-lg"></div>
        <div className="h-10 w-full bg-stone-200/70 rounded-lg"></div>
        <div className="h-10 w-full bg-stone-200/70 rounded-lg"></div>
      </div>
    </div>
  );
};
