import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import fs from 'fs';
import nodemailer from 'nodemailer';
import https from 'https';
import { OAuth2Client } from 'google-auth-library';

import User from './models/User.js';
import Booking from './models/Booking.js';
import Notification from './models/Notification.js';
import ContactSubmission from './models/ContactSubmission.js';
import NewsletterSubscriber from './models/NewsletterSubscriber.js';
import AiDiagnosis from './models/AiDiagnosis.js';
import AiMatchLog from './models/AiMatchLog.js';
import SmartPricingLog from './models/SmartPricingLog.js';
import ReactivationPayment from './models/ReactivationPayment.js';
import Review from './models/Review.js';
import ServiceCategory from './models/ServiceCategory.js';
import ServiceItem from './models/ServiceItem.js';
import WorkType from './models/WorkType.js';
import ProviderPricing from './models/ProviderPricing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'servicehub_secret_key_12345';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/servicehub';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Auth Middleware
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Admin Only Middleware
const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Admin verification error' });
  }
};

// Auto-deactivate providers whose active cycle exceeds 30 days
const checkAndDeactivateProviders = async () => {
  try {
    // Self-healing migration for existing legacy provider documents
    await User.updateMany(
      { userType: 'provider', lastActivationDate: { $exists: false } },
      { $set: { lastActivationDate: new Date(), isActive: true } }
    );
    await User.updateMany(
      { userType: 'provider', isActive: { $exists: false } },
      { $set: { isActive: true } }
    );

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await User.updateMany(
      { 
        userType: 'provider', 
        isActive: true, 
        lastActivationDate: { $lt: thirtyDaysAgo } 
      },
      { $set: { isActive: false } }
    );
  } catch (err) {
    console.error('🌱 Auto-deactivation helper check failed:', err);
  }
};

// Generic email sender helper — uses Brevo HTTP API (works on Render free-tier)
// Falls back to Nodemailer for local dev when BREVO_API_KEY is not set.
const sendEmailNotification = async (to, subject, html) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const emailUser   = process.env.EMAIL_USER;
  const emailPass   = process.env.EMAIL_PASS;

  console.log(`📧 sendEmailNotification called → to: ${to} | brevoKey: ${brevoApiKey ? 'SET' : 'NOT SET'} | emailUser: ${emailUser || 'NOT SET'}`);

  // ── PATH 1: Brevo HTTP API (for Render / any cloud host) ──────────────────
  if (brevoApiKey) {
    const senderEmail = emailUser || 'noreply@servicehub.in';
    const payload = JSON.stringify({
      sender:      { name: 'ServiceHub', email: senderEmail },
      to:          [{ email: to }],
      subject,
      htmlContent: html
    });

    const options = {
      hostname: 'api.brevo.com',
      path:     '/v3/smtp/email',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Accept':         'application/json',
        'api-key':        brevoApiKey,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ Brevo email sent to ${to} (status ${res.statusCode})`);
          } else {
            console.error(`❌ Brevo API error (status ${res.statusCode}):`, body);
          }
          resolve();
        });
      });
      req.on('error', (err) => {
        console.error('❌ Brevo HTTPS request error:', err.message);
        resolve();
      });
      req.write(payload);
      req.end();
    });
  }

  // ── PATH 2: Nodemailer / Gmail (localhost only) ────────────────────────────
  if (!emailUser || !emailPass) {
    console.log(`✉️  [Mock Send — no credentials] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: emailUser, pass: emailPass }
    });
    await transporter.sendMail({
      from: `"ServiceHub" <${emailUser}>`,
      to, subject, html
    });
    console.log(`✅ Email sent via Nodemailer/Gmail to ${to}`);
  } catch (err) {
    console.error('❌ Nodemailer send failed:', err.message);
  }
};

// Create a notification in the DB and send an automated email to the user
const createAndSendNotification = async ({ userId, title, message, type, bookingId }) => {
  try {
    const notif = new Notification({ userId, title, message, type, bookingId });
    await notif.save();

    const user = await User.findById(userId);
    if (!user || !user.email) return notif;

    const emailHtml = `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f3f4f6; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">ServiceHub Notification</h2>
          <div style="height: 4px; width: 60px; background-color: #6366f1; margin: 8px auto 0 auto; border-radius: 2px;"></div>
        </div>
        
        <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #f3f4f6; margin-bottom: 24px;">
          <p style="font-size: 16px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 8px;">${title}</p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0;">${message}</p>
        </div>
        
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
          Sent automatically by ServiceHub. Please do not reply directly to this email.
        </p>
      </div>
    `;

    // Send email using Nodemailer helper in background (non-blocking)
    sendEmailNotification(user.email, `[ServiceHub] ${title}`, emailHtml).catch(err => {
      console.error('❌ Background email send failed:', err);
    });
    return notif;
  } catch (err) {
    console.error('Error in createAndSendNotification:', err);
  }
};

