const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

// Routes
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

// Handlers
const socketHandler = require('./socket/socketHandler');

const connectDB = require('./config/db');

dotenv.config({
  override: true
});
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true })); // Adjust for vite default port
app.use(express.json());
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/feedback', feedbackRoutes);

// Socket.io Setup
const path = require("path");

console.log("Current directory:", process.cwd());
console.log("Resolved .env:", path.resolve(".env"));
console.log("Groq:", process.env.GROQ_API_KEY);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

socketHandler(io);

const PORT = process.env.PORT || 5000;
console.log(process.env.MONGO_URI);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
