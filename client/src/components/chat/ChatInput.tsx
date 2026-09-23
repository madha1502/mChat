import React, { useState, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { socketService } from '../../services/socketService';
import { api } from '../../services/api';
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  X,
  Image as ImageIcon,
  FileText,
  MapPin,
  Heart,
} from 'lucide-react';

const COMMON_EMOJIS = ['💖', '💕', '🌸', '🧸', '🐼', '✨', '💝', '💗', '🍓', '🎀', '🥰', '😍', '😘', '🥺', '🎉'];

export const ChatInput: React.FC = () => {
  const {
    activeConversation,
    sendTextMessage,
    sendMediaMessage,
    sendLocationMessage,
    replyingTo,
    setReplyingTo,
  } = useChatStore();

  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileTypeRef = useRef<'image' | 'document' | 'voice'>('image');

  // Typing debounce timer
  const typingTimerRef = useRef<any>(null);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    if (!activeConversation) return;

    socketService.emitTyping(activeConversation._id);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketService.emitStopTyping(activeConversation._id);
    }, 2000);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    const contentToSend = text;
    setText('');
    setShowEmojiPicker(false);
    setShowAttachments(false);

    if (activeConversation) {
      socketService.emitStopTyping(activeConversation._id);
    }

    await sendTextMessage(contentToSend);
  };

  const handleSendHeart = async () => {
    await sendTextMessage('💖');
  };

  const handleAttachClick = (type: 'image' | 'document') => {
    fileTypeRef.current = type;
    setShowAttachments(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept =
        type === 'image'
          ? 'image/*,video/*'
          : '.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt';
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        const { url, originalname, size, mimetype } = res.data.data;
        const msgType = mimetype.startsWith('image/')
          ? 'image'
          : mimetype.startsWith('video/')
          ? 'video'
          : 'document';

        await sendMediaMessage({
          messageType: msgType,
          mediaUrl: url,
          fileName: originalname,
          fileSize: size,
        });
      }
    } catch (err) {
      alert('Failed to upload file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

        const formData = new FormData();
        formData.append('file', audioFile);

        try {
          const res = await api.post('/uploads', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          if (res.data.success) {
            await sendMediaMessage({
              messageType: 'voice',
              mediaUrl: res.data.data.url,
              fileName: 'Voice note',
            });
          }
        } catch (e) {
          alert('Failed to send voice note');
        }

        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  return (
    <div className="relative p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-pink-100/90 dark:border-slate-800 rounded-b-none md:rounded-b-[28px] transition-colors">
      {/* Hidden File Input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between p-2.5 bg-pink-50/90 dark:bg-slate-800/90 rounded-2xl border border-pink-200 dark:border-slate-700 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-1.5 h-7 rounded-full bg-pink-500 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-pink-600 dark:text-pink-400 block text-[11px]">
                Replying to {(replyingTo.senderId as any)?.name || 'message'}
              </span>
              <span className="text-slate-600 dark:text-slate-300 truncate block text-[11px]">
                {replyingTo.content || 'Media message'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-pink-100 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowEmojiPicker(false)} />
          <div className="absolute bottom-20 left-4 p-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-2xl border border-pink-100 dark:border-slate-700 z-40 animate-in zoom-in-95 grid grid-cols-5 gap-2 text-xl max-w-xs">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setText((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="p-2 hover:bg-pink-50 dark:hover:bg-slate-700 hover:scale-125 rounded-2xl transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Attachments Menu Popover */}
      {showAttachments && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowAttachments(false)} />
          <div className="absolute bottom-20 left-14 p-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-2xl border border-pink-100 dark:border-slate-700 z-40 animate-in zoom-in-95 flex flex-col gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 min-w-[170px]">
            <button
              onClick={() => handleAttachClick('image')}
              className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-pink-50 dark:hover:bg-slate-700 text-pink-600 dark:text-pink-400 transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-pink-500" />
              Photo / Video
            </button>
            <button
              onClick={() => handleAttachClick('document')}
              className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-pink-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 transition-colors"
            >
              <FileText className="w-4 h-4 text-indigo-500" />
              Document
            </button>
            <button
              onClick={() => {
                setShowAttachments(false);
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    sendLocationMessage({
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude,
                      name: 'My Current Location 📍',
                    });
                  });
                }
              }}
              className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-pink-50 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 transition-colors"
            >
              <MapPin className="w-4 h-4 text-rose-500" />
              Share Location
            </button>
          </div>
        </>
      )}

      {/* Main Input Control Bar */}
      {isRecording ? (
        /* Voice Recording Active Bar */
        <div className="flex items-center justify-between p-2 bg-pink-50 dark:bg-slate-800 rounded-full border border-pink-200 dark:border-slate-700 animate-pulse">
          <div className="flex items-center gap-3 pl-4">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              Recording Voice Note... ({recordingSeconds}s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-pink-100 dark:hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={stopRecording}
              className="p-2.5 [background:var(--header-bg)] text-white rounded-full shadow-md hover:scale-105 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Standard Input Field */
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* Emoji Toggle */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 rounded-full text-pink-500 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attachment Toggle */}
          <button
            type="button"
            onClick={() => setShowAttachments(!showAttachments)}
            className="p-2.5 rounded-full text-pink-500 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input Pill */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={text}
              onChange={handleTyping}
              placeholder="Say something cute... 💖"
              className="w-full px-5 py-3 bg-pink-50/60 dark:bg-slate-800/80 text-sm text-slate-800 dark:text-slate-100 placeholder-pink-300 dark:placeholder-slate-500 font-medium rounded-full border border-pink-200/80 dark:border-slate-700 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 dark:focus:ring-purple-900 transition-all"
            />
          </div>

          {/* Quick Heart Reaction Button */}
          {!text.trim() && (
            <button
              type="button"
              onClick={handleSendHeart}
              className="p-2.5 rounded-full bg-pink-50 dark:bg-slate-800 text-rose-500 hover:bg-pink-100 dark:hover:bg-slate-700 hover:scale-110 active:scale-95 transition-all shrink-0"
              title="Send Heart"
            >
              <Heart className="w-5 h-5 fill-rose-400 text-rose-500 animate-heart-pulse" />
            </button>
          )}

          {/* Voice Record or Send Button */}
          {text.trim() ? (
            <button
              type="submit"
              className="p-3 rounded-full [background:var(--header-bg)] text-white shadow-lg shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-3 rounded-full [background:var(--header-bg)] text-white shadow-lg shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all shrink-0"
              title="Record Voice Note"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </form>
      )}
    </div>
  );
};
