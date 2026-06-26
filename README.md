# AI Group Discussion Platform

An AI-powered Group Discussion platform that enables users to participate in real-time discussions, generate live transcripts using browser speech recognition, and receive AI-generated performance feedback after the discussion.

## Features

* User Registration and Login (JWT Authentication)
* Create and Join Discussion Rooms
* Real-time Communication with Socket.io
* Waiting Room before discussion starts
* Host-controlled Start and End Discussion
* Buzzer system to ensure one speaker at a time
* Live participant list
* Browser Speech Recognition for transcript generation
* Real-time transcript sharing
* AI-generated discussion feedback using Groq LLM
* MongoDB for persistent data storage

---

## Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* React Router
* Axios
* Socket.io Client
* Web Speech API

### Backend

* Node.js
* Express.js
* Socket.io
* MongoDB
* Mongoose
* JWT Authentication
* Bcrypt
* Groq API

---

## Project Structure

```
project/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── socket/
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## Installation

### Clone the repository

```bash
git clone <repository-url>
cd project
```

### Backend

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/gd_platform
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_api_key
```

Start the backend:

```bash
npm run dev
```

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```
http://localhost:5173
```

---

## Application Workflow

1. Register a new account.
2. Log in using your credentials.
3. Create a new discussion room or join an existing one.
4. The room host starts the discussion.
5. Participants use the buzzer before speaking.
6. Browser Speech Recognition generates live transcripts.
7. Transcripts are stored in MongoDB.
8. The host ends the discussion.
9. Groq AI analyzes the discussion.
10. Individual feedback is generated and displayed.

---

## Database Collections

* Users
* Rooms
* Transcripts
* Feedbacks

---

## Socket Events

* `join-room`
* `leave-room`
* `gd-start`
* `gd-end`
* `buzzer-request`
* `buzzer-release`
* `participant-update`
* `buzzer-update`
* `transcript-update`
* `transcript-received`

---

## AI Feedback

After a discussion ends:

* All room transcripts are collected.
* The transcript is sent to the Groq LLM.
* Each participant receives:

  * Communication Score
  * Confidence Score
  * Grammar Score
  * Participation Score
  * Strengths
  * Areas for Improvement
  * Overall Summary

---

## Future Enhancements

* Redis for scalable socket management
* Kafka for event streaming
* Docker containerization
* Nginx reverse proxy
* Speech-to-text improvements
* Discussion history and analytics
* Cloud deployment (AWS/Azure/GCP)

---

## License

This project is developed for learning and educational purposes.
