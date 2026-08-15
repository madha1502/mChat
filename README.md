# Aether Unified Messenger

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://reactjs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-orange.svg)](https://webrtc.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green.svg)](https://www.mongodb.com/)
[![Meta WhatsApp API](https://img.shields.io/badge/Meta%20WhatsApp-Official%20Cloud%20API-25D366.svg)](https://developers.facebook.com/docs/whatsapp/cloud-api)

A complete, production-oriented **Unified Real-Time Messaging Platform** with **Google/Gmail Authentication**, **Instant Socket.IO WebSockets Messaging**, **WebRTC Peer-to-Peer Audio/Video Calling & Screen Sharing**, **24h Stories/Status**, **Group Administration**, and **Official Meta WhatsApp Business Cloud Platform Integration**.

---

## 🌟 Architecture Overview

```text
                               ┌──────────────────────────────────────────────┐
                               │           React + Vite Web Client            │
                               │   (Tailwind CSS + Zustand + Lucide + WebRTC) │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                    ┌─────────────────┴─────────────────┐
                                    │                                   │
                             REST API (JSON)                    Socket.IO (WebSockets)
                             - Authentication & Profiles         - Instant Messaging & ACKs
                             - User Search & Groups              - Typing Indicators
                             - Media & Voice Uploads             - Presence & Read Receipts
                             - Statuses & WhatsApp Sync          - WebRTC Signaling
                                    │                                   │
                                    └─────────────────┬─────────────────┘
                                                      │
                                        ┌─────────────▼─────────────┐
                                        │    Node.js + Express TS   │
                                        │       Backend Server      │
                                        └──────┬────────────┬───────┘
                                               │            │
                        ┌──────────────────────┼────────────┴──────────────────────┐
                        │                      │                                   │
                ┌───────▼────────┐     ┌───────▼────────┐                  ┌───────▼────────┐
                │ MongoDB Atlas  │     │ Storage Engine │                  │ Meta WhatsApp  │
                │  (Mongoose)    │     │ (Local/Cloud)  │                  │  Business API  │
                └────────────────┘     └────────────────┘                  └────────────────┘
```

---

## 🚀 Key Features

### 1. 🔐 Google / Gmail Authentication
- **No phone numbers required**: Accounts are authenticated through Google OAuth 2.0 / JWT session cookies.
- **One-Click Multi-User Dev Personas**: Test conversations, presence, calls, and delivery ticks across multiple browser tabs without requiring production GCP credentials immediately.
- **User profile management**: Display name, unique username, bio/about, profile photo upload, and presence tracking.

### 2. ⚡ Real-Time Instant Messaging Engine
- **Socket.IO Rooms & Heartbeats**: Instant delivery without polling or manual page reload.
- **Reliable Deduplication**: Client-generated `clientMessageId` prevents duplicate message delivery across network reconnects.
- **Optimistic UI Updates**: Immediate message bubble rendering with pending, sent, delivered, and read receipt states.
- **Delivery & Read Receipts**: Sent (`✓`), Delivered (`✓✓`), and Read (`🔵✓✓`).
- **Debounced Typing Indicators**: Real-time typing indicators with privacy settings support.
- **Presence & Last Seen**: Tracks online status and last-seen timestamps.

### 3. 💬 Rich Media & Advanced Messaging
- **Voice Messages**: Browser `MediaRecorder` audio recording with live timer, waveform visualizer, and `1x / 1.5x / 2x` playback rate controls.
- **Attachments**: Photos, Videos, Audio, Documents (PDF, DOCX, ZIP), Location sharing, and Contact cards.
- **Emoji Reactions**: Interactive emoji picker with multi-user reaction pills (`❤️ 😂 👍 😮 😢 🔥 👏`).
- **Message Replies**: Quote reply banner with click-to-scroll to original message.
- **Message Editing & Soft Deletion**: Edit messages inline (`(edited)` badge) and soft-delete (`"This message was deleted"`).
- **Starred & Pinned Messages**: Pin key messages to the conversation banner; star messages for quick retrieval.
- **Disappearing Messages**: Configurable per-chat expiration timer (`Off`, `24h`, `7d`, `90d`) with MongoDB TTL indexes.

### 4. 👥 Group Chats & Administration
- **Group Creation**: Custom group name, description, and group avatar image upload.
- **Role Permissions**: Server-enforced admin roles for member additions, removals, and group edits.
- **Shareable Token Invite Links**: Generate and copy secure invite links (`/join/:token`).

### 5. 📸 24-Hour Stories / Status
- **Text & Media Statuses**: Create text stories with background color presets or upload photo/video statuses with captions.
- **Story Viewer**: Instagram/WhatsApp-style animated progress bars, pause on hold, and story reply drawer.
- **Viewers Tracking**: Real-time viewer count and reader tracking.
- **Automatic Expiration**: Automatically removed after 24 hours using MongoDB TTL indexes.

### 6. 📞 WebRTC Voice, Video & Screen Sharing
- **Peer-to-Peer Media Transport**: Direct audio/video streaming via WebRTC with Socket.IO signaling.
- **Features**: Microphone mute toggle, camera toggle, screen sharing (`getDisplayMedia`), floating picture-in-picture stream, and call duration timer.

### 7. 🟢 Official Meta WhatsApp Business Integration (Unified Inbox)
- **Official Cloud API**: Uses Meta's official WhatsApp Business Platform API v20.0 (zero unofficial scraping or browser automation).
- **Encrypted Token Storage**: AES-256-GCM authenticated encryption for access tokens at rest.
- **Official Webhook Verification**: Supports `hub.mode`, `hub.verify_token`, and challenge handshake (`GET /api/integrations/whatsapp/webhook`).
- **Unified Inbox Normalization**: Distinguishes between internal users and external WhatsApp customer messages (`source: 'whatsapp_business'`).
- **Interactive Sandbox Simulator**: Built-in test modal to trigger simulated inbound customer messages from the UI and test two-way communication in real-time.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Lucide React, Date-fns, Axios, Socket.IO Client |
| **Backend** | Node.js, Express 4, TypeScript, Socket.IO, Mongoose, MongoDB, Zod, Helmet, Cookie-Parser, Multer, Crypto (AES-256-GCM) |
| **Real-Time** | WebSockets (Socket.IO Rooms & ACKs), WebRTC (RTCPeerConnection) |
| **Integration** | Meta WhatsApp Business Cloud API v20.0 |
| **Deployment** | Docker, Docker Compose |

---

## 📁 Project Structure

```text
unified-chat/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/           # Login & Persona Selector
│   │   │   ├── calls/          # WebRTC Call Overlay & Controls
│   │   │   ├── chat/           # Chat Header, Bubble, List, Input
│   │   │   ├── common/         # Avatar, Badge, Modal, Skeletons
│   │   │   ├── groups/         # New Group, Chat Search, Group Info
│   │   │   ├── settings/       # Profile, Privacy, Linked Accounts
│   │   │   ├── sidebar/        # Header, Search, Conversation Item/List
│   │   │   ├── status/         # 24h Story Viewer & Creator
│   │   │   └── whatsapp/       # Meta API Connect & Inbound Simulator
│   │   ├── services/           # Axios API, Socket.IO, WebRTC Manager
│   │   ├── stores/             # Zustand Auth, Chat, Call, Status, WhatsApp
│   │   ├── types/              # TypeScript Interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/             # Environment & MongoDB Database
│   │   ├── controllers/        # REST Route Handlers
│   │   ├── middleware/         # Auth JWT, Errors, Rate Limiting
│   │   ├── models/             # User, Conversation, Message, Status, Call, WhatsApp
│   │   ├── routes/             # Express API Subrouters
│   │   ├── services/           # Auth, Storage, Meta WhatsApp API
│   │   ├── sockets/            # Presence, Message, Typing, Call, Group
│   │   ├── test/               # Backend Unit & Validation Tests
│   │   ├── utils/              # AES-256-GCM Crypto, AppError
│   │   ├── validators/         # Zod Request Schemas
│   │   └── app.ts              # Express Server Entrypoint
│   └── package.json
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
└── package.json
```

---

## ⚙️ Quick Start Installation

### Prerequisites
- **Node.js**: v18+ (tested on v22 & v24)
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or free MongoDB Atlas cluster.

### 1. Clone & Install Dependencies
```bash
# Install root, server, and client dependencies
npm install --prefix server
npm install --prefix client
```

### 2. Configure Environment
```bash
# Copy template into server/.env
cp .env.example server/.env
```

### 3. Run Development Servers
```bash
# Terminal 1: Start Backend Server (Port 5000)
npm run dev:server

# Terminal 2: Start React Frontend (Port 5173)
npm run dev:client
```
Open **`http://localhost:5173`** in your browser.

---

## 🔑 Google OAuth 2.0 Configuration Guide

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project: **Aether Messenger**.
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials > OAuth Client ID** (Application type: *Web Application*).
5. Set Authorized Javascript Origins to:
   ```text
   http://localhost:5173
   ```
6. Set Authorized Redirect URIs to:
   ```text
   http://localhost:5000/api/auth/google/callback
   ```
7. Copy your `Client ID` and `Client Secret` into `server/.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

---

## 🟢 Meta WhatsApp Business Cloud API Configuration

1. Log in to [Meta for Developers](https://developers.facebook.com/).
2. Create an App of type **Business** and add the **WhatsApp** product.
3. Under **WhatsApp > API Setup**, note your:
   - **Phone number ID**
   - **WhatsApp Business Account ID (WABA)**
   - **Temporary or Permanent Access Token**
4. Under **WhatsApp > Configuration > Webhook**:
   - Set Callback URL to: `https://your-public-domain.com/api/integrations/whatsapp/webhook`
   - Set Verify Token to: value of `WHATSAPP_VERIFY_TOKEN` (default: `aether_meta_verify_token_2026`)
   - Subscribe to the **`messages`** webhook field.
5. In Aether Messenger, open **Settings > Linked Accounts > Connect WhatsApp Business** and enter your credentials.

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/google` | Authenticate with Google ID Token | No |
| `POST` | `/api/auth/dev-login` | Developer quick login with demo personas | No |
| `GET` | `/api/auth/me` | Get current authenticated user session | Yes |
| `POST` | `/api/auth/logout` | Clear session cookie | No |
| `GET` | `/api/users/search` | Search users by email, username, or name | Yes |
| `PATCH` | `/api/users/me` | Update display name, username, bio, avatar | Yes |
| `PATCH` | `/api/users/me/privacy` | Update granular privacy settings | Yes |
| `GET` | `/api/conversations` | List Unified Inbox conversations | Yes |
| `POST` | `/api/conversations` | Create private or group conversation | Yes |
| `GET` | `/api/messages/:conversationId` | Cursor-paginated message history | Yes |
| `POST` | `/api/messages` | Send message via REST | Yes |
| `POST` | `/api/uploads` | Upload media files (photos, voice, docs) | Yes |
| `GET` | `/api/statuses/feed` | List active 24h stories | Yes |
| `POST` | `/api/statuses` | Create new text or media story | Yes |
| `GET` | `/api/integrations/whatsapp/webhook` | Meta Webhook Verification challenge | No |
| `POST` | `/api/integrations/whatsapp/webhook` | Meta Webhook Event receiver | No |
| `POST` | `/api/integrations/whatsapp/simulate`| Inbound WhatsApp customer message simulator | Yes |

---

## ⚡ Socket.IO Real-Time Events

| Event Name | Direction | Payload |
|---|---|---|
| `send_message` | Client → Server | `{ clientMessageId, conversationId, messageType, content, mediaUrl, replyTo }` |
| `new_message` | Server → Client | `{ message, conversationId }` |
| `message_delivered` | Bidirectional | `{ messageId, conversationId, deliveredAt }` |
| `message_read` | Bidirectional | `{ conversationId, readerId, readAt }` |
| `typing` / `stop_typing` | Client → Server | `{ conversationId }` |
| `user_presence_change` | Server → Client | `{ userId, isOnline, lastSeen }` |
| `call_user` | Client → Server | `{ targetUserId, conversationId, type, offer }` |
| `incoming_call` | Server → Client | `{ callId, caller, type, offer }` |
| `answer_call` | Client → Server | `{ callId, callerId, answer }` |
| `ice_candidate` | Bidirectional | `{ targetUserId, candidate }` |
| `end_call` | Bidirectional | `{ callId, targetUserId }` |

---

## 🧪 Testing

Run backend tests:
```bash
npm run test --prefix server
```

Build production bundle:
```bash
npm run build:client
```

---

## 🐳 Docker Deployment

Run the complete stack with Docker Compose:
```bash
docker-compose up --build -d
```
The server will be available on port `5000` with MongoDB running in a companion container.

---

## 📄 License
This project is licensed under the ISC License.
