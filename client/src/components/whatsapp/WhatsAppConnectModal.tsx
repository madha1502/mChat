import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useWhatsAppStore } from '../../stores/whatsappStore';
import { useAuthStore } from '../../stores/authStore';
import { MessageSquare, Mail, Phone, ShieldCheck, Copy, Sparkles, CheckCircle2 } from 'lucide-react';

export const WhatsAppConnectModal: React.FC = () => {
  const { user } = useAuthStore();
  const { isConnectOpen, closeConnect, connectAccount, integration, disconnectAccount } = useWhatsAppStore();

  const [activeTab, setActiveTab] = useState<'gmail' | 'meta'>('gmail');

  // Quick Gmail Linking
  const [gmailPhoneNumber, setGmailPhoneNumber] = useState(integration?.displayPhoneNumber || '+91 ');

  // Advanced Meta Credentials
  const [businessAccountId, setBusinessAccountId] = useState(integration?.businessAccountId || '');
  const [phoneNumberId, setPhoneNumberId] = useState(integration?.phoneNumberId || '');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState(integration?.displayPhoneNumber || '+1 ');
  const [accessToken, setAccessToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${window.location.origin}/api/integrations/whatsapp/webhook`;
  const verifyToken = 'aether_meta_verify_token_2026';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickGmailConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailPhoneNumber.trim()) return;

    try {
      setIsSubmitting(true);
      await connectAccount({
        displayPhoneNumber: gmailPhoneNumber,
      });
      alert(`WhatsApp successfully linked to your Gmail account (${user?.email || 'Gmail'})! 🟢`);
      closeConnect();
    } catch (err: any) {
      alert(err.message || 'Failed to link WhatsApp');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMetaConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await connectAccount({
        businessAccountId,
        phoneNumberId,
        displayPhoneNumber,
        accessToken,
      });
      alert('Meta WhatsApp Business account connected successfully!');
      closeConnect();
    } catch (err: any) {
      alert(err.message || 'Failed to connect WhatsApp account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this WhatsApp Business account?')) return;
    try {
      setIsSubmitting(true);
      await disconnectAccount();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isConnectOpen} onClose={closeConnect} title="Link WhatsApp with Gmail & Meta" maxWidth="lg">
      <div className="space-y-5">
        {/* Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-start gap-3">
          <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-md shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1 text-slate-700">
            <h4 className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
              Unified WhatsApp Access via Gmail
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Connect your WhatsApp number directly to your registered Gmail account to receive and reply to WhatsApp messages inside Love Bubble.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-pink-50 rounded-full border border-pink-200">
          <button
            type="button"
            onClick={() => setActiveTab('gmail')}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'gmail'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                : 'text-slate-600 hover:text-emerald-600'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            1-Click Link with My Gmail 🟢
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'meta'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                : 'text-slate-600 hover:text-pink-600'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Advanced Meta Cloud API
          </button>
        </div>

        {/* TAB 1: 1-CLICK GMAIL LINKING */}
        {activeTab === 'gmail' && (
          <form onSubmit={handleQuickGmailConnect} className="space-y-4 animate-in fade-in">
            <div className="p-4 bg-white rounded-2xl border border-pink-200/80 shadow-sm space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Your Verified Gmail Address
                </label>
                <div className="flex items-center gap-2 p-2.5 bg-pink-50/60 rounded-xl border border-pink-200 text-xs font-semibold text-slate-700">
                  <Mail className="w-4 h-4 text-pink-500" />
                  <span className="font-mono text-pink-700 font-bold">{user?.email || 'your-gmail@gmail.com'}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  WhatsApp Phone Number to Link
                </label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3.5 w-4 h-4 text-emerald-500 pointer-events-none" />
                  <input
                    type="text"
                    value={gmailPhoneNumber}
                    onChange={(e) => setGmailPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210 or +1 555-0199"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-emerald-400 font-mono"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Includes international country code (e.g. +91 for India, +1 for US).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {integration?.status === 'active' ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-50 text-rose-500 hover:bg-rose-100 text-xs font-bold rounded-full transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeConnect}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Linking...' : 'Link WhatsApp to My Gmail 🟢'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: ADVANCED META CLOUD API */}
        {activeTab === 'meta' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Webhook Configuration Guide */}
            <div className="p-4 rounded-2xl bg-pink-50/70 border border-pink-200 space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider">
                Meta App Webhook Settings
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 text-[11px] block font-semibold">Callback URL:</span>
                  <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-pink-200 mt-0.5 shadow-sm">
                    <code className="text-pink-600 font-mono text-[11px] truncate pr-2">{webhookUrl}</code>
                    <button
                      onClick={() => copyToClipboard(webhookUrl)}
                      className="text-pink-400 hover:text-pink-600 p-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px] block font-semibold">Verify Token:</span>
                  <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-pink-200 mt-0.5 shadow-sm">
                    <code className="text-emerald-600 font-mono text-[11px] font-bold">{verifyToken}</code>
                    <button
                      onClick={() => copyToClipboard(verifyToken)}
                      className="text-emerald-500 hover:text-emerald-700 p-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleMetaConnect} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    WhatsApp Business Account ID (WABA)
                  </label>
                  <input
                    type="text"
                    value={businessAccountId}
                    onChange={(e) => setBusinessAccountId(e.target.value)}
                    placeholder="e.g. 104829384918234"
                    className="w-full px-3 py-2 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="e.g. 109283746192834"
                    className="w-full px-3 py-2 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Display Phone Number
                </label>
                <input
                  type="text"
                  value={displayPhoneNumber}
                  onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="w-full px-3 py-2 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Permanent Access Token
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAAB..."
                  className="w-full px-3 py-2 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {integration?.status === 'active' ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-50 text-rose-500 hover:bg-rose-100 text-xs font-bold rounded-full transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeConnect}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Linking...' : 'Save Meta Credentials 🟢'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
};
