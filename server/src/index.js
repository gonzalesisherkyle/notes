// server/src/index.js
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import authMiddleware from './middleware/auth.js';
import authRouter from './routes/auth.js';
import notesRouter from './routes/notes.js';
import syncRouter from './routes/sync.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 3000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/notes', authMiddleware, notesRouter);
app.use('/api/sync', authMiddleware, syncRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

await mongoose.connect(process.env.MONGODB_URI);

app.listen(port, () => {
  console.log(`Notes API listening on http://localhost:${port}`);
});
