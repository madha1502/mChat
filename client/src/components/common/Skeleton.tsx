import React from 'react';

export const SkeletonConversation: React.FC = () => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-pink-50/50 animate-pulse mx-2">
      <div className="w-11 h-11 rounded-full bg-pink-200/60 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <div className="h-3.5 bg-pink-200/60 rounded-full w-28" />
          <div className="h-2.5 bg-pink-200/40 rounded-full w-10" />
        </div>
        <div className="h-2.5 bg-pink-100 rounded-full w-40" />
      </div>
    </div>
  );
};

export const SkeletonMessage: React.FC<{ isSelf?: boolean }> = ({ isSelf }) => {
  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} animate-pulse my-2`}>
      <div
        className={`h-10 w-48 rounded-[20px] ${
          isSelf ? 'bg-pink-300/40 rounded-br-sm' : 'bg-white/80 border border-pink-100 rounded-bl-sm'
        }`}
      />
    </div>
  );
};

export const ChatListSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-1 p-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonConversation key={i} />
      ))}
    </div>
  );
};

export const MessagesSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-3 p-6 flex-1 justify-end">
      {[false, true, false, true, false].map((self, idx) => (
        <SkeletonMessage key={idx} isSelf={self} />
      ))}
    </div>
  );
};
