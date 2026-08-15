import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useWhatsAppStore } from '../../stores/whatsappStore';
import { useChatStore } from '../../stores/chatStore';
import { MessageSquare, Sparkles, Send, Heart } from 'lucide-react';

export const WhatsAppSimulatorModal: React.FC = () => {
  const { isSimulatorOpen, closeSimulator, simulateInboundMessage } = useWhatsAppStore();
  const { fetchConversations } = useChatStore();

  const [customerName, setCustomerName] = useState('Sarah Customer');
  const [customerPhone, setCustomerPhone] = useState('+1 555-0199');
  const [content, setContent] = useState('Hello! I would like to inquire about your product pricing.');
  const [isSending, setIsSending] = useState(false);

  const presets = [
    {
      name: 'Sarah Customer',
      phone: '+1 555-0199',
      text: 'Hello! I would like to inquire about your product pricing. 🌸',
    },
    {
      name: 'David Miller',
      phone: '+44 7700 900077',
      text: 'Hi there! Could you please update me on order status #84920? 📦',
    },
    {
      name: 'Elena Rostova',
      phone: '+49 151 23456789',
      text: 'Good morning! Is customer support available today? ✨',
    },
  ];

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !customerPhone.trim()) return;

    try {
      setIsSending(true);
      await simulateInboundMessage({
        customerPhone,
        customerName,
        content,
      });

      await fetchConversations();
      closeSimulator();
    } catch (err: any) {
      alert(err.message || 'Failed to simulate incoming message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isSimulatorOpen}
      onClose={closeSimulator}
      title="WhatsApp Business Inbound Simulator"
      maxWidth="md"
    >
      <div className="space-y-4 text-slate-800">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2.5">
          <span className="text-xl">⚡</span>
          <div>
            <p className="font-bold flex items-center gap-1">
              Live WhatsApp Business Inbound Simulator
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Simulate a real-time incoming webhook event from an external customer's WhatsApp phone.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500">Quick Test Scenarios:</span>
          <div className="flex flex-col gap-1.5">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCustomerName(p.name);
                  setCustomerPhone(p.phone);
                  setContent(p.text);
                }}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-pink-50/60 hover:bg-pink-100/70 border border-pink-200/80 text-left text-xs transition-colors"
              >
                <div>
                  <span className="font-bold text-slate-800">{p.name}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold ml-2">{p.phone}</span>
                  <p className="text-[11px] text-slate-600 truncate max-w-[280px] mt-0.5">{p.text}</p>
                </div>
                <span className="text-[10px] text-pink-500 font-bold shrink-0">Use Preset →</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSimulate} className="space-y-3 pt-2 border-t border-pink-100">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Sarah Customer"
                className="w-full px-3 py-2 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Customer Phone Number
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+1 555-0199"
                className="w-full px-3 py-2 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Customer Message Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What did the customer say?"
              rows={3}
              className="w-full px-3 py-2 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeSimulator}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? 'Simulating...' : 'Simulate Inbound Event 🟢'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
