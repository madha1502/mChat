import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { IConversation, IUser } from '../../types';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { Link2, Copy, Check, LogOut, ShieldCheck, UserMinus, UserPlus, Trash2 } from 'lucide-react';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: IConversation;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  onClose,
  conversation,
}) => {
  const { user: currentUser } = useAuthStore();
  const { fetchConversations, setActiveConversation } = useChatStore();

  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!conversation.group) return null;

  const admins = conversation.group.admins || [];
  const isAdmin = admins.some(
    (a) => (typeof a === 'string' ? a === currentUser?._id : a._id === currentUser?._id)
  );

  const inviteLink = conversation.group.inviteToken
    ? `${window.location.origin}/join/${conversation.group.inviteToken}`
    : '';

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) return;
    try {
      setIsLoading(true);
      await api.delete(`/conversations/${conversation._id}/members/${userId}`);
      await fetchConversations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      setIsLoading(true);
      await api.post(`/conversations/${conversation._id}/leave`);
      await fetchConversations();
      setActiveConversation(null);
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to leave group');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group Information" maxWidth="md">
      <div className="space-y-6">
        {/* Header Avatar & Details */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Avatar
            src={conversation.group.image}
            name={conversation.group.name}
            size="xl"
            isGroup={true}
          />
          <div>
            <h3 className="text-lg font-bold text-white">{conversation.group.name}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Group • {conversation.participants.length} participants
            </p>
          </div>
          {conversation.group.description && (
            <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-left w-full">
              {conversation.group.description}
            </p>
          )}
        </div>

        {/* Shareable Invite Link */}
        {inviteLink && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-sky-400" />
              Invite Link via Token
            </label>
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <span className="truncate text-slate-300 pr-2">{inviteLink}</span>
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-1 px-2.5 py-1 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 rounded-lg shrink-0 font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Participants List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {conversation.participants.length} Members
            </h4>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-800/40">
            {conversation.participants.map((p) => {
              const participant = p as IUser;
              const isUserAdmin = admins.some(
                (a) => (typeof a === 'string' ? a === participant._id : a._id === participant._id)
              );
              const isSelf = participant._id === currentUser?._id;

              return (
                <div
                  key={participant._id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/40"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={participant.profilePicture}
                      name={participant.name}
                      size="sm"
                      isOnline={participant.isOnline}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">
                          {participant.name} {isSelf && '(You)'}
                        </span>
                        {isUserAdmin && <Badge variant="admin" />}
                      </div>
                      <p className="text-[11px] text-slate-500">@{participant.username}</p>
                    </div>
                  </div>

                  {/* Admin controls over non-self members */}
                  {isAdmin && !isSelf && (
                    <button
                      onClick={() => handleRemoveMember(participant._id)}
                      disabled={isLoading}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove Member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave Group Action */}
        <div className="pt-3 border-t border-slate-800">
          <button
            onClick={handleLeaveGroup}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-xs font-bold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Leave Group
          </button>
        </div>
      </div>
    </Modal>
  );
};
