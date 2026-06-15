# AI Group Discussion Platform

A production-quality platform for conducting and analyzing group discussions using React, Express, Socket.io, and Groq AI.

## Features

- **Structured GDs:** Real-time buzzer system to prevent overlapping speech.
- **Live Transcripts:** Uses Web Speech API to convert speech to text in real-time.
- **AI Feedback:** Generates HR-level evaluation for each participant automatically using Groq.
- **Local Storage:** Zero-setup JSON file storage (`users.json`, `rooms.json`, `transcripts.json`, `feedback.json`).

## Setup Instructions

### 1. Backend Setup

Open a terminal and run the following:

```bash
cd backend
npm install
```

Configure your environment variables:
1. Open `backend/.env.example` and save it as `backend/.env`
2. Set your `GROQ_API_KEY` inside `.env`.

Start the backend server:
```bash
npm run dev
```
*(The server runs on http://localhost:5000)*

### 2. Frontend Setup

Open a new terminal window and run:

```bash
cd frontend
npm install
```

Start the frontend server:
```bash
npm run dev
```
*(The React app runs on http://localhost:5173)*

## Usage Guide

1. Open http://localhost:5173 in **Google Chrome** (required for Web Speech API support).
2. Register a new account.
3. In the Dashboard, create a new room. You will become the "Host".
4. Copy the Room ID and open an Incognito window to join as another user.
5. Once everyone is in the Waiting Room, the Host can click **Start GD**.
6. Participants can click **Grab Buzzer** to speak. Allow microphone permissions.
7. Speak clearly, then click **Done Speaking**.
8. The Host can **End Discussion** when finished.
9. The system will automatically generate AI feedback for all participants.
