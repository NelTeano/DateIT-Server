import express from 'express';
import dotenv from 'dotenv';
import { uploadErrorHandler } from '../middlewares/errorHandler.middleware.js';
import { initDatabase } from '../services/database.js';
import cors from 'cors';
import http from "http";
import { Server } from "socket.io";

// ROUTES
import AuthRoute from "../routes/auth.routes.js";
import MatchRoute from '../routes/match.routes.js';
import UploadRoute from '../routes/cloudinary.routes.js';

dotenv.config();
initDatabase();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const activeUsers = new Map();

// CORS 
app.use(cors({
    origin: [
        'http://localhost:3001',
        'https://dateit.vercel.app/',
        'https://dateit.vercel.app/match',
        'https://dateit.vercel.app/auth',
        'http://localhost:3000/auth',
        'http://localhost:3000'
        // 'https://reward-funding-website.vercel.app/',
        // 'https://reward-funding-website.vercel.app/Home',
    ],  
    // THE HTTP(ORIGIN) THAT WILL ALLOW TO ACCESS THE ROUTES
    credentials: true,
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their userId
  socket.on('user:join', (userId) => {
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} joined with socket ${socket.id}`);
  });

  // Join a specific match room
  socket.on('match:join', (matchId) => {
    socket.join(matchId);
    console.log(`Socket ${socket.id} joined match room ${matchId}`);
  });

  // Leave a match room
  socket.on('match:leave', (matchId) => {
    socket.leave(matchId);
    console.log(`Socket ${socket.id} left match room ${matchId}`);
  });

  // Handle new message
  socket.on('message:send', (data) => {
    const { matchId, message } = data;
    // Emit to all users in the match room
    io.to(matchId).emit('message:received', message);
  });

  // Handle match ended
  socket.on('match:ended', (data) => {
    const { matchId, endedBy } = data;
    // Notify all users in the match room
    io.to(matchId).emit('match:status', { matchId, status: 'ended', endedBy });
  });

  // Handle typing indicator
  socket.on('typing:start', (data) => {
    const { matchId, userId } = data;
    socket.to(matchId).emit('typing:user', { userId, isTyping: true });
  });

  socket.on('typing:stop', (data) => {
    const { matchId, userId } = data;
    socket.to(matchId).emit('typing:user', { userId, isTyping: false });
  });

  // Disconnect
  socket.on('disconnect', () => {
    // Remove user from activeUsers
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});


// Routes
app.use('/api', UploadRoute);
app.use("/api/auth", AuthRoute);
app.use('/api/matches', MatchRoute);



// Error handling middleware (must be after routes)
app.use(uploadErrorHandler);


const PORT = process.env.PORT || 3100;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;