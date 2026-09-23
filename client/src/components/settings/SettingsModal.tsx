import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useAuthStore } from '../../stores/authStore';
import { useWhatsAppStore } from '../../stores/whatsappStore';
import { useThemeStore, ThemeType } from '../../stores/themeStore';
import { api } from '../../services/api';
import {
  User,
  Shield,
  MessageSquare,
  Ban,
  LogOut,
  Camera,
  Palette,
  Check,
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { IPrivacySettings } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, updatePrivacy, unblockUser, logout } = useAuthStore();
  const { integration, openConnect } = useWhatsAppStore();
  const { theme, setTheme } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'theme' | 'privacy' | 'linked' | 'blocked'>('profile');

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [about, setAbout] = useState(user?.about || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Privacy State
  const [privacy, setPrivacy] = useState<IPrivacySettings>(user?.privacySettings || {});

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const themeCards: { id: ThemeType; title: string; desc: string; previewClass: string }[] = [
    {
      id: 'pastel',
      title: 'Sweet Pastel',
      desc: 'Pink & rose glass with floating animated hearts',
      previewClass: 'bg-gradient-to-r from-pink-400 to-rose-300 text-white',
    },
    {
      id: 'dark',
      title: 'Midnight Dark',
      desc: 'Deep indigo & slate dark mode with neon accents',
      previewClass: 'bg-gradient-to-r from-indigo-900 to-slate-900 text-indigo-200 border border-indigo-700',
    },
    {
      id: 'cyberpunk',
      title: 'Cyberpunk Neon',
      desc: 'Vibrant dual-tone magenta & violet futuristic vibes',
      previewClass: 'bg-gradient-to-r from-fuchsia-600 to-purple-800 text-white',
    },
    {
      id: 'emerald',
      title: 'Emerald Forest',
      desc: 'Calming dark teal & emerald green glass',
      previewClass: 'bg-gradient-to-r from-emerald-700 to-teal-900 text-emerald-100',
    },
  ];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setProfilePicture(res.data.data.url);
      }
    } catch (e) {
      alert('Failed to upload avatar');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      await updateProfile({ name, username, about, profilePicture });
      alert('Profile updated successfully! ✨');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePrivacyChange = async (key: keyof IPrivacySettings, value: any) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    try {
      await updatePrivacy(updated);
    } catch (e) {
      alert('Failed to update privacy');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Application Settings" maxWidth="lg">
      <div className="flex flex-col md:flex-row gap-6 min-h-[380px] text-slate-800 dark:text-slate-100">
        {/* Settings Navigation Sidebar */}
        <div className="w-full md:w-48 space-y-1 border-b md:border-b-0 md:border-r border-pink-100 dark:border-slate-800 pb-3 md:pb-0 pr-0 md:pr-4 text-xs font-bold">
          {[
            { id: 'profile', label: 'My Profile', icon: User },
            { id: 'theme', label: 'Appearance & Theme', icon: Palette },
            { id: 'privacy', label: 'Privacy & Security', icon: Shield },
            { id: 'linked', label: 'Linked Accounts', icon: MessageSquare },
            { id: 'blocked', label: 'Blocked Contacts', icon: Ban },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-left transition-all ${
                  isActive
                    ? '[background:var(--header-bg)] text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}

          <div className="pt-4 border-t border-pink-100 dark:border-slate-800">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl transition-colors font-bold"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Settings Tab Content */}
        <div className="flex-1 space-y-4 overflow-y-auto max-h-[420px] pr-1">
          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-18 h-18 rounded-full overflow-hidden bg-pink-50 dark:bg-slate-800 border-2 border-pink-200 dark:border-slate-700 hover:border-pink-500 cursor-pointer group shrink-0 shadow-sm"
                >
                  <Avatar src={profilePicture} name={name} size="lg" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{user?.name}</h4>
                  <p className="text-xs text-pink-500 dark:text-pink-400 font-semibold">{user?.email}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-pink-50/60 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 rounded-xl border border-pink-200 dark:border-slate-700 focus:outline-none focus:border-pink-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-pink-50/60 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 rounded-xl border border-pink-200 dark:border-slate-700 focus:outline-none focus:border-pink-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">About / Bio</label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-pink-50/60 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 rounded-xl border border-pink-200 dark:border-slate-700 focus:outline-none focus:border-pink-400 resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 [background:var(--header-bg)] text-white text-xs font-bold rounded-full hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-md"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile ✨'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Appearance & Theme */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Choose Visual Theme</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a custom theme to transform mChat's appearance, gradients, bubbles, and background animations.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {themeCards.map((card) => {
                  const isSelected = theme === card.id;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setTheme(card.id)}
                      className={`p-4 rounded-2xl cursor-pointer border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-pink-500 dark:border-pink-400 ring-2 ring-pink-400/30 scale-[1.02] shadow-lg'
                          : 'border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black ${card.previewClass}`}>
                          {card.title}
                        </div>
                        {isSelected && (
                          <span className="p-1 rounded-full bg-pink-500 text-white">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Privacy */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-100">Who can see my personal info</h4>

              <div className="space-y-3">
                {[
                  { key: 'lastSeen', label: 'Last seen & online presence' },
                  { key: 'profilePicture', label: 'Profile photo' },
                  { key: 'about', label: 'About description' },
                  { key: 'status', label: 'Status / Stories' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-pink-50/60 dark:bg-slate-800/60 rounded-2xl border border-pink-200/80 dark:border-slate-700">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.label}</span>
                    <select
                      value={(privacy as any)[item.key] || 'everyone'}
                      onChange={(e) => handlePrivacyChange(item.key as any, e.target.value)}
                      className="bg-white dark:bg-slate-700 border border-pink-200 dark:border-slate-600 rounded-xl px-3 py-1 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none shadow-sm"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="contacts">My Contacts</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-pink-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between p-3 bg-pink-50/60 dark:bg-slate-800/60 rounded-2xl border border-pink-200/80 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">Read Receipts (Blue Ticks)</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">If turned off, you won't send or receive read receipts.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacy.readReceipts !== false}
                    onChange={(e) => handlePrivacyChange('readReceipts', e.target.checked)}
                    className="w-4 h-4 rounded text-pink-500 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-pink-50/60 dark:bg-slate-800/60 rounded-2xl border border-pink-200/80 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">Typing Indicators</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Show typing indicator in chats when composing.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacy.typingIndicator !== false}
                    onChange={(e) => handlePrivacyChange('typingIndicator', e.target.checked)}
                    className="w-4 h-4 rounded text-pink-500 focus:ring-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Linked Accounts */}
          {activeTab === 'linked' && (
            <div className="space-y-4">
              {/* Google Account */}
              <div className="p-4 rounded-2xl bg-pink-50/60 dark:bg-slate-800/60 border border-pink-200/80 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-pink-500 dark:text-pink-400 shadow-sm border border-pink-100 dark:border-slate-600 text-base">
                    G
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Google / Gmail Identity</h4>
                    <p className="text-[11px] text-pink-500 dark:text-pink-400 font-semibold">{user?.email}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Connected
                </span>
              </div>

              {/* WhatsApp Business Account */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100">WhatsApp Business API</h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                      {integration?.status === 'active'
                        ? `Linked Phone: ${integration.displayPhoneNumber}`
                        : 'Linked via your Gmail Account'}
                    </p>
                  </div>
                </div>

                {integration?.status === 'active' ? (
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200">
                      Active
                    </span>
                    <button
                      onClick={openConnect}
                      className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 text-xs rounded-full font-bold shadow-sm border border-emerald-200 dark:border-slate-600 transition-colors"
                    >
                      Manage
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={openConnect}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-md shadow-emerald-500/20 hover:scale-105 transition-all"
                  >
                    Connect 🟢
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Blocked Users */}
          {activeTab === 'blocked' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Blocked Contacts</h4>
              {(!user?.blockedUsers || user.blockedUsers.length === 0) && (
                <p className="text-xs text-slate-400 py-6 text-center">No blocked contacts.</p>
              )}

              {user?.blockedUsers?.map((blockedId: any) => (
                <div
                  key={typeof blockedId === 'string' ? blockedId : blockedId._id}
                  className="flex items-center justify-between p-3 bg-pink-50/60 dark:bg-slate-800/60 rounded-2xl border border-pink-200/80 dark:border-slate-700"
                >
                  <span className="text-xs text-slate-700 dark:text-slate-200 font-bold">
                    {typeof blockedId === 'object' ? blockedId.name : blockedId}
                  </span>
                  <button
                    onClick={() => unblockUser(typeof blockedId === 'string' ? blockedId : blockedId._id)}
                    className="px-3 py-1 text-xs font-bold text-pink-500 bg-pink-100 dark:bg-slate-700 hover:bg-pink-200 dark:hover:bg-slate-600 rounded-full transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
