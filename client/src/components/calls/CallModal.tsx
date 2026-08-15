import React, { useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  Maximize2,
  Volume2,
} from 'lucide-react';
import { useCallStore } from '../../stores/callStore';
import { Avatar } from '../common/Avatar';

export const CallModal: React.FC = () => {
  const {
    callStatus,
    callType,
    peerUser,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    duration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Attach local media stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote media stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callStatus === 'idle') return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Incoming Call Dialog
  if (callStatus === 'incoming' && peerUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
        <div className="flex flex-col items-center p-8 bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95">
          <div className="relative">
            <span className="absolute -inset-2 rounded-full bg-sky-500/20 animate-ping" />
            <Avatar src={peerUser.profilePicture} name={peerUser.name} size="xl" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-100">{peerUser.name}</h3>
            <p className="text-xs text-sky-400 font-medium mt-1 uppercase tracking-wider">
              Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
            </p>
          </div>

          <div className="flex items-center gap-6 pt-2">
            {/* Reject Call */}
            <button
              onClick={rejectCall}
              className="p-4 rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30 hover:scale-110 active:scale-95 transition-all"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            {/* Accept Call */}
            <button
              onClick={acceptCall}
              className="p-4 rounded-full bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all animate-bounce"
              title="Accept"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active or Calling Screen
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 text-slate-100 backdrop-blur-xl animate-in fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between p-6 z-20">
        <div className="flex items-center gap-3">
          <Avatar src={peerUser?.profilePicture} name={peerUser?.name} size="md" />
          <div>
            <h4 className="font-bold text-base text-white">{peerUser?.name}</h4>
            <p className="text-xs text-slate-400 font-mono">
              {callStatus === 'calling' ? 'Ringing...' : `In Call • ${formatDuration(duration)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Media Canvas Area */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
        {callType === 'video' || remoteStream?.getVideoTracks().length ? (
          <div className="relative w-full h-full max-w-5xl rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local Picture-In-Picture Preview */}
            <div className="absolute bottom-4 right-4 w-40 h-28 md:w-56 md:h-36 rounded-2xl overflow-hidden bg-black/80 border-2 border-slate-700 shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                  Camera Off
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Voice Call Visualizer */
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <span className="absolute -inset-4 rounded-full bg-sky-500/10 animate-pulse" />
              <Avatar src={peerUser?.profilePicture} name={peerUser?.name} size="xl" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-100">{peerUser?.name}</h3>
              <p className="text-sm text-sky-400 font-mono mt-1">
                {callStatus === 'calling' ? 'Calling...' : formatDuration(duration)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Call Controls Footer */}
      <div className="flex items-center justify-center gap-4 p-6 z-20">
        {/* Mute Mic Toggle */}
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all ${
            isMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Video Camera Toggle */}
        {callType === 'video' && (
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${
              isVideoOff ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        {/* Screen Sharing Toggle */}
        {callType === 'video' && (
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all ${
              isScreenSharing ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <ScreenShare className="w-6 h-6" />
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="p-4 rounded-full bg-rose-600 text-white shadow-xl shadow-rose-600/30 hover:bg-rose-500 hover:scale-110 active:scale-95 transition-all ml-2"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
