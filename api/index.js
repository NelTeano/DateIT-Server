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
import MessageRoute from '../routes/message.routes.js';
import UserRoute from '../routes/user.routes.js';

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


// Routes
app.use('/api', UploadRoute);
app.use("/api/auth", AuthRoute);
app.use('/api/matches', MatchRoute);
app.use('/api/chat', MessageRoute);
app.use('/api/users', UserRoute);

// Error handling middleware (must be after routes)
app.use(uploadErrorHandler);


const PORT = process.env.PORT || 3100;
app.get('check', (req, res) => {
  res.send('API is running...');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;