// --- AUTH API ---

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, phone, location, userType, upiId } = req.body;
    
    // Check if user exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      phone,
      location,
      userType: userType || 'customer',
      upiId: userType === 'provider' ? (upiId || '') : undefined,
      approved: userType === 'provider' ? false : true,
      services: userType === 'provider' ? [] : undefined,
      serviceAreas: userType === 'provider' ? [location] : undefined
    });

    await user.save();

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (!user.approved) {
      return res.status(403).json({ error: 'Your account is pending admin approval' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google Login
app.post('/api/auth/google', async (req, res) => {
  try {
    if (!googleClient || !GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google login is not configured' });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res.status(400).json({ error: 'Google account email is not verified' });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
      const generatedPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = new User({
        email,
        password: generatedPassword,
        name: payload.name || email.split('@')[0],
        phone: '',
        location: 'Chennai',
        userType: 'customer',
        authProvider: 'google',
        googleId: payload.sub,
        approved: true
      });
      await user.save();
    } else {
      let changed = false;
      if (!user.googleId) {
        user.googleId = payload.sub;
        changed = true;
      }
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        changed = true;
      }
      if (changed) await user.save();
    }

    if (!user.approved) {
      return res.status(403).json({ error: 'Your account is pending admin approval' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    console.error('Google login failed:', err);
    res.status(401).json({ error: 'Google login failed' });
  }
});

// Get profile
app.get('/api/auth/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile / provider details
app.put('/api/auth/profile', auth, async (req, res) => {
  try {
    const { name, phone, location, services, availability, serviceAreas, upiId } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (location !== undefined) updates.location = location;
    if (services !== undefined) updates.services = services;
    if (availability !== undefined) updates.availability = availability;
    if (serviceAreas !== undefined) updates.serviceAreas = serviceAreas;
    if (upiId !== undefined) updates.upiId = upiId;

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- PROVIDER API ---

// List providers
app.get('/api/providers', async (req, res) => {
  try {
    await checkAndDeactivateProviders();
    const providers = await User.find({ userType: 'provider', approved: true, isActive: true });
    
    // Attach dynamically calculated rating and reviews count
    const providersWithRatings = await Promise.all(providers.map(async (p) => {
      const pObj = p.toJSON();
      const reviews = await Review.find({ providerId: p.id });
      const totalReviews = reviews.length;
      const avgRating = totalReviews 
        ? +(reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
        : 4.5; // default fallback if no reviews
      
      return {
        ...pObj,
        rating: avgRating,
        reviewsCount: totalReviews
      };
    }));
    
    res.json(providersWithRatings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch provider billing status (MUST be before /:id wildcard)
app.get('/api/providers/billing-status', auth, async (req, res) => {
  try {
    await checkAndDeactivateProviders();
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'provider') {
      return res.status(400).json({ error: 'Provider profile required' });
    }

    // Find completed bookings since last activation date (must be Paid to count as earnings)
    const bookings = await Booking.find({
      providerId: req.userId,
      status: 'Completed',
      paymentStatus: 'Paid',
      createdAt: { $gte: user.lastActivationDate }
    });

    let earnings = 0;
    bookings.forEach(b => {
      const cleanPrice = b.price ? (parseInt(String(b.price).replace(/\D/g, '')) || 0) : 0;
      earnings += cleanPrice;
    });

    const msDiff = Date.now() - new Date(user.lastActivationDate).getTime();
    const daysPassed = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 30 - daysPassed);

    const amountDue = earnings >= 2000 ? Math.round(earnings * 0.1) : 0;

    res.json({
      isActive: user.isActive,
      lastActivationDate: user.lastActivationDate,
      earnings,
      daysRemaining,
      amountDue
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single provider
app.get('/api/providers/:id', async (req, res) => {
  try {
    await checkAndDeactivateProviders();
    const provider = await User.findOne({ _id: req.params.id, userType: 'provider', approved: true, isActive: true });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    
    const pObj = provider.toJSON();
    const reviews = await Review.find({ providerId: provider.id });
    const totalReviews = reviews.length;
    const avgRating = totalReviews 
      ? +(reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : 4.5;
      
    res.json({
      ...pObj,
      rating: avgRating,
      reviewsCount: totalReviews
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- BOOKINGS API ---

// List user's bookings (both customer & provider)
app.get('/api/bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [
        { userId: req.userId },
        { providerId: req.userId }
      ]
    }).sort({ createdAt: -1 });

    // Fetch and attach reviews for completed bookings
    const bookingsWithReviews = await Promise.all(bookings.map(async (b) => {
      const bObj = b.toJSON();
      if (b.status === 'Completed') {
        const review = await Review.findOne({ bookingId: b.id });
        if (review) {
          bObj.review = {
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt
          };
        }
      }
      return bObj;
    }));

    res.json(bookingsWithReviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create booking
app.post('/api/bookings', auth, async (req, res) => {
  try {
    const {
      providerId,
      providerName,
      serviceType,
      category,
      date,
      time,
      description,
      phone,
      location,
      price,
      customerName,
      customerEmail,
      advanceTransactionId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    } = req.body;

    // ─── SERVER-SIDE BOOKING VALIDATION ───────────────────────────────────────

    // 1. Parse the selected time string (e.g. "9:00 AM") into minutes since midnight
    const parseTimeToMinutes = (timeStr) => {
      const [timePart, ampm] = timeStr.trim().split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60 + (minutes || 0);
    };

    // 2. Validate that the booking date + time is not in the past (IST / UTC+5:30)
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(Date.now() + IST_OFFSET_MS);
    const todayStr = nowIST.toISOString().split('T')[0];

    if (date < todayStr) {
      return res.status(400).json({ error: 'Cannot book a date in the past.' });
    }

    const selectedMinutes = parseTimeToMinutes(time);
    if (date === todayStr) {
      const currentMinutes = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
      if (selectedMinutes < currentMinutes) {
        return res.status(400).json({ error: 'Cannot book a time slot that has already passed today.' });
      }
    }

    // 3. Validate provider availability (day off and working hours)
    if (mongoose.Types.ObjectId.isValid(providerId)) {
      const pUser = await User.findById(providerId);
      if (pUser) {
        const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const bookingDateObj = new Date(date + 'T00:00:00Z');
        const dayName = DAYS[bookingDateObj.getUTCDay()];

        const defaultAvailability = {
          Monday:    { start: '09:00', end: '18:00', enabled: true },
          Tuesday:   { start: '09:00', end: '18:00', enabled: true },
          Wednesday: { start: '09:00', end: '18:00', enabled: true },
          Thursday:  { start: '09:00', end: '18:00', enabled: true },
          Friday:    { start: '09:00', end: '18:00', enabled: true },
          Saturday:  { start: '09:00', end: '18:00', enabled: true },
          Sunday:    { start: '09:00', end: '18:00', enabled: false }
        };

        const avail = (pUser.availability && typeof pUser.availability === 'object')
          ? pUser.availability
          : defaultAvailability;

        const dayConfig = avail[dayName];

        if (!dayConfig || !dayConfig.enabled) {
          return res.status(400).json({ error: `${providerName} is not available on ${dayName}s.` });
        }

        const parse24h = (t) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + (m || 0);
        };

        const startMin = parse24h(dayConfig.start);
        const endMin   = parse24h(dayConfig.end);

        if (selectedMinutes < startMin || selectedMinutes > endMin) {
          return res.status(400).json({ error: `${providerName} is only available between ${dayConfig.start} and ${dayConfig.end} on ${dayName}s.` });
        }
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const trackingId = 'SH' + Date.now().toString().slice(-10);

    // Fetch provider UPI ID dynamically
    let finalProviderUpiId = '';
    if (mongoose.Types.ObjectId.isValid(providerId)) {
      const pUser = await User.findById(providerId);
      if (pUser) finalProviderUpiId = pUser.upiId || '';
    }

    // Verify Razorpay Payment Signature if provided
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keySecret && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(razorpayOrderId + '|' + razorpayPaymentId)
        .digest('hex');
      if (generated_signature !== razorpaySignature) {
        return res.status(400).json({ error: 'Payment signature validation failed' });
      }
    }

    const booking = new Booking({
      trackingId,
      userId: req.userId,
      providerId,
      providerName,
      serviceType,
      category,
      date,
      time,
      description,
      phone,
      location,
      price,
      customerName,
      customerEmail,
      status: 'Confirmed',
      currentStep: 0,
      advanceTransactionId: razorpayPaymentId || advanceTransactionId || '',
      providerUpiId: finalProviderUpiId,
      paymentStatus: 'Unpaid',
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || '',
      razorpaySignature: razorpaySignature || ''
    });

    await booking.save();

    // Create notification for Provider
    if (mongoose.Types.ObjectId.isValid(providerId)) {
      await createAndSendNotification({
        userId: providerId,
        title: '🎉 New Booking Received',
        message: `${customerName || 'A customer'} booked ${serviceType} on ${date} at ${time}`,
        type: 'booking_new',
        bookingId: booking.id
      });
    }

    // Create notification for Customer
    await createAndSendNotification({
      userId: req.userId,
      title: '✅ Booking Confirmed',
      message: `Your booking with ${providerName} is confirmed for ${date} at ${time}. Tracking: ${trackingId}`,
      type: 'booking_confirmed',
      bookingId: booking.id
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update booking status
app.put('/api/bookings/:id', auth, async (req, res) => {
  try {
    const { status, currentStep, date, time } = req.body;
    
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (currentStep !== undefined) updates.currentStep = currentStep;
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;

    const booking = await Booking.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Notify customer when provider updates status
    if (status && booking.userId !== req.userId) {
      await createAndSendNotification({
        userId: booking.userId,
        title: `📦 Booking ${status}`,
        message: `${booking.providerName} updated your ${booking.serviceType} booking to "${status}"`,
        type: 'booking_status',
        bookingId: booking.id
      });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel booking
app.put('/api/bookings/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'Cancelled', currentStep: -1 },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Notify provider if user cancelled
    if (booking.userId === req.userId && mongoose.Types.ObjectId.isValid(booking.providerId)) {
      await createAndSendNotification({
        userId: booking.providerId,
        title: '✕ Booking Cancelled',
        message: `${booking.customerName} cancelled the booking for ${booking.serviceType} on ${booking.date}`,
        type: 'booking_cancelled',
        bookingId: booking.id
      });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm booking final payment
app.put('/api/bookings/:id/pay', auth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'Paid' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Notify provider that payment is confirmed
    if (mongoose.Types.ObjectId.isValid(booking.providerId)) {
      await createAndSendNotification({
        userId: booking.providerId,
        title: '💰 Payment Confirmed',
        message: `${booking.customerName} has marked payment of ${booking.price} as Paid.`,
        type: 'booking_payment',
        bookingId: booking.id
      });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- NOTIFICATIONS API ---

// Fetch notifications
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notifications read
app.put('/api/notifications/read', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    const query = { userId: req.userId };
    if (ids && Array.isArray(ids) && ids.length > 0) {
      query._id = { $in: ids };
    }
    await Notification.updateMany(query, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear notifications
app.delete('/api/notifications', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- PROVIDER SUBSCRIPTION & BILLING API ---

// Create Razorpay Reactivation Order
app.post('/api/payments/create-reactivation-order', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'provider') {
      return res.status(400).json({ error: 'Provider profile required' });
    }

    // Calculate amount due (only counting bookings with completed paymentStatus: 'Paid')
    const bookings = await Booking.find({
      providerId: req.userId,
      status: 'Completed',
      paymentStatus: 'Paid',
      createdAt: { $gte: user.lastActivationDate }
    });

    let earnings = 0;
    bookings.forEach(b => {
      const cleanPrice = b.price ? (parseInt(String(b.price).replace(/\D/g, '')) || 0) : 0;
      earnings += cleanPrice;
    });

    const amountDue = earnings >= 2000 ? Math.round(earnings * 0.1) : 0;

    if (amountDue === 0) {
      return res.json({ free: true });
    }

    const options = {
      amount: amountDue * 100, // paise
      currency: 'INR',
      receipt: 'rect_act_' + Date.now().toString().slice(-8),
    };

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || keyId === '') {
      return res.json({
        id: 'order_mock_reactivate_' + Date.now().toString().slice(-8),
        amount: options.amount,
        currency: 'INR',
        mock: true,
        amountDue
      });
    }

    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create(options);
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId,
      amountDue
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reactivate Provider Account
app.post('/api/providers/reactivate', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'provider') {
      return res.status(400).json({ error: 'Provider profile required' });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Re-calculate amount due to verify (only counting bookings with completed paymentStatus: 'Paid')
    const bookings = await Booking.find({
      providerId: req.userId,
      status: 'Completed',
      paymentStatus: 'Paid',
      createdAt: { $gte: user.lastActivationDate }
    });

    let earnings = 0;
    bookings.forEach(b => {
      const cleanPrice = b.price ? (parseInt(String(b.price).replace(/\D/g, '')) || 0) : 0;
      earnings += cleanPrice;
    });

    const amountDue = earnings >= 2000 ? Math.round(earnings * 0.1) : 0;

    if (amountDue > 0) {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (keySecret && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
        const generated_signature = crypto
          .createHmac('sha256', keySecret)
          .update(razorpayOrderId + '|' + razorpayPaymentId)
          .digest('hex');
        if (generated_signature !== razorpaySignature) {
          return res.status(400).json({ error: 'Payment signature validation failed' });
        }
      }
    }

    // Update provider to be active
    const previousActivationDate = user.lastActivationDate;
    user.isActive = true;
    user.lastActivationDate = new Date();
    await user.save();

    // Persist reactivation payment record to DB
    const paymentType = amountDue === 0 ? 'free' : (razorpayPaymentId ? 'razorpay' : 'mock');
    const reactivationRecord = new ReactivationPayment({
      providerId: req.userId,
      providerName: user.name,
      providerEmail: user.email,
      cycleEarnings: earnings,
      amountDue,
      amountPaid: amountDue,
      paymentType,
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || '',
      razorpaySignature: razorpaySignature || '',
      status: 'success',
      previousActivationDate,
      newActivationDate: user.lastActivationDate
    });
    await reactivationRecord.save().catch(e => console.warn('ReactivationPayment save failed:', e));

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- RAZORPAY PAYMENT API ---

// Create Razorpay Order
app.post('/api/payments/create-order', auth, async (req, res) => {
  try {
    const { amount } = req.body; // In INR, e.g. 50
    const finalAmount = amount || 50;

    const options = {
      amount: finalAmount * 100, // Razorpay amount is in paise
      currency: 'INR',
      receipt: 'rcpt_' + Date.now().toString().slice(-8),
    };

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || keyId === '') {
      // Mock mode fallback for local sandbox/testing if key isn't provided
      return res.json({
        id: 'order_mock_' + Date.now().toString().slice(-8),
        amount: options.amount,
        currency: 'INR',
        mock: true
      });
    }

    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create(options);
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- ADMIN API ---

// List all providers for approval
app.get('/api/admin/providers', auth, adminOnly, async (req, res) => {
  try {
    const list = await User.find({ userType: 'provider' }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle provider approval
app.put('/api/admin/providers/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const { approved } = req.body;
    const provider = await User.findByIdAndUpdate(
      req.params.id,
      { approved: !!approved },
      { new: true }
    );
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    res.json(provider);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all payments ledger
app.get('/api/admin/payments', auth, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- CONTACT & NEWSLETTER API ---

// Submit contact form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const submission = new ContactSubmission({ name, email, subject, message });
    await submission.save();

    console.log(`[Contact Submission] from ${name} (${email}): ${subject}`);
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">New Contact Form Submission - ServiceHub</h2>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <p style="color: #666; font-size: 12px;">Sent from ServiceHub contact form</p>
      </div>
    `;

    // Send contact submission notification using custom transporter helper
    await sendEmailNotification('velr012006@gmail.com', `[ServiceHub Contact] ${subject}`, emailHtml);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subscribe to newsletter
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    try {
      const sub = new NewsletterSubscriber({ email: email.toLowerCase() });
      await sub.save();
      res.json({ success: true });
    } catch (e) {
      if (e.code === 11000) {
        // duplicate key
        return res.status(400).json({ code: 'DUPLICATE', error: 'Email already subscribed' });
      }
      throw e;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- SMART PRICING & AI API ---

// Smart pricing calculation (Discount-focused)
app.post('/api/pricing/smart-pricing', async (req, res) => {
  try {
    const { category, location, serviceType, basePrice, date, time } = req.body;

    // 1. Demand: recent bookings in same category + location in last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentBookings = await Booking.countDocuments({
      category,
      location,
      createdAt: { $gte: weekAgo }
    });

    // 2. Supply: available providers in that area
    const providerCount = await User.countDocuments({
      userType: 'provider',
      serviceAreas: location
    });

    // 3. Urgency / Advance Booking
    const daysUntil = Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    let urgencyMultiplier = 1.0;
    let urgencyFactor = null;
    if (daysUntil > 1) {
      urgencyMultiplier = 0.90; // 10% discount
      urgencyFactor = { name: "Advance Booking Discount", multiplier: urgencyMultiplier, reason: "10% off for booking ahead" };
    }

    // 4. Time-of-day / Off-Peak
    let timeMultiplier = 1.0;
    let timeFactor = null;
    if (time) {
      const hour = parseInt(time.split(':')[0]);
      if (!isNaN(hour) && hour >= 10 && hour <= 16) {
        timeMultiplier = 0.90; // 10% discount
        timeFactor = { name: "Off-Peak Happy Hour", multiplier: timeMultiplier, reason: "10% off between 10 AM - 4 PM" };
      }
    }

    // 5. Demand/Supply
    const demand = recentBookings;
    const supply = Math.max(providerCount, 1);
    const ratio = demand / supply;
    let demandMultiplier = 1.0;
    let demandFactor = null;
    if (ratio < 1.0) {
      demandMultiplier = 0.95; // 5% discount
      demandFactor = { name: "High Provider Availability", multiplier: demandMultiplier, reason: "5% off due to high local supply" };
    }

    // Flat smart booking discount
    const promoMultiplier = 0.95; // 5% off
    const promoFactor = { name: "Smart Booking Bonus", multiplier: promoMultiplier, reason: "5% off for online scheduling" };

    const factors = [];
    if (urgencyFactor) factors.push(urgencyFactor);
    if (timeFactor) factors.push(timeFactor);
    if (demandFactor) factors.push(demandFactor);
    factors.push(promoFactor);

    // Calculate final price
    const totalMultiplier = urgencyMultiplier * timeMultiplier * demandMultiplier * promoMultiplier;
    let finalPrice = Math.round(basePrice * totalMultiplier);

    // Cap the discount to be between 15 to 20 rupees only (as requested)
    const calculatedDiscount = basePrice - finalPrice;
    if (calculatedDiscount > 20) {
      finalPrice = basePrice - 18; // Capped discount of 18 rupees
    } else if (calculatedDiscount < 15 && calculatedDiscount > 0) {
      finalPrice = basePrice - 15; // Minimum discount of 15 rupees
    }

    const adjustedMultiplier = finalPrice / basePrice;

    // Map adjusted multiplier to savings level
    const surgeLevel = adjustedMultiplier <= 0.8 ? "high" : adjustedMultiplier <= 0.9 ? "medium" : adjustedMultiplier < 1.0 ? "low" : "none";

    // Adjust factors label percentages to match the adjusted final multiplier
    const scalingFactor = (1 - adjustedMultiplier) / (1 - totalMultiplier || 1);
    factors.forEach(f => {
      const discountPercentage = Math.max(1, Math.round((1 - f.multiplier) * 100 * scalingFactor));
      f.multiplier = 1 - (discountPercentage / 100);
      f.reason = `${discountPercentage}% off ${f.reason.substring(f.reason.indexOf('for') !== -1 ? f.reason.indexOf('for') : f.reason.indexOf('due') !== -1 ? f.reason.indexOf('due') : 0)}`;
    });

    const pricingResult = {
      basePrice,
      finalPrice,
      totalMultiplier: +adjustedMultiplier.toFixed(2),
      surgeLevel,
      factors,
      demandStats: { recentBookings, availableProviders: providerCount }
    };

    // Persist smart pricing log (fire-and-forget)
    new SmartPricingLog({
      userId: req.userId || null,
      category,
      location,
      serviceType,
      basePrice,
      finalPrice,
      discountAmount: basePrice - finalPrice,
      totalMultiplier: pricingResult.totalMultiplier,
      surgeLevel,
      bookingDate: date || '',
      bookingTime: time || '',
      factors,
      demandStats: { recentBookings, availableProviders: providerCount }
    }).save().catch(e => console.warn('SmartPricingLog save failed:', e));

    res.json(pricingResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: save AI diagnosis result to DB (fire-and-forget)
const saveAiDiagnosis = (userId, description, imageProvided, result, source) => {
  new AiDiagnosis({ userId: userId || null, description: description || '', imageProvided: !!imageProvided, source, result }).save()
    .catch(e => console.warn('AiDiagnosis save failed:', e));
};

// AI Diagnose
app.post('/api/ai/diagnose', async (req, res) => {
  try {
    const { imageBase64, description } = req.body;
    const apiKey = process.env.LOVABLE_API_KEY;
    // userId from auth token if present (optional auth)
    let userId = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) { const d = jwt.verify(token, JWT_SECRET); userId = d.id; }
    } catch (_) {}

    if (!imageBase64 && !description) {
      return res.status(400).json({ error: 'Please provide an image or description' });
    }

    const defaultSystemPrompt = `You are an expert home service diagnostic AI. Analyze the user's problem (from image and/or description) and return a JSON response with:
- "problem": A short title of the detected problem (e.g. "Leaking Kitchen Pipe")
- "category": One of: plumbing, electrical, cleaning, hvac, handyman, landscaping
- "severity": One of: low, medium, high, urgent
- "description": A 1-2 sentence explanation of the issue
- "suggestedServices": Array of 2-3 specific services needed
- "estimatedCost": Object with "min" and "max" (numbers in INR)
- "urgency": A sentence about how soon this should be fixed
- "tips": Array of 1-2 safety tips while waiting for the professional

Respond ONLY with valid JSON, no markdown.`;

    if (apiKey) {
      const messages = [
        { role: 'system', content: defaultSystemPrompt }
      ];

      const userContent = [];
      if (description) userContent.push({ type: 'text', text: description });
      if (imageBase64) {
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
        });
      }
      messages.push({ role: 'user', content: userContent });

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        let cleaned = content.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const parsed = JSON.parse(cleaned);
        saveAiDiagnosis(userId, description, !!imageBase64, parsed, 'ai');
        return res.json(parsed);
      }
      console.warn('Lovable gateway error, falling back to local simulation');
    }

    // Direct Gemini fallback if GEMINI_API_KEY is present
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      // Direct integration would involve google-generative-ai library or standard fetch.
      // For now, let's fall back to our local heuristics which is ultra fast and reliable in dev
    }

    // Heuristics-based local fallback
    const descLower = (description || '').toLowerCase();
    let category = 'handyman';
    let problem = 'Home Service Issue';
    let suggestedServices = ['General Handyman Work', 'Home inspection'];
    let minCost = 500;
    let maxCost = 1500;

    if (descLower.includes('leak') || descLower.includes('water') || descLower.includes('pipe') || descLower.includes('tap') || descLower.includes('clog')) {
      category = 'plumbing';
      problem = 'Plumbing Leak/Clog';
      suggestedServices = ['Pipe Repair', 'Leak Detection', 'Drain Unclogging'];
      minCost = 600;
      maxCost = 1800;
    } else if (descLower.includes('light') || descLower.includes('wire') || descLower.includes('power') || descLower.includes('shock') || descLower.includes('switch')) {
      category = 'electrical';
      problem = 'Electrical Fault';
      suggestedServices = ['Wiring Inspection', 'Switch Replacement', 'Short Circuit Repair'];
      minCost = 800;
      maxCost = 2500;
    } else if (descLower.includes('ac') || descLower.includes('cool') || descLower.includes('heat') || descLower.includes('fan') || descLower.includes('filter')) {
      category = 'hvac';
      problem = 'AC/HVAC Maintenance';
      suggestedServices = ['AC Service', 'Coolant Recharge', 'Filter Cleaning'];
      minCost = 1000;
      maxCost = 3000;
    } else if (descLower.includes('clean') || descLower.includes('dirt') || descLower.includes('wash') || descLower.includes('dust')) {
      category = 'cleaning';
      problem = 'Cleaning Requirement';
      suggestedServices = ['Deep Home Cleaning', 'Sofa/Carpet Cleaning', 'Bathroom Cleaning'];
      minCost = 1200;
      maxCost = 4000;
    } else if (descLower.includes('garden') || descLower.includes('grass') || descLower.includes('lawn') || descLower.includes('tree') || descLower.includes('plant')) {
      category = 'landscaping';
      problem = 'Lawn & Garden Care';
      suggestedServices = ['Lawn Mowing', 'Weed Control', 'Garden Trimming'];
      minCost = 450;
      maxCost = 1200;
    }

    const mockDiagnosis = {
      problem,
      category,
      severity: descLower.includes('urgent') || descLower.includes('burst') || descLower.includes('fire') ? 'urgent' : 'medium',
      description: description ? `AI Diagnostic: Analyzed issue: "${description}".` : 'AI Diagnostic: Visual analysis completed.',
      suggestedServices,
      estimatedCost: { min: minCost, max: maxCost },
      urgency: 'Recommended to resolve this in 24-48 hours to avoid secondary damages.',
      tips: [
        category === 'plumbing' ? 'Shut off the main water valve immediately.' :
        category === 'electrical' ? 'Switch off the main circuit breaker for safety.' :
        'Clear the area to allow easy access for the technician.'
      ]
    };

    saveAiDiagnosis(userId, description, !!imageBase64, mockDiagnosis, 'heuristic');
    res.json(mockDiagnosis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Match Providers
app.post('/api/ai/match-providers', async (req, res) => {
  try {
    const { category, location, severity, suggestedServices } = req.body;
    const apiKey = process.env.LOVABLE_API_KEY;
    // userId from auth token if present (optional auth)
    let userId = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) { const d = jwt.verify(token, JWT_SECRET); userId = d.id; }
    } catch (_) {}

    // Fetch matching providers from DB
    await checkAndDeactivateProviders();
    const dbProviders = await User.find({
      userType: 'provider',
      location,
      approved: true,
      isActive: true
    });

    const providerList = dbProviders.map(p => ({
      id: p.id,
      name: p.name,
      location: p.location,
      services: p.services || [],
      serviceAreas: p.serviceAreas || []
    }));

    // Helper to persist match log
    const saveMatchLog = (matches, source) => {
      new AiMatchLog({
        userId,
        category,
        location,
        severity,
        suggestedServices: suggestedServices || [],
        source,
        totalProvidersFound: dbProviders.length,
        matches: matches.map(m => ({ providerId: m.id, providerName: m.name, score: m.score, reason: m.reason }))
      }).save().catch(e => console.warn('AiMatchLog save failed:', e));
    };

    if (apiKey && providerList.length > 0) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            {
              role: 'system',
              content: `You are a workforce allocation AI. Given a service request and a list of providers, rank the top 5 best matches. Consider: service relevance, location proximity, completed jobs. Return JSON array with objects: { "id": string, "name": string, "score": number (0-100), "reason": string (1 sentence why they're a good match) }. Respond ONLY with valid JSON array.`
            },
            {
              role: 'user',
              content: JSON.stringify({
                request: { category, location, severity, suggestedServices },
                providers: providerList
              })
            }
          ]
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';
        let cleaned = content.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const matches = JSON.parse(cleaned);
        saveMatchLog(matches, 'ai');
        return res.json({ matches });
      }
    }

    // Smart Local Fallback Matching (If no API key or API fails)
    const matches = providerList
      .slice(0, 5)
      .map((p, index) => {
        const baseScore = 90 - index * 5;
        return {
          id: p.id,
          name: p.name,
          score: baseScore,
          reason: `Highly rated provider in ${location} specializing in ${category} services.`
        };
      });

    saveMatchLog(matches, 'local');
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- REVIEWS API ---

// Submit a review (customer only, one per completed booking)
app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating) {
      return res.status(400).json({ error: 'bookingId and rating are required' });
    }
    // Validate booking belongs to this customer and is completed
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId !== req.userId) return res.status(403).json({ error: 'Not your booking' });
    if (booking.status !== 'Completed') return res.status(400).json({ error: 'Can only review completed bookings' });

    // One review per booking enforced by unique index on bookingId
    const review = new Review({
      bookingId,
      customerId: req.userId,
      customerName: booking.customerName,
      providerId: booking.providerId,
      providerName: booking.providerName,
      rating: Math.min(5, Math.max(1, Number(rating))),
      comment: comment || '',
      serviceType: booking.serviceType,
      category: booking.category
    });
    await review.save();
    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'You already reviewed this booking' });
    res.status(500).json({ error: err.message });
  }
});

// Get reviews for a specific provider
app.get('/api/providers/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ providerId: req.params.id }).sort({ createdAt: -1 }).limit(50);
    const avgRating = reviews.length
      ? +(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : 0;
    res.json({ reviews, avgRating, totalReviews: reviews.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- ADMIN AUDIT LOGS ---

// Admin: view all AI diagnose sessions
app.get('/api/admin/ai-logs', auth, adminOnly, async (req, res) => {
  try {
    const diagnoses = await AiDiagnosis.find().sort({ createdAt: -1 }).limit(100);
    const matches = await AiMatchLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ diagnoses, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: view all reactivation payment records
app.get('/api/admin/reactivation-payments', auth, adminOnly, async (req, res) => {
  try {
    const payments = await ReactivationPayment.find().sort({ createdAt: -1 }).limit(200);
    const totalCommission = payments
      .filter(p => p.status === 'success')
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    res.json({ payments, totalCommission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: view all smart pricing logs
app.get('/api/admin/pricing-logs', auth, adminOnly, async (req, res) => {
  try {
    const logs = await SmartPricingLog.find().sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// --- UNIVERSAL SERVICE CATALOG API (Public) ---
// ═══════════════════════════════════════════════════════════════════════════

// GET all active categories
app.get('/api/service-catalog/categories', async (req, res) => {
  try {
    const categories = await ServiceCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET service items for a category
app.get('/api/service-catalog/categories/:categoryId/items', async (req, res) => {
  try {
    const items = await ServiceItem.find({ categoryId: req.params.categoryId, isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET work types for a service item
app.get('/api/service-catalog/items/:itemId/work-types', async (req, res) => {
  try {
    const workTypes = await WorkType.find({ serviceItemId: req.params.itemId, isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json(workTypes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET category by key (used by booking modal to look up category)
app.get('/api/service-catalog/category-by-key/:key', async (req, res) => {
  try {
    const cat = await ServiceCategory.findOne({ key: req.params.key.toLowerCase(), isActive: true });
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET provider pricing for a specific provider (customer booking modal)
app.get('/api/service-catalog/provider/:providerId/pricing', async (req, res) => {
  try {
    const pricing = await ProviderPricing.find({ providerId: req.params.providerId, isActive: true });
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — server-side booking price calculation (security: never trust client prices)
app.post('/api/pricing/calculate-booking', auth, async (req, res) => {
  try {
    const { providerId, serviceItems } = req.body;
    // serviceItems: [{ workTypeId, quantity }]
    if (!providerId || !Array.isArray(serviceItems) || serviceItems.length === 0) {
      return res.status(400).json({ error: 'providerId and serviceItems[] are required' });
    }

    const BOOKING_FEE = 50;
    const PLATFORM_FEE_RATE = 0.02; // 2% of subtotal

    let subtotal = 0;
    const calculatedItems = [];

    for (const si of serviceItems) {
      const { workTypeId, quantity = 1 } = si;
      if (!workTypeId) continue;

      // Look up provider's price
      const pricing = await ProviderPricing.findOne({ providerId, workTypeId, isActive: true });
      const wt = await WorkType.findById(workTypeId);
      const item = wt ? await ServiceItem.findById(wt.serviceItemId) : null;

      // Fallback to workType defaultPrice if provider hasn't set a price
      let unitPrice = 0;
      if (pricing) {
        unitPrice = pricing.price;
      } else if (wt && wt.defaultPrice > 0) {
        unitPrice = wt.defaultPrice;
      } else {
        // Last fallback: 0 (provider hasn't configured)
        unitPrice = 0;
      }

      const qty = Math.max(1, parseInt(quantity) || 1);
      const itemSubtotal = unitPrice * qty;
      subtotal += itemSubtotal;

      calculatedItems.push({
        serviceItemId:   item ? item.id : '',
        serviceItemName: item ? item.name : '',
        workTypeId,
        workTypeName:    wt ? wt.name : '',
        quantity:        qty,
        unitPrice,
        subtotal:        itemSubtotal,
        estimatedDuration: wt ? wt.estimatedDuration * qty : 60
      });
    }

    const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
    const grandTotal = subtotal + BOOKING_FEE + platformFee;
    const platformCommission = platformFee + BOOKING_FEE;
    const providerEarnings = subtotal - platformFee;

    res.json({
      serviceItems: calculatedItems,
      priceBreakdown: {
        subtotal,
        bookingFee: BOOKING_FEE,
        platformFee,
        taxes: 0,
        grandTotal,
        providerEarnings,
        platformCommission
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// --- PROVIDER PRICING MANAGEMENT API ---
// ═══════════════════════════════════════════════════════════════════════════

// GET my pricing list
app.get('/api/provider/pricing', auth, async (req, res) => {
  try {
    const pricing = await ProviderPricing.find({ providerId: req.userId }).sort({ categoryKey: 1, serviceItemKey: 1, workTypeKey: 1 });
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — add a new price entry
app.post('/api/provider/pricing', auth, async (req, res) => {
  try {
    const { categoryId, categoryKey, categoryName, serviceItemId, serviceItemName, serviceItemKey, workTypeId, workTypeName, workTypeKey, price } = req.body;
    if (!workTypeId || price === undefined || price === null) {
      return res.status(400).json({ error: 'workTypeId and price are required' });
    }

    // Fetch estimatedDuration from WorkType
    const wt = await WorkType.findById(workTypeId);
    const estimatedDuration = wt ? wt.estimatedDuration : 60;

    const entry = new ProviderPricing({
      providerId: req.userId,
      categoryId, categoryKey, categoryName,
      serviceItemId, serviceItemName, serviceItemKey,
      workTypeId, workTypeName, workTypeKey,
      estimatedDuration,
      price: Math.max(0, Number(price)),
      isActive: true
    });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Price for this work type already exists. Use edit to update it.' });
    res.status(500).json({ error: err.message });
  }
});

// PUT — edit a price entry
app.put('/api/provider/pricing/:id', auth, async (req, res) => {
  try {
    const entry = await ProviderPricing.findOne({ _id: req.params.id, providerId: req.userId });
    if (!entry) return res.status(404).json({ error: 'Pricing entry not found' });

    const { price, isActive } = req.body;
    if (price !== undefined) entry.price = Math.max(0, Number(price));
    if (isActive !== undefined) entry.isActive = !!isActive;
    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE — remove a price entry
app.delete('/api/provider/pricing/:id', auth, async (req, res) => {
  try {
    const result = await ProviderPricing.deleteOne({ _id: req.params.id, providerId: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Pricing entry not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT — toggle enable/disable a price entry
app.put('/api/provider/pricing/:id/toggle', auth, async (req, res) => {
  try {
    const entry = await ProviderPricing.findOne({ _id: req.params.id, providerId: req.userId });
    if (!entry) return res.status(404).json({ error: 'Pricing entry not found' });
    entry.isActive = !entry.isActive;
    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT — bulk update all prices by percentage
app.put('/api/provider/pricing/bulk-update', auth, async (req, res) => {
  try {
    const { percentage, categoryId } = req.body; // percentage: e.g. 10 means +10%, -5 means -5%
    if (percentage === undefined) return res.status(400).json({ error: 'percentage is required' });

    const query = { providerId: req.userId };
    if (categoryId) query.categoryId = categoryId;

    const entries = await ProviderPricing.find(query);
    const multiplier = 1 + (Number(percentage) / 100);

    const updates = entries.map(e => ({
      updateOne: {
        filter: { _id: e._id },
        update: { $set: { price: Math.max(0, Math.round(e.price * multiplier)) } }
      }
    }));

    if (updates.length > 0) await ProviderPricing.bulkWrite(updates);
    res.json({ updated: updates.length, percentage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// --- ADMIN SERVICE CATALOG MANAGEMENT API ---
// ═══════════════════════════════════════════════════════════════════════════

// ─── CATEGORIES ────────────────────────────────────────────────────────────

app.get('/api/admin/service-catalog/categories', auth, adminOnly, async (req, res) => {
  try {
    const cats = await ServiceCategory.find().sort({ sortOrder: 1, name: 1 });
    // Attach counts
    const result = await Promise.all(cats.map(async c => {
      const itemCount = await ServiceItem.countDocuments({ categoryId: c._id });
      return { ...c.toJSON(), itemCount };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/service-catalog/categories', auth, adminOnly, async (req, res) => {
  try {
    const { name, key, icon, description, sortOrder } = req.body;
    if (!name || !key) return res.status(400).json({ error: 'name and key are required' });
    const cat = new ServiceCategory({ name, key: key.toLowerCase().replace(/\s+/g, '_'), icon: icon || '🔧', description: description || '', sortOrder: sortOrder || 0 });
    await cat.save();
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Category key already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/service-catalog/categories/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, icon, description, isActive, sortOrder } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (icon !== undefined) updates.icon = icon;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = !!isActive;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    const cat = await ServiceCategory.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/service-catalog/categories/:id', auth, adminOnly, async (req, res) => {
  try {
    // Cascade delete: remove items and work types under this category
    const items = await ServiceItem.find({ categoryId: req.params.id });
    const itemIds = items.map(i => i._id);
    await WorkType.deleteMany({ serviceItemId: { $in: itemIds } });
    await ServiceItem.deleteMany({ categoryId: req.params.id });
    await ServiceCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SERVICE ITEMS ─────────────────────────────────────────────────────────

app.get('/api/admin/service-catalog/items', auth, adminOnly, async (req, res) => {
  try {
    const { categoryId } = req.query;
    const query = categoryId ? { categoryId } : {};
    const items = await ServiceItem.find(query).sort({ sortOrder: 1, name: 1 });
    const result = await Promise.all(items.map(async i => {
      const wtCount = await WorkType.countDocuments({ serviceItemId: i._id });
      return { ...i.toJSON(), wtCount };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/service-catalog/items', auth, adminOnly, async (req, res) => {
  try {
    const { categoryId, name, key, description, unit, sortOrder } = req.body;
    if (!categoryId || !name || !key) return res.status(400).json({ error: 'categoryId, name and key are required' });
    const cat = await ServiceCategory.findById(categoryId);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    const item = new ServiceItem({ categoryId, categoryKey: cat.key, name, key: key.toLowerCase().replace(/\s+/g, '_'), description: description || '', unit: unit || 'unit', sortOrder: sortOrder || 0 });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Item key already exists in this category' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/service-catalog/items/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, unit, isActive, sortOrder } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (unit !== undefined) updates.unit = unit;
    if (isActive !== undefined) updates.isActive = !!isActive;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    const item = await ServiceItem.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!item) return res.status(404).json({ error: 'Service item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/service-catalog/items/:id', auth, adminOnly, async (req, res) => {
  try {
    await WorkType.deleteMany({ serviceItemId: req.params.id });
    await ServiceItem.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WORK TYPES ────────────────────────────────────────────────────────────

app.get('/api/admin/service-catalog/work-types', auth, adminOnly, async (req, res) => {
  try {
    const { serviceItemId } = req.query;
    const query = serviceItemId ? { serviceItemId } : {};
    const wts = await WorkType.find(query).sort({ sortOrder: 1, name: 1 });
    res.json(wts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/service-catalog/work-types', auth, adminOnly, async (req, res) => {
  try {
    const { serviceItemId, name, key, description, estimatedDuration, defaultPrice, sortOrder } = req.body;
    if (!serviceItemId || !name || !key) return res.status(400).json({ error: 'serviceItemId, name and key are required' });
    const item = await ServiceItem.findById(serviceItemId);
    if (!item) return res.status(404).json({ error: 'Service item not found' });
    const wt = new WorkType({ serviceItemId, categoryId: item.categoryId, categoryKey: item.categoryKey, itemKey: item.key, name, key: key.toLowerCase().replace(/\s+/g, '_'), description: description || '', estimatedDuration: estimatedDuration || 60, defaultPrice: defaultPrice || 0, sortOrder: sortOrder || 0 });
    await wt.save();
    res.status(201).json(wt);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Work type key already exists for this item' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/service-catalog/work-types/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, estimatedDuration, defaultPrice, isActive, sortOrder } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (estimatedDuration !== undefined) updates.estimatedDuration = estimatedDuration;
    if (defaultPrice !== undefined) updates.defaultPrice = defaultPrice;
    if (isActive !== undefined) updates.isActive = !!isActive;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    const wt = await WorkType.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!wt) return res.status(404).json({ error: 'Work type not found' });
    res.json(wt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/service-catalog/work-types/:id', auth, adminOnly, async (req, res) => {
  try {
    await WorkType.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Serve React build static assets in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Fallback if client is deployed separately (e.g. Netlify)
    app.get('/', (req, res) => {
      res.send(`
        <div style="font-family: system-ui, sans-serif; text-align: center; padding: 3rem; background: #fafafa; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
          <div style="max-width: 600px; width: 100%; background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
            <h1 style="color: #4f46e5; margin-bottom: 0.5rem; font-size: 2rem; font-weight: 800; letter-spacing: -0.025em;">🚀 ServiceHub API</h1>
            <p style="color: #4b5563; font-size: 1.125rem; margin-bottom: 1.5rem; font-weight: 500;">The backend server is active and running successfully!</p>
            <div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; margin-bottom: 2rem;">
              🟢 Connected to MongoDB Atlas
            </div>
            <p style="color: #6b7280; font-size: 0.875rem; line-height: 1.5;">Please access the platform using your frontend application URL deployed on Netlify.</p>
          </div>
        </div>
      `);
    });
  }
}

// Connect MongoDB and Seed default providers
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Seed admin user with custom credentials
    const adminEmail = 'velr012006@gmail.com';
    const oldAdminEmail = 'admin@servicehub.com';
    await User.deleteOne({ email: oldAdminEmail });
    
    const adminUserExists = await User.findOne({ email: adminEmail });
    if (!adminUserExists) {
      console.log('🌱 Seeding default Admin profile into MongoDB...');
      const adminPasswordHash = await bcrypt.hash('velraj2006', 10);
      const adminUser = new User({
        name: 'ServiceHub Admin',
        email: adminEmail,
        phone: '+91 99999 99999',
        location: 'Chennai',
        userType: 'admin',
        password: adminPasswordHash,
        approved: true
      });
      await adminUser.save();
      console.log(`🌱 Seeded default Admin user: ${adminEmail} / velraj2006`);
    } else {
      const adminPasswordHash = await bcrypt.hash('velraj2006', 10);
      adminUserExists.password = adminPasswordHash;
      await adminUserExists.save();
      console.log(`🌱 Updated Admin credentials: ${adminEmail} / velraj2006`);
    }

    // ── Seed Service Catalog if empty ────────────────────────────────────
    const catalogCount = await ServiceCategory.countDocuments();
    if (catalogCount === 0) {
      console.log('🌱 Seeding Universal Service Catalog...');

      const catalogData = [
        {
          name: 'Electrical', key: 'electrical', icon: '⚡', description: 'Wiring, repairs & safety inspections',
          items: [
            { name: 'Fan', key: 'fan', unit: 'unit', workTypes: [
              { name: 'Installation', key: 'installation', duration: 60, defaultPrice: 300 },
              { name: 'Repair', key: 'repair', duration: 45, defaultPrice: 200 },
              { name: 'Replacement', key: 'replacement', duration: 60, defaultPrice: 350 },
              { name: 'Inspection', key: 'inspection', duration: 30, defaultPrice: 150 },
              { name: 'Maintenance', key: 'maintenance', duration: 45, defaultPrice: 220 },
            ]},
            { name: 'Switch', key: 'switch', unit: 'unit', workTypes: [
              { name: 'Installation', key: 'installation', duration: 30, defaultPrice: 120 },
              { name: 'Repair', key: 'repair', duration: 20, defaultPrice: 80 },
              { name: 'Replacement', key: 'replacement', duration: 30, defaultPrice: 150 },
            ]},
            { name: 'Socket', key: 'socket', unit: 'unit', workTypes: [
              { name: 'Installation', key: 'installation', duration: 30, defaultPrice: 130 },
              { name: 'Repair', key: 'repair', duration: 20, defaultPrice: 90 },
              { name: 'Replacement', key: 'replacement', duration: 30, defaultPrice: 160 },
            ]},
            { name: 'Light', key: 'light', unit: 'unit', workTypes: [
              { name: 'Installation', key: 'installation', duration: 30, defaultPrice: 180 },
              { name: 'Repair', key: 'repair', duration: 20, defaultPrice: 120 },
              { name: 'Replacement', key: 'replacement', duration: 30, defaultPrice: 200 },
            ]},
            { name: 'MCB / Fuse', key: 'mcb', unit: 'unit', workTypes: [
              { name: 'Replacement', key: 'replacement', duration: 45, defaultPrice: 250 },
              { name: 'Inspection', key: 'inspection', duration: 30, defaultPrice: 150 },
            ]},
            { name: 'Wiring', key: 'wiring', unit: 'meter', workTypes: [
              { name: 'New Wiring', key: 'new_wiring', duration: 120, defaultPrice: 400 },
              { name: 'Re-Wiring', key: 're_wiring', duration: 90, defaultPrice: 350 },
              { name: 'Short Circuit Repair', key: 'short_circuit', duration: 60, defaultPrice: 500 },
            ]},
          ]
        },
        {
          name: 'Plumbing', key: 'plumbing', icon: '🔧', description: 'Pipe repairs, installations & drain cleaning',
          items: [
            { name: 'Tap / Faucet', key: 'tap', unit: 'unit', workTypes: [
              { name: 'Installation', key: 'installation', duration: 30, defaultPrice: 200 },
              { name: 'Repair', key: 'repair', duration: 20, defaultPrice: 150 },
              { name: 'Replacement', key: 'replacement', duration: 45, defaultPrice: 250 },
            ]},
            { name: 'Pipe', key: 'pipe', unit: 'meter', workTypes: [
              { name: 'Leak Repair', key: 'leak_repair', duration: 45, defaultPrice: 300 },
              { name: 'Installation', key: 'installation', duration: 60, defaultPrice: 400 },
              { name: 'Replacement', key: 'replacement', duration: 60, defaultPrice: 450 },
              { name: 'Cleaning', key: 'cleaning', duration: 30, defaultPrice: 200 },
            ]},
            { name: 'Toilet', key: 'toilet', unit: 'unit', workTypes: [
              { name: 'Installation', key: 'installation', duration: 90, defaultPrice: 800 },
              { name: 'Repair', key: 'repair', duration: 45, defaultPrice: 400 },
              { name: 'Unclogging', key: 'unclogging', duration: 30, defaultPrice: 250 },
            ]},
            { name: 'Wash Basin', key: 'wash_basin', unit: 'unit', workTypes: [
              { name: 'Installation', key: 'installation', duration: 60, defaultPrice: 500 },
              { name: 'Repair', key: 'repair', duration: 30, defaultPrice: 250 },
            ]},
            { name: 'Water Tank', key: 'water_tank', unit: 'unit', workTypes: [
              { name: 'Cleaning', key: 'cleaning', duration: 60, defaultPrice: 600 },
              { name: 'Installation', key: 'installation', duration: 120, defaultPrice: 1200 },
              { name: 'Repair', key: 'repair', duration: 45, defaultPrice: 400 },
            ]},
            { name: 'Drain', key: 'drain', unit: 'unit', workTypes: [
              { name: 'Unclogging', key: 'unclogging', duration: 30, defaultPrice: 300 },
              { name: 'Cleaning', key: 'cleaning', duration: 45, defaultPrice: 350 },
            ]},
          ]
        },
        {
          name: 'Cleaning', key: 'cleaning', icon: '🧹', description: 'Deep cleaning, regular & office cleaning',
          items: [
            { name: 'Kitchen', key: 'kitchen', unit: 'room', workTypes: [
              { name: 'Basic Cleaning', key: 'basic_cleaning', duration: 60, defaultPrice: 500 },
              { name: 'Deep Cleaning', key: 'deep_cleaning', duration: 120, defaultPrice: 1200 },
              { name: 'Sanitization', key: 'sanitization', duration: 90, defaultPrice: 900 },
            ]},
            { name: 'Bathroom', key: 'bathroom', unit: 'unit', workTypes: [
              { name: 'Basic Cleaning', key: 'basic_cleaning', duration: 30, defaultPrice: 300 },
              { name: 'Deep Cleaning', key: 'deep_cleaning', duration: 60, defaultPrice: 700 },
              { name: 'Sanitization', key: 'sanitization', duration: 45, defaultPrice: 500 },
            ]},
            { name: 'Bedroom', key: 'bedroom', unit: 'room', workTypes: [
              { name: 'Basic Cleaning', key: 'basic_cleaning', duration: 45, defaultPrice: 400 },
              { name: 'Deep Cleaning', key: 'deep_cleaning', duration: 90, defaultPrice: 900 },
            ]},
            { name: 'Office', key: 'office', unit: 'sq ft', workTypes: [
              { name: 'Regular Cleaning', key: 'regular_cleaning', duration: 60, defaultPrice: 600 },
              { name: 'Deep Cleaning', key: 'deep_cleaning', duration: 120, defaultPrice: 1500 },
            ]},
            { name: 'Sofa', key: 'sofa', unit: 'unit', workTypes: [
              { name: 'Shampooing', key: 'shampooing', duration: 60, defaultPrice: 800 },
              { name: 'Deep Cleaning', key: 'deep_cleaning', duration: 90, defaultPrice: 1200 },
            ]},
            { name: 'Carpet', key: 'carpet', unit: 'sq ft', workTypes: [
              { name: 'Vacuuming', key: 'vacuuming', duration: 30, defaultPrice: 300 },
              { name: 'Shampooing', key: 'shampooing', duration: 60, defaultPrice: 700 },
            ]},
          ]
        },
        {
          name: 'AC Service', key: 'hvac', icon: '❄️', description: 'AC repair, installation & maintenance',
          items: [
            { name: 'Indoor Unit', key: 'indoor_unit', unit: 'unit', workTypes: [
              { name: 'General Service', key: 'general_service', duration: 60, defaultPrice: 800 },
              { name: 'Deep Cleaning', key: 'deep_cleaning', duration: 90, defaultPrice: 1200 },
              { name: 'Installation', key: 'installation', duration: 120, defaultPrice: 1500 },
              { name: 'Repair', key: 'repair', duration: 60, defaultPrice: 1000 },
            ]},
            { name: 'Outdoor Unit', key: 'outdoor_unit', unit: 'unit', workTypes: [
              { name: 'General Service', key: 'general_service', duration: 60, defaultPrice: 600 },
              { name: 'Installation', key: 'installation', duration: 90, defaultPrice: 1200 },
            ]},
            { name: 'Gas Refilling', key: 'gas_line', unit: 'unit', workTypes: [
              { name: 'Gas Refilling', key: 'gas_refilling', duration: 60, defaultPrice: 2000 },
              { name: 'Gas Leak Check', key: 'gas_leak_check', duration: 30, defaultPrice: 500 },
            ]},
            { name: 'Filters', key: 'filters', unit: 'unit', workTypes: [
              { name: 'Filter Cleaning', key: 'filter_cleaning', duration: 30, defaultPrice: 300 },
              { name: 'Filter Replacement', key: 'filter_replacement', duration: 30, defaultPrice: 500 },
            ]},
            { name: 'PCB / Compressor', key: 'compressor', unit: 'unit', workTypes: [
              { name: 'PCB Repair', key: 'pcb_repair', duration: 120, defaultPrice: 2500 },
              { name: 'Compressor Replacement', key: 'compressor_replacement', duration: 180, defaultPrice: 5000 },
            ]},
          ]
        },
        {
          name: 'Painting', key: 'painter', icon: '🎨', description: 'Interior, exterior & waterproof painting',
          items: [
            { name: 'Interior Wall', key: 'interior_wall', unit: 'sq ft', workTypes: [
              { name: 'Painting', key: 'painting', duration: 60, defaultPrice: 15 },
              { name: 'Repainting', key: 'repainting', duration: 60, defaultPrice: 12 },
              { name: 'Wall Putty', key: 'wall_putty', duration: 45, defaultPrice: 10 },
              { name: 'Touch Up', key: 'touch_up', duration: 30, defaultPrice: 8 },
            ]},
            { name: 'Exterior Wall', key: 'exterior_wall', unit: 'sq ft', workTypes: [
              { name: 'Painting', key: 'painting', duration: 60, defaultPrice: 20 },
              { name: 'Waterproof Coating', key: 'waterproof_coating', duration: 60, defaultPrice: 25 },
              { name: 'Primer', key: 'primer', duration: 45, defaultPrice: 8 },
            ]},
            { name: 'Ceiling', key: 'ceiling', unit: 'sq ft', workTypes: [
              { name: 'Painting', key: 'painting', duration: 60, defaultPrice: 18 },
              { name: 'Whitewash', key: 'whitewash', duration: 45, defaultPrice: 12 },
            ]},
            { name: 'Wood / Furniture', key: 'wood', unit: 'unit', workTypes: [
              { name: 'Polish', key: 'polish', duration: 60, defaultPrice: 500 },
              { name: 'Painting', key: 'painting', duration: 60, defaultPrice: 400 },
              { name: 'Varnish', key: 'varnish', duration: 60, defaultPrice: 450 },
            ]},
            { name: 'Metal', key: 'metal', unit: 'unit', workTypes: [
              { name: 'Anti-Rust Coat', key: 'anti_rust', duration: 60, defaultPrice: 350 },
              { name: 'Painting', key: 'painting', duration: 60, defaultPrice: 300 },
            ]},
          ]
        },
        {
          name: 'Landscaping', key: 'landscaping', icon: '🌿', description: 'Lawn care, garden design & trimming',
          items: [
            { name: 'Lawn', key: 'lawn', unit: 'sq ft', workTypes: [
              { name: 'Grass Cutting', key: 'grass_cutting', duration: 60, defaultPrice: 5 },
              { name: 'Weed Removal', key: 'weed_removal', duration: 45, defaultPrice: 4 },
              { name: 'Fertilizing', key: 'fertilizing', duration: 30, defaultPrice: 3 },
            ]},
            { name: 'Garden', key: 'garden', unit: 'unit', workTypes: [
              { name: 'Garden Design', key: 'garden_design', duration: 180, defaultPrice: 2000 },
              { name: 'Garden Cleaning', key: 'garden_cleaning', duration: 90, defaultPrice: 800 },
              { name: 'Maintenance', key: 'maintenance', duration: 60, defaultPrice: 600 },
            ]},
            { name: 'Trees', key: 'trees', unit: 'unit', workTypes: [
              { name: 'Tree Trimming', key: 'tree_trimming', duration: 60, defaultPrice: 500 },
              { name: 'Tree Removal', key: 'tree_removal', duration: 120, defaultPrice: 1500 },
            ]},
            { name: 'Plants', key: 'plants', unit: 'unit', workTypes: [
              { name: 'Planting', key: 'planting', duration: 30, defaultPrice: 200 },
              { name: 'Repotting', key: 'repotting', duration: 20, defaultPrice: 150 },
            ]},
            { name: 'Hedges', key: 'hedges', unit: 'meter', workTypes: [
              { name: 'Trimming', key: 'trimming', duration: 60, defaultPrice: 300 },
              { name: 'Shaping', key: 'shaping', duration: 60, defaultPrice: 350 },
            ]},
          ]
        },
        {
          name: 'Handyman', key: 'handyman', icon: '🔨', description: 'Repairs, assembly & installations',
          items: [
            { name: 'Furniture', key: 'furniture', unit: 'unit', workTypes: [
              { name: 'Assembly', key: 'assembly', duration: 60, defaultPrice: 500 },
              { name: 'Repair', key: 'repair', duration: 45, defaultPrice: 350 },
              { name: 'Disassembly', key: 'disassembly', duration: 30, defaultPrice: 250 },
            ]},
            { name: 'Door / Window', key: 'door_window', unit: 'unit', workTypes: [
              { name: 'Repair', key: 'repair', duration: 45, defaultPrice: 400 },
              { name: 'Installation', key: 'installation', duration: 90, defaultPrice: 800 },
              { name: 'Lock Replacement', key: 'lock_replacement', duration: 30, defaultPrice: 300 },
            ]},
            { name: 'Shelving / Mounting', key: 'shelving', unit: 'unit', workTypes: [
              { name: 'TV Mounting', key: 'tv_mounting', duration: 45, defaultPrice: 400 },
              { name: 'Shelf Installation', key: 'shelf_installation', duration: 30, defaultPrice: 300 },
            ]},
            { name: 'Wall / Ceiling', key: 'wall', unit: 'sq ft', workTypes: [
              { name: 'Crack Filling', key: 'crack_filling', duration: 30, defaultPrice: 200 },
              { name: 'Tile Repair', key: 'tile_repair', duration: 45, defaultPrice: 350 },
            ]},
          ]
        },
        {
          name: 'CCTV', key: 'cctv', icon: '📷', description: 'CCTV installation and maintenance',
          items: [
            { name: 'Camera', key: 'camera', unit: 'unit', workTypes: [
              { name: 'Installation', key: 'installation', duration: 60, defaultPrice: 800 },
              { name: 'Replacement', key: 'replacement', duration: 60, defaultPrice: 700 },
              { name: 'Repositioning', key: 'repositioning', duration: 30, defaultPrice: 300 },
            ]},
            { name: 'DVR / NVR', key: 'dvr_nvr', unit: 'unit', workTypes: [
              { name: 'Setup & Config', key: 'setup_config', duration: 90, defaultPrice: 1000 },
              { name: 'Repair', key: 'repair', duration: 60, defaultPrice: 800 },
            ]},
            { name: 'Wiring', key: 'wiring', unit: 'meter', workTypes: [
              { name: 'Cable Laying', key: 'cable_laying', duration: 60, defaultPrice: 300 },
            ]},
          ]
        },
        {
          name: 'RO Water', key: 'ro_water', icon: '💧', description: 'RO repair, installation & AMC',
          items: [
            { name: 'RO Unit', key: 'ro_unit', unit: 'unit', workTypes: [
              { name: 'Installation', key: 'installation', duration: 90, defaultPrice: 1500 },
              { name: 'Repair', key: 'repair', duration: 60, defaultPrice: 800 },
              { name: 'General Service', key: 'general_service', duration: 60, defaultPrice: 600 },
            ]},
            { name: 'Filters', key: 'filters', unit: 'unit', workTypes: [
              { name: 'Filter Replacement', key: 'filter_replacement', duration: 30, defaultPrice: 500 },
              { name: 'Membrane Replacement', key: 'membrane_replacement', duration: 45, defaultPrice: 800 },
            ]},
          ]
        },
        {
          name: 'Beauty', key: 'beauty', icon: '💅', description: 'Salon at home — book instantly',
          items: [
            { name: 'Hair', key: 'hair', unit: 'session', workTypes: [
              { name: 'Hair Cut', key: 'hair_cut', duration: 30, defaultPrice: 200 },
              { name: 'Hair Color', key: 'hair_color', duration: 90, defaultPrice: 800 },
              { name: 'Hair Spa', key: 'hair_spa', duration: 60, defaultPrice: 600 },
            ]},
            { name: 'Facial', key: 'facial', unit: 'session', workTypes: [
              { name: 'Basic Facial', key: 'basic_facial', duration: 45, defaultPrice: 400 },
              { name: 'Gold Facial', key: 'gold_facial', duration: 60, defaultPrice: 800 },
            ]},
            { name: 'Waxing', key: 'waxing', unit: 'session', workTypes: [
              { name: 'Full Arms', key: 'full_arms', duration: 20, defaultPrice: 150 },
              { name: 'Full Legs', key: 'full_legs', duration: 30, defaultPrice: 250 },
            ]},
          ]
        },
        {
          name: 'Vehicle Repair', key: 'vehicle_repair', icon: '🔧', description: 'Bike & car service at your doorstep',
          items: [
            { name: 'Bike', key: 'bike', unit: 'unit', workTypes: [
              { name: 'General Service', key: 'general_service', duration: 60, defaultPrice: 500 },
              { name: 'Oil Change', key: 'oil_change', duration: 30, defaultPrice: 200 },
              { name: 'Tyre Change', key: 'tyre_change', duration: 20, defaultPrice: 150 },
            ]},
            { name: 'Car', key: 'car', unit: 'unit', workTypes: [
              { name: 'General Service', key: 'general_service', duration: 120, defaultPrice: 1500 },
              { name: 'Oil Change', key: 'oil_change', duration: 45, defaultPrice: 500 },
              { name: 'Battery Replacement', key: 'battery_replacement', duration: 30, defaultPrice: 1000 },
            ]},
          ]
        },
      ];

      let catOrder = 0;
      for (const catData of catalogData) {
        const cat = new ServiceCategory({ name: catData.name, key: catData.key, icon: catData.icon, description: catData.description, isActive: true, sortOrder: catOrder++ });
        await cat.save();
        let itemOrder = 0;
        for (const itemData of catData.items) {
          const item = new ServiceItem({ categoryId: cat._id, categoryKey: cat.key, name: itemData.name, key: itemData.key, unit: itemData.unit, isActive: true, sortOrder: itemOrder++ });
          await item.save();
          let wtOrder = 0;
          for (const wtData of itemData.workTypes) {
            const wt = new WorkType({ serviceItemId: item._id, categoryId: cat._id, categoryKey: cat.key, itemKey: item.key, name: wtData.name, key: wtData.key, estimatedDuration: wtData.duration, defaultPrice: wtData.defaultPrice, isActive: true, sortOrder: wtOrder++ });
            await wt.save();
          }
        }
      }
      console.log('🌱 Service Catalog seeded successfully!');
    }

    // Seed default providers if none exist
    const count = await User.countDocuments({ userType: 'provider' });
    if (count === 0) {
      console.log('🌱 Seeding default provider profiles into MongoDB...');
      
      const districts = [
        'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
        'Erode', 'Tirunelveli', 'Vellore', 'Thoothukudi', 'Dindigul',
        'Thanjavur', 'Ranipet', 'Sivaganga', 'Karur', 'Namakkal',
        'Nilgiris', 'Cuddalore', 'Dharmapuri', 'Kancheepuram', 'Krishnagiri'
      ];

      const categories = [
        { key: 'plumbing', name: 'Plumber', services: [{ name: 'Pipe Repair', price: '600' }, { name: 'Installation', price: '800' }, { name: 'Drain Cleaning', price: '500' }] },
        { key: 'electrical', name: 'Electrician', services: [{ name: 'Wiring Faults', price: '700' }, { name: 'Switch Install', price: '450' }, { name: 'Short Circuit Repair', price: '900' }] },
        { key: 'cleaning', name: 'Cleaner', services: [{ name: 'Deep Home Cleaning', price: '1500' }, { name: 'Bathroom Clean', price: '600' }, { name: 'Regular Cleaning', price: '1000' }] },
        { key: 'hvac', name: 'HVAC Tech', services: [{ name: 'AC Service', price: '800' }, { name: 'AC Installation', price: '1500' }, { name: 'Gas Recharge', price: '2000' }] },
        { key: 'handyman', name: 'Handyman', services: [{ name: 'Furniture assembly', price: '500' }, { name: 'General Repairs', price: '450' }, { name: 'Painting service', price: '1200' }] },
        { key: 'landscaping', name: 'Landscaper', services: [{ name: 'Lawn Mowing', price: '400' }, { name: 'Weeding & Pruning', price: '500' }, { name: 'Garden Layout', price: '1500' }] }
      ];

      const providersToSeed = [];
      const defaultPasswordHash = await bcrypt.hash('password123', 10);

      // Create a provider for each category in each district
      for (const dist of districts) {
        for (const cat of categories) {
          const email = `${dist.toLowerCase().replace(/\s/g, '')}.${cat.key}@example.com`;
          providersToSeed.push({
            name: `${dist} ${cat.name}`,
            email,
            phone: `+91 ${90000 + Math.floor(Math.random() * 9999)} ${10000 + Math.floor(Math.random() * 89999)}`,
            location: dist,
            userType: 'provider',
            password: defaultPasswordHash,
            services: cat.services,
            serviceAreas: [dist],
            upiId: `${dist.toLowerCase().replace(/\s/g, '')}.${cat.key}@upi`,
            approved: true,
            availability: {
              Monday: { start: '09:00', end: '18:00', enabled: true },
              Tuesday: { start: '09:00', end: '18:00', enabled: true },
              Wednesday: { start: '09:00', end: '18:00', enabled: true },
              Thursday: { start: '09:00', end: '18:00', enabled: true },
              Friday: { start: '09:00', end: '18:00', enabled: true },
              Saturday: { start: '09:00', end: '18:00', enabled: true },
              Sunday: { start: '09:00', end: '18:00', enabled: false }
            }
          });
        }
      }

      await User.insertMany(providersToSeed);
      console.log(`🌱 Seeded ${providersToSeed.length} default provider profiles!`);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Express server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
  });
