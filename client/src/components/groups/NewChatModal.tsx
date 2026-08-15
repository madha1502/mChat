import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useChatStore } from '../../stores/chatStore';
import { api } from '../../services/api';
import { Search, UserPlus, MessageSquare } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { IUser } from '../../types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { setActiveConversation, fetchConversations } = useChatStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (val.trim().length >= 2) {
      try {
        setIsSearching(true);
        const res = await api.get(`/users/search?q=${encodeURIComponent(val)}`);
        if (res.data.success) {
          setResults(res.data.data);
        }
      } catch (err) {
        console.error('[Search users error]', err);
      } finally {
        setIsSearching(false);
      }
    } else {
      setResults([]);
    }
  };

  const handleStartChat = async (recipientId: string) => {
    try {
      setIsCreating(true);
      const res = await api.post('/conversations', {
        type: 'private',
        recipientId,
      });

      if (res.data.success) {
        await fetchConversations();
        await setActiveConversation(res.data.data);
        onClose();
        setQuery('');
        setResults([]);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start conversation');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Direct Message">
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search by Gmail address, username, or name..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 text-sm text-slate-100 placeholder-slate-500 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
            autoFocus
          />
        </div>

        {/* Results list */}
        <div className="max-h-72 overflow-y-auto space-y-1 divide-y divide-slate-800/40">
          {isSearching && (
            <p className="text-center py-6 text-xs text-slate-400">Searching contacts...</p>
          )}

          {!isSearching && query.length >= 2 && results.length === 0 && (
            <p className="text-center py-6 text-xs text-slate-500">
              No user found matching "{query}".
            </p>
          )}

          {results.map((user) => (
            <div
              key={user._id}
              onClick={() => handleStartChat(user._id)}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={user.profilePicture}
                  name={user.name}
                  size="md"
                  isOnline={user.isOnline}
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{user.name}</h4>
                  <p className="text-xs text-slate-400">@{user.username} • {user.email}</p>
                </div>
              </div>

              <button
                disabled={isCreating}
                className="p-2 rounded-xl bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
