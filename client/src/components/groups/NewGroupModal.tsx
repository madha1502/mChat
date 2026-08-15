import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useChatStore } from '../../stores/chatStore';
import { api } from '../../services/api';
import { Users, Search, Check, X, Camera } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { IUser } from '../../types';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({ isOpen, onClose }) => {
  const { fetchConversations, setActiveConversation } = useChatStore();

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<IUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (val.trim().length >= 2) {
      try {
        setIsSearching(true);
        const res = await api.get(`/users/search?q=${encodeURIComponent(val)}`);
        if (res.data.success) {
          setSearchResults(res.data.data);
        }
      } catch (e) {
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const toggleSelectUser = (user: IUser) => {
    if (selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setImage(res.data.data.url);
      }
    } catch (e) {
      alert('Failed to upload group image');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      setIsCreating(true);
      const res = await api.post('/conversations', {
        type: 'group',
        groupName,
        groupDescription: description,
        groupImage: image,
        participants: selectedUsers.map((u) => u._id),
      });

      if (res.data.success) {
        await fetchConversations();
        await setActiveConversation(res.data.data);
        onClose();
        setGroupName('');
        setDescription('');
        setSelectedUsers([]);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Group Chat" maxWidth="lg">
      <form onSubmit={handleCreateGroup} className="space-y-4">
        {/* Group Avatar & Name Header */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-16 h-16 rounded-full bg-slate-800 border-2 border-dashed border-slate-700 hover:border-sky-500 flex items-center justify-center cursor-pointer overflow-hidden group shrink-0"
          >
            {image ? (
              <img src={image} alt="Group" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-6 h-6 text-slate-400 group-hover:text-sky-400" />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group Subject / Name..."
              className="w-full px-3 py-2 bg-slate-950 text-sm text-slate-100 placeholder-slate-500 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
              required
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Group Description (optional)..."
              className="w-full px-3 py-1.5 bg-slate-950 text-xs text-slate-300 placeholder-slate-500 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Selected Members Chips */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
            {selectedUsers.map((u) => (
              <span
                key={u._id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs"
              >
                <span>{u.name}</span>
                <button
                  type="button"
                  onClick={() => toggleSelectUser(u)}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search Members */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400">Add Members</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={handleSearch}
              placeholder="Search contacts to add..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Search Results list */}
        <div className="max-h-48 overflow-y-auto space-y-1">
          {searchResults.map((user) => {
            const isSelected = selectedUsers.some((u) => u._id === user._id);
            return (
              <div
                key={user._id}
                onClick={() => toggleSelectUser(user)}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                  isSelected ? 'bg-sky-500/10 border border-sky-500/30' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar src={user.profilePicture} name={user.name} size="sm" />
                  <div>
                    <p className="text-xs font-bold text-slate-200">{user.name}</p>
                    <p className="text-[10px] text-slate-400">@{user.username}</p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                    isSelected ? 'bg-sky-500 border-sky-400 text-white' : 'border-slate-700'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating || !groupName.trim()}
            className="px-5 py-2 bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 hover:bg-sky-400 disabled:opacity-50 transition-all"
          >
            {isCreating ? 'Creating Group...' : 'Create Group'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
