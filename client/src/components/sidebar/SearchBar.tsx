import React from 'react';
import { useChatStore } from '../../stores/chatStore';
import { Search, X, Heart } from 'lucide-react';

export const SearchBar: React.FC = () => {
  const { searchQuery, setSearchQuery, filter, setFilter } = useChatStore();

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread 💖' },
    { id: 'groups', label: 'Groups 🧸' },
    { id: 'whatsapp', label: 'WhatsApp 🟢' },
  ];

  return (
    <div className="px-4 py-3 bg-white/70 backdrop-blur-md border-b border-pink-100/80 space-y-2.5">
      {/* Search Input Pill */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-pink-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search chats, sweet messages..."
          className="w-full pl-10 pr-9 py-2 bg-[#FFF0F5] text-xs font-medium text-slate-800 placeholder-pink-300 rounded-full border border-pink-200/80 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 text-pink-400 hover:text-pink-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white shadow-md shadow-pink-400/20'
                  : 'bg-pink-50/80 text-pink-500 hover:bg-pink-100/80'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
