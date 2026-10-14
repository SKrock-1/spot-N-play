import express from 'express';
import 'dotenv/config';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import sanitize from 'mongo-sanitize';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import groundRoutes from './routes/groundRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { socketHandler } from './socket/socketHandler.js';
import passport from './config/passport.js';
import coachRoutes from './routes/coachRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import geocodeRoutes from './routes/geocodeRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import lookingRoutes from './routes/lookingRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import venueRoutes from './routes/venueRoutes.js';
import poolRoutes from './routes/poolRoutes.js';
import { startExpirySweep } from './services/lookingExpiryService.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { setIO } from './socket/io.js';
import versionRoutes from './routes/versionRoutes.js';
import siteRoutes from './routes/siteRoutes.js';
import lpuRoutes from './routes/lpuRoutes.js';
import challengeRoutes from './routes/challengeRoutes.js';
import playerChallengeRoutes from './routes/playerChallengeRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);

// ── Trust proxy ───────────────────────────────────────────────────
// CRITICAL for correct rate limiting: this app runs behind a reverse proxy
// (Render/Railway/Vercel-style hosting). Without this, Express thinks every
// request comes from the proxy's own IP — so `req.ip` is identical for
// EVERY user, and every rate limiter below silently becomes a single
// GLOBAL bucket shared by all users at once instead of one bucket per user.
// That's what was causing the map page to intermittently wipe its own
// markers: one busy user (or a burst of geocode lookups) could exhaust the
// "per-IP" budget for the entire app.
// `1` = trust exactly one hop (the platform's own load balancer) — safe
// default for single-proxy hosting. Adjust if you sit behind more hops.
app.set('trust proxy', 1);

// ── Allowed origins ──────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

const corsOrigin = (origin, callback) => {
  // Allow no-origin requests (mobile apps, Postman in dev) and whitelisted origins.
  if (!origin) return callback(null, true);
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    (process.env.NODE_ENV !== 'production' && origin === 'http://localhost:5173');
  if (allowed) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

// ── Security headers (helmet) ─────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary images
  contentSecurityPolicy: false, // CSP is handled by the frontend build
}));

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Body parsing with size limits ────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Strip MongoDB operator injection from query/body/params ──────
app.use((req, res, next) => {
  // Express 5 leaves req.body undefined when a request has no body or no
  // matching Content-Type (e.g. axios.post(url) with no payload). Default
  // it to {} so controllers reading optional fields (req.body.teamName,
  // req.body.reason, …) don't crash with a TypeError.
  if (req.body === undefined) req.body = {};
  else if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);
  // Don't touch req.query (read-only in Express 5), filter at controller level
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────
//
// Key by logged-in user ID when we can, not raw IP. Lots of real users sit
// behind one shared public IP (campus WiFi, office NAT, a mobile carrier's
// CGNAT) — keying by IP alone means they all draw from the SAME budget, so
// one busy user starves everyone else on that network. We don't have
// `req.user` yet at this point in the middleware chain (that's set by
// `protect`, which runs per-route later), so we do a cheap best-effort JWT
// decode here. If it fails or there's no token, we just fall back to IP —
// this never blocks a request, it only chooses which bucket to count it in.
const keyByUserOrIP = (req) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (decoded?.id) return `u:${decoded.id}`;
    } catch {
      // invalid/expired token — fall through to IP-based keying
    }
  }
  return ipKeyGenerator(req.ip);
};

// Strict limit for auth endpoints (prevent brute-force / credential stuffing)
// Deliberately IP-keyed, not user-keyed — an attacker guessing passwords
// isn't logged in yet.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { message: 'Too many requests from this IP, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP endpoints — even tighter (prevent OTP flooding / SMS abuse)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 5,
  message: { message: 'Too many OTP requests. Please wait 10 minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload endpoints — prevent storage abuse
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 20,
  message: { message: 'Upload rate limit reached. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIP,
});

// General API limiter — permissive but guards against DoS
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 200,
  message: { message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIP,
  skip: (req) => req.path === '/' || req.path === '/api', // skip health-checks
});

// Map/discovery reads — the map page can legitimately fire a burst of
// requests (nearby players + nearby grounds + one geocode lookup per
// marker), all at once, every time someone searches. That's normal use,
// not abuse, so it gets its own generous, user-keyed budget instead of
// competing with the rest of the app's 200/min bucket.
const mapLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { message: 'Too many map requests. Please wait a moment and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIP,
});

// Public, unauthenticated stats endpoint — no user to key by, so cap it
// specifically instead of leaving it to share (or hide behind) other buckets.
const statsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/otp', otpLimiter);
app.use('/api/upload', uploadLimiter);
app.use('/api/geocode', mapLimiter);
app.use('/api/players/nearby', mapLimiter);
app.use('/api/players/all', mapLimiter);
app.use('/api/grounds/nearby', mapLimiter);
app.use('/api/grounds/all', mapLimiter);
app.use('/api/analytics', statsLimiter);

// ── Passport ──────────────────────────────────────────────────────
app.use(passport.initialize());

// ── Socket.io ─────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

setIO(io); // let controllers/services emit real-time notifications via getIO()
socketHandler(io);
startExpirySweep(io);

// ── Health checks ─────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'PLAYNSPORTS API running 🚀' }));
app.get('/api', (req, res) => res.json({ message: 'API is working 🚀' }));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/grounds', groundRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/looking', lookingRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/pools', poolRoutes);
app.use('/api/version', versionRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/lpu', lpuRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/player-challenges', playerChallengeRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// ── Error handler ─────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT} 🟢`));
