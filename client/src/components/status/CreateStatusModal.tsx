import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useStatusStore } from '../../stores/statusStore';
import { api } from '../../services/api';
import { Type, Image, Send, Palette, Lock } from 'lucide-react';

const BG_COLORS = [
  '#0F172A',
  '#1E1B4B',
  '#064E3B',
  '#701A75',
  '#831843',
  '#7C2D12',
  '#134E4A',
];

export const CreateStatusModal: React.FC = () => {
  const { isCreateOpen, closeCreate, createStatus } = useStatusStore();

  const [mode, setMode] = useState<'text' | 'media'>('text');
  const [content, setContent] = useState('');
  const [caption, setCaption] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [privacy, setPrivacy] = useState<'everyone' | 'contacts'>('everyone');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setMediaUrl(res.data.data.url);
        setMediaType(res.data.data.mimetype.startsWith('video/') ? 'video' : 'image');
        setMode('media');
      }
    } catch (e) {
      alert('Failed to upload status media');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'text' && !content.trim()) return;
    if (mode === 'media' && !mediaUrl) return;

    try {
      setIsSubmitting(true);
      await createStatus({
        type: mode === 'text' ? 'text' : mediaType,
        content: mode === 'text' ? content : undefined,
        mediaUrl: mode === 'media' ? mediaUrl : undefined,
        caption: mode === 'media' ? caption : undefined,
        backgroundColor: bgColor,
        privacy,
      });

      // Reset
      setContent('');
      setCaption('');
      setMediaUrl('');
      closeCreate();
    } catch (err: any) {
      alert(err.message || 'Failed to post story');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isCreateOpen} onClose={closeCreate} title="Create New Status / Story">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'text' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            Text Story
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('media');
              fileInputRef.current?.click();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'media' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Image className="w-4 h-4" />
            Photo / Video
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Text Story Preview & Editor */}
        {mode === 'text' && (
          <div className="space-y-3">
            <div
              style={{ backgroundColor: bgColor }}
              className="h-56 rounded-2xl p-4 flex items-center justify-center transition-colors"
            >
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your story..."
                rows={4}
                maxLength={300}
                className="w-full bg-transparent text-white text-center font-bold text-lg placeholder-white/50 focus:outline-none resize-none"
              />
            </div>

            {/* Background Color Presets */}
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-slate-400" />
              <div className="flex items-center gap-2">
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    style={{ backgroundColor: color }}
                    onClick={() => setBgColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      bgColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Media Story Preview & Editor */}
        {mode === 'media' && (
          <div className="space-y-3">
            {mediaUrl ? (
              <div className="h-56 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                {mediaType === 'image' ? (
                  <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <video src={mediaUrl} controls className="w-full h-full object-contain" />
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-56 rounded-2xl border-2 border-dashed border-slate-700 hover:border-sky-500 flex flex-col items-center justify-center gap-2 cursor-pointer text-slate-400 transition-colors"
              >
                <Image className="w-8 h-8" />
                <span className="text-xs font-semibold">
                  {isUploading ? 'Uploading media...' : 'Click to select Photo or Video'}
                </span>
              </div>
            )}

            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full px-3 py-2 bg-slate-950 text-sm text-slate-100 placeholder-slate-500 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>
        )}

        {/* Privacy Selector */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5" />
            <span>Audience:</span>
            <select
              value={privacy}
              onChange={(e: any) => setPrivacy(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">My Contacts</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isUploading || (mode === 'text' && !content.trim())}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-sky-500/20 hover:bg-sky-400 disabled:opacity-50 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Publishing...' : 'Share Story'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
