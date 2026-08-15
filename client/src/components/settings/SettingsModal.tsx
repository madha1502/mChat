import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useAuthStore } from '../../stores/authStore';
import { useWhatsAppStore } from '../../stores/whatsappStore';
import { api } from '../../services/api';
import {
  User,
  Shield,
  MessageSquare,
  Ban,
  LogOut,
  Camera,
  Check,
  Globe,
  Lock,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { IPrivacySettings } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, updatePrivacy, unblockUser, logout } = useAuthStore();
  const { integration, openConnect, disconnectAccount } = useWhatsAppStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'linked' | 'blocked'>('profile');

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [about, setAbout] = useState(user?.about || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Privacy State
  const [privacy, setPrivacy] = useState<IPrivacySettings>(user?.privacySettings || {});

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      <div className="flex flex-col md:flex-row gap-6 min-h-[380px] text-slate-800">
        {/* Settings Navigation Sidebar */}
        <div className="w-full md:w-48 space-y-1 border-b md:border-b-0 md:border-r border-pink-100 pb-3 md:pb-0 pr-0 md:pr-4 text-xs font-bold">
          {[
            { id: 'profile', label: 'My Profile', icon: User },
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
                    ? 'bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white shadow-md shadow-pink-500/20'
                    : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}

          <div className="pt-4 border-t border-pink-100">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors font-bold"
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
                  className="relative w-18 h-18 rounded-full overflow-hidden bg-pink-50 border-2 border-pink-200 hover:border-pink-500 cursor-pointer group shrink-0 shadow-sm"
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
                  <h4 className="text-sm font-bold text-slate-800">{user?.name}</h4>
                  <p className="text-xs text-pink-400 font-semibold">{user?.email}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">About / Bio</label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400 resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white text-xs font-bold rounded-full hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-pink-500/20"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile ✨'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Privacy */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-slate-800">Who can see my personal info</h4>

              <div className="space-y-3">
                {[
                  { key: 'lastSeen', label: 'Last seen & online presence' },
                  { key: 'profilePicture', label: 'Profile photo' },
                  { key: 'about', label: 'About description' },
                  { key: 'status', label: 'Status / Stories' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-pink-50/60 rounded-2xl border border-pink-200/80">
                    <span className="text-slate-700 font-semibold">{item.label}</span>
                    <select
                      value={(privacy as any)[item.key] || 'everyone'}
                      onChange={(e) => handlePrivacyChange(item.key as any, e.target.value)}
                      className="bg-white border border-pink-200 rounded-xl px-3 py-1 text-slate-700 text-xs font-semibold focus:outline-none shadow-sm"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="contacts">My Contacts</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-pink-100 space-y-3">
                <div className="flex items-center justify-between p-3 bg-pink-50/60 rounded-2xl border border-pink-200/80">
                  <div>
                    <p className="font-bold text-slate-800">Read Receipts (Blue Ticks)</p>
                    <p className="text-[10px] text-slate-500">If turned off, you won't send or receive read receipts.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacy.readReceipts !== false}
                    onChange={(e) => handlePrivacyChange('readReceipts', e.target.checked)}
                    className="w-4 h-4 rounded text-pink-500 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-pink-50/60 rounded-2xl border border-pink-200/80">
                  <div>
                    <p className="font-bold text-slate-800">Typing Indicators</p>
                    <p className="text-[10px] text-slate-500">Show typing indicator in chats when composing.</p>
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

          {/* TAB 3: Linked Accounts */}
          {activeTab === 'linked' && (
            <div className="space-y-4">
              {/* Google Account */}
              <div className="p-4 rounded-2xl bg-pink-50/60 border border-pink-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center font-bold text-pink-500 shadow-sm border border-pink-100 text-base">
                    G
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Google / Gmail Identity</h4>
                    <p className="text-[11px] text-pink-500 font-semibold">{user?.email}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Connected
                </span>
              </div>

              {/* WhatsApp Business Account */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">WhatsApp Business API</h4>
                    <p className="text-[11px] text-emerald-700 font-semibold">
                      {integration?.status === 'active'
                        ? `Linked Phone: ${integration.displayPhoneNumber}`
                        : 'Linked via your Gmail Account'}
                    </p>
                  </div>
                </div>

                {integration?.status === 'active' ? (
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-200 text-emerald-800">
                      Active
                    </span>
                    <button
                      onClick={openConnect}
                      className="px-3.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold shadow-sm border border-emerald-200 transition-colors"
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

          {/* TAB 4: Blocked Users */}
          {activeTab === 'blocked' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700">Blocked Contacts</h4>
              {(!user?.blockedUsers || user.blockedUsers.length === 0) && (
                <p className="text-xs text-slate-400 py-6 text-center">No blocked contacts.</p>
              )}

              {user?.blockedUsers?.map((blockedId: any) => (
                <div
                  key={typeof blockedId === 'string' ? blockedId : blockedId._id}
                  className="flex items-center justify-between p-3 bg-pink-50/60 rounded-2xl border border-pink-200/80"
                >
                  <span className="text-xs text-slate-700 font-bold">
                    {typeof blockedId === 'object' ? blockedId.name : blockedId}
                  </span>
                  <button
                    onClick={() => unblockUser(typeof blockedId === 'string' ? blockedId : blockedId._id)}
                    className="px-3 py-1 text-xs font-bold text-pink-500 bg-pink-100 hover:bg-pink-200 rounded-full transition-colors"
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
