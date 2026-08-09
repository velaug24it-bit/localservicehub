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
import Brand from './models/Brand.js';
import PartnerShop from './models/PartnerShop.js';
import Product from './models/Product.js';
import ShopInventory from './models/ShopInventory.js';
import Invoice from './models/Invoice.js';
import CustomerWallet from './models/CustomerWallet.js';
import RewardRule from './models/RewardRule.js';
import CustomerMembership from './models/CustomerMembership.js';
import Warranty from './models/Warranty.js';
import ProviderWallet from './models/ProviderWallet.js';
import ProviderLevel from './models/ProviderLevel.js';
import TrainingCourse from './models/TrainingCourse.js';
import ProviderCertificate from './models/ProviderCertificate.js';
import ChatConversation from './models/ChatConversation.js';
import ChatMessage from './models/ChatMessage.js';
import MarketplaceOrder from './models/MarketplaceOrder.js';
import ServiceAgreement from './models/ServiceAgreement.js';
import AgreementTemplate from './models/AgreementTemplate.js';
import AgreementSignature from './models/AgreementSignature.js';
import AgreementServiceRequest from './models/AgreementServiceRequest.js';
import GrowthGoal from './models/GrowthGoal.js';
import AgreementAuditLog from './models/AgreementAuditLog.js';

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

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️ Unhandled Promise Rejection:', reason);
});


// ── GLOBAL HELPER FUNCTIONS ──
async function getOrCreateCustomerWallet(userId, userName = '') {
  let wallet = await CustomerWallet.findOne({ userId });
  if (!wallet) {
    const refCode = `SH-${(userId || 'CUST').toString().slice(-5).toUpperCase()}`;
    wallet = new CustomerWallet({
      userId,
      balance: 100,
      cashbackBalance: 0,
      promoCredits: 100,
      rewardPoints: 100,
      referralCode: refCode,
      totalEarned: 100,
      totalSpent: 0,
      transactions: [
        {
          id: `WT-${Date.now()}`,
          type: 'promo_credit',
          amount: 100,
          description: 'Welcome to ServiceHub! Promotional loyalty credits credited.',
          date: new Date()
        }
      ]
    });
    await wallet.save();
  }
  return wallet;
}

async function getOrCreateCustomerMembership(userId, userName = '', userEmail = '') {
  let membership = await CustomerMembership.findOne({ userId });
  if (!membership) {
    membership = new CustomerMembership({
      userId,
      customerName: userName,
      customerEmail: userEmail,
      planType: 'free',
      planName: 'ServiceHub Free Shield',
      discountPercent: 0,
      warrantyDaysMultiplier: 1,
      priorityBooking: false,
      benefits: ['Standard 90-Day Digital Warranty', 'Verified Provider Network', 'Split Invoice Downloads']
    });
    await membership.save();
  }
  return membership;
}

async function getOrCreateProviderWallet(providerId, providerName = '', providerPhone = '') {
  let pWallet = await ProviderWallet.findOne({ providerId });
  if (!pWallet) {
    pWallet = new ProviderWallet({
      providerId,
      providerName,
      providerPhone,
      availableBalance: 0,
      pendingSettlement: 0,
      totalWithdrawn: 0,
      totalLifetimeEarnings: 0,
      milestonePoints: 0,
      milestoneCyclesCompleted: 0,
      milestoneBonusEarned: 0,
      topProviderRank: 0,
      topProviderBonusEarned: 0,
      referralBonusEarned: 0,
      marketplaceCashbackEarned: 0,
      performanceBonusEarned: 0,
      transactions: [],
      payoutRequests: []
    });
    await pWallet.save();
  }

  // ── CLEAN CALCULATION: STRICTLY FROM REAL JOB PAYMENTS & 100-POINT MILESTONES ──
  try {
    const completedBookings = await Booking.find({ 
      $or: [
        { providerId }, 
        { providerId: providerId?.toString() },
        ...(pWallet.providerName ? [{ providerName: pWallet.providerName }] : [])
      ],
      status: 'Completed' 
    });

    let totalCompletedWorkVolume = 0;
    const milestoneJobLogs = [];

    for (const b of completedBookings) {
      const rawPrice = b.priceBreakdown?.subtotal || (typeof b.price === 'number' ? b.price : parseInt(String(b.price || 0).replace(/[^\d]/g, ''), 10)) || 0;
      if (rawPrice > 0) {
        totalCompletedWorkVolume += rawPrice;
        const bId = b.trackingId || b.id || b._id.toString();
        milestoneJobLogs.push({
          bookingId: bId,
          serviceType: b.serviceType,
          amount: rawPrice,
          pointsEarned: Math.floor(rawPrice / 100),
          date: b.updatedAt || b.createdAt || new Date()
        });
      }
    }

    // Milestone Rule: Each ₹100 of completed work = 1 Milestone Point
    const allTimeMilestonePoints = Math.floor(totalCompletedWorkVolume / 100);
    // After collecting 100 points only -> grants ₹1,000 Milestone Cash Bonus
    const cyclesCompleted = Math.floor(allTimeMilestonePoints / 100);
    const currentPointsInCycle = allTimeMilestonePoints % 100; // 0 to 99 points
    const totalMilestoneBonusEarned = cyclesCompleted * 1000;

    const freshTransactions = [];

    if (cyclesCompleted > 0) {
      for (let c = 1; c <= cyclesCompleted; c++) {
        freshTransactions.push({
          id: `PWT-MILE-CYCLE-${c}`,
          type: 'milestone_bonus',
          amount: 1000,
          description: `🎉 100 Milestone Points Completed (Cycle #${c})! ₹1,000 Cash Bonus Credited to Wallet.`,
          status: 'Completed',
          date: new Date()
        });
      }
    }

    // Top Provider Star Bonus (if awarded by Admin)
    const topBonus = pWallet.topProviderBonusEarned || 0;
    if (topBonus > 0) {
      freshTransactions.unshift({
        id: `PWT-TOP-${Date.now()}`,
        type: 'performance_reward',
        amount: topBonus,
        description: `🏆 Top #${pWallet.topProviderRank || 1} Specialist Platform Performance Award`,
        status: 'Completed',
        date: new Date()
      });
    }

    const withdrawn = pWallet.totalWithdrawn || 0;
    const pending = pWallet.pendingSettlement || 0;

    // Available balance is STRICTLY the ₹1,000 bonuses earned from reaching 100 points (plus admin top bonus) minus withdrawals
    pWallet.availableBalance = Math.max(0, totalMilestoneBonusEarned + topBonus - withdrawn - pending);
    pWallet.totalLifetimeEarnings = totalMilestoneBonusEarned + topBonus;
    pWallet.milestonePoints = currentPointsInCycle;
    pWallet.milestoneCyclesCompleted = cyclesCompleted;
    pWallet.milestoneBonusEarned = totalMilestoneBonusEarned;
    pWallet.transactions = freshTransactions;

    await pWallet.save();
  } catch (err) {
    console.error('Provider wallet fresh calculation error:', err);
  }

  return pWallet;
}

async function getOrCreateProviderLevel(providerId) {
  let pLevel = await ProviderLevel.findOne({ providerId });
  if (!pLevel) {
    pLevel = new ProviderLevel({
      providerId,
      tier: 'Silver',
      trustScore: 96,
      onTimePercentage: 98,
      responseRatePercentage: 99,
      completedJobsCount: 18,
      repeatCustomersCount: 6,
      rating: 4.9,
      verifiedBadge: true,
      experienceYears: '6+ Years',
      leadPriorityMultiplier: 1.25,
      commissionDiscountPercent: 1,
      unlockedPerks: ['Verified Specialist Badge', 'Direct WhatsApp Contact', '1.25x Priority Leads', '1% Commission Discount']
    });
    await pLevel.save();
  }
  return pLevel;
}

async function createOrUpdateWarrantyForBooking(booking, customDays, customTerms) {
  try {
    const existing = await Warranty.findOne({
      $or: [
        { bookingId: booking.id || booking._id },
        { trackingId: booking.trackingId }
      ]
    });
    const durationDays = customDays || existing?.durationDays || 30;
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    const terms = customTerms || `100% Free rework guarantee for ${durationDays} days covering workmanship, quality check, and spare parts performance.`;

    if (existing) {
      if (customDays) {
        existing.durationDays = durationDays;
        existing.startDate = startDate;
        existing.expiryDate = expiryDate;
        existing.coverageTerms = terms;
        existing.status = 'Active';
        await existing.save();
      }
      return existing;
    }

    const wrnNumber = `SH-WRN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const warranty = new Warranty({
      warrantyNumber: wrnNumber,
      bookingId: booking.id || booking._id.toString(),
      trackingId: booking.trackingId || `SH-${Date.now()}`,
      userId: booking.userId,
      customerName: booking.customerName || 'Valued Customer',
      customerPhone: booking.phone || '',
      providerId: booking.providerId || '',
      providerName: booking.providerName || 'Certified Specialist',
      serviceName: booking.serviceType || 'Home Service',
      category: booking.category || 'General',
      serviceAmount: booking.priceBreakdown?.subtotal || 500,
      startDate,
      durationDays,
      expiryDate,
      status: 'Active',
      coverageTerms: terms
    });
    await warranty.save();
    return warranty;
  } catch (err) {
    console.error('Error creating warranty for booking:', err.message);
  }
}

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
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

// Helper to check and auto-expire provider subscriptions
const checkAndUpdateSubscription = async (userDoc) => {
  if (!userDoc || userDoc.userType !== 'provider') return userDoc;
  if (userDoc.revenueModel === 'subscription' && userDoc.subscriptionExpiresAt) {
    const now = new Date();
    if (new Date(userDoc.subscriptionExpiresAt) < now) {
      userDoc.subscriptionActive = false;
      userDoc.revenueModel = 'commission';
      await userDoc.save();
    }
  }
  return userDoc;
};

// Get profile
app.get('/api/auth/profile', auth, async (req, res) => {
  try {
    let user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user = await checkAndUpdateSubscription(user);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile / provider details
app.put('/api/auth/profile', auth, async (req, res) => {
  try {
    const { name, phone, location, services, availability, serviceAreas, upiId, revenueModel, subscriptionActive, subscriptionPlan } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (location !== undefined) updates.location = location;
    if (services !== undefined) updates.services = services;
    if (availability !== undefined) updates.availability = availability;
    if (serviceAreas !== undefined) updates.serviceAreas = serviceAreas;
    if (upiId !== undefined) updates.upiId = upiId;
    if (revenueModel !== undefined) updates.revenueModel = revenueModel;
    if (subscriptionActive !== undefined) {
      updates.subscriptionActive = subscriptionActive;
      if (subscriptionActive) {
        updates.subscriptionStartDate = new Date();
        updates.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        updates.revenueModel = 'subscription';
      } else {
        updates.revenueModel = 'commission';
      }
    }
    if (subscriptionPlan !== undefined) updates.subscriptionPlan = subscriptionPlan;

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
 
    // Fetch and attach reviews + marketplace orders for bookings
    const bookingsWithDetails = await Promise.all(bookings.map(async (b) => {
      const bObj = b.toJSON();
      
      // Attach review
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

      // Attach Marketplace Order
      if (b.marketplaceOrderId) {
        const order = await MarketplaceOrder.findById(b.marketplaceOrderId).populate('shopId');
        if (order) {
          bObj.marketplaceOrder = order.toJSON();
        }
      }

      return bObj;
    }));
 
    res.json(bookingsWithDetails);
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

    // Extract marketplace specific booking details
    const {
      materialsRequired = false,
      materialsTotal = 0,
      materialsList = [],
      shopId = null,
      deliveryMethod = 'Pickup',
      serviceItems,
      priceBreakdown
    } = req.body;

    // Check provider revenue model (Subscription vs 5% Commission)
    let providerCommRate = 0.05;
    if (mongoose.Types.ObjectId.isValid(providerId)) {
      const pUser = await User.findById(providerId);
      if (pUser && pUser.revenueModel === 'subscription' && pUser.subscriptionActive) {
        providerCommRate = 0; // 0% commission for subscribers
      }
    }

    const subtotalAmt = priceBreakdown?.subtotal || (parseInt(String(price).replace(/\D/g, '')) || 500);
    const commAmt = Math.round(subtotalAmt * providerCommRate);
    const provEarnings = subtotalAmt - commAmt;

    const finalBreakdown = {
      subtotal: subtotalAmt,
      bookingFee: 0,
      platformFee: 0,
      taxes: 0,
      materialsTotal: materialsRequired ? materialsTotal : 0,
      grandTotal: subtotalAmt + (materialsRequired ? materialsTotal : 0),
      platformCommission: commAmt,
      providerEarnings: provEarnings
    };

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
      payoutStatus: 'Unpaid',
      materialsPaymentStatus: materialsRequired ? 'Unpaid' : 'Unpaid',
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || '',
      razorpaySignature: razorpaySignature || '',
      // Extensions
      serviceItems,
      materialsRequired,
      materialsTotal,
      priceBreakdown: finalBreakdown
    });

    await booking.save();

    // If materials are required, create Marketplace Order & deduct stock
    if (materialsRequired && shopId && materialsList.length > 0) {
      const shop = await PartnerShop.findById(shopId);
      if (shop) {
        // Validate and deduct stock
        const orderedProducts = [];
        let matSubtotal = 0;
        let deliveryCharge = 0;

        for (const item of materialsList) {
          const inv = await ShopInventory.findOne({ shopId, productId: item.productId, isActive: true });
          if (inv) {
            // Deduct stock
            inv.stock = Math.max(0, inv.stock - item.quantity);
            await inv.save();

            const finalUnitPrice = Math.round(inv.price * (1 - (inv.discount || 0) / 100));
            const sub = finalUnitPrice * item.quantity;
            matSubtotal += sub;
            deliveryCharge = Math.max(deliveryCharge, inv.deliveryCharge || 0);

            orderedProducts.push({
              productId: item.productId,
              productName: item.productName,
              brandName: item.brandName,
              quantity: item.quantity,
              price: inv.price,
              discount: inv.discount,
              finalUnitPrice,
              subtotal: sub
            });
          }
        }

        const matGrandTotal = matSubtotal + deliveryCharge;
        const matPlatformCommission = Math.round(matGrandTotal * 0.05); // 5% marketplace commission
        const matShopEarnings = matGrandTotal - matPlatformCommission;

        const order = new MarketplaceOrder({
          bookingId: booking._id,
          customerId: req.userId,
          shopId,
          shopName: shop.name,
          products: orderedProducts,
          subtotal: matSubtotal,
          deliveryCharge,
          grandTotal: matGrandTotal,
          deliveryMethod: deliveryMethod || 'Pickup',
          orderStatus: 'Placed',
          paymentStatus: 'Paid',
          platformCommission: matPlatformCommission,
          shopEarnings: matShopEarnings,
          pickupQrCode: 'QR_SH_' + booking.id.slice(-6).toUpperCase()
        });

        await order.save();
        booking.marketplaceOrderId = order._id;
        await booking.save();

        // 1. Generate Materials Invoice
        const matInv = new Invoice({
          invoiceId: 'INV_MAT_' + Date.now().toString().slice(-8),
          bookingId: booking.id,
          invoiceType: 'material',
          recipientId: req.userId,
          senderId: shopId,
          details: {
            shopName: shop.name,
            shopAddress: shop.address,
            shopPhone: shop.phone,
            products: orderedProducts,
            subtotal: matSubtotal,
            deliveryCharge,
            grandTotal: matGrandTotal
          },
          amount: matGrandTotal
        });
        await matInv.save();
      }
    }

    // Always generate Provider Labour Invoice
    const provInv = new Invoice({
      invoiceId: 'INV_PROV_' + Date.now().toString().slice(-8),
      bookingId: booking.id,
      invoiceType: 'provider',
      recipientId: req.userId,
      senderId: providerId,
      details: {
        providerName,
        serviceType,
        labourCharge: subtotalAmt,
        quantity: 1,
        grandTotal: subtotalAmt
      },
      amount: subtotalAmt
    });
    await provInv.save();

    // Always generate ServiceHub platform fee invoice
    const shInv = new Invoice({
      invoiceId: 'INV_SH_' + Date.now().toString().slice(-8),
      bookingId: booking.id,
      invoiceType: 'servicehub',
      recipientId: req.userId,
      senderId: 'servicehub',
      details: {
        bookingFee: 0,
        platformFee: commAmt,
        taxes: 0,
        grandTotal: commAmt
      },
      amount: commAmt
    });
    await shInv.save();
    await shInv.save();

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

    // When status becomes Completed, sync provider wallet and warranty immediately
    if (status === 'Completed') {
      try {
        await getOrCreateProviderWallet(booking.providerId, booking.providerName);
        await createOrUpdateWarrantyForBooking(booking, req.body.warrantyDays, req.body.coverageTerms);
      } catch (e) {
        console.error('Completed booking sync error:', e);
      }
    }

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
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, advanceTransactionId } = req.body;
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

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.paymentStatus = 'Paid';
    booking.materialsPaymentStatus = 'Paid';
    if (razorpayPaymentId) booking.razorpayPaymentId = razorpayPaymentId;
    if (razorpayOrderId) booking.razorpayOrderId = razorpayOrderId;
    if (razorpaySignature) booking.razorpaySignature = razorpaySignature;
    if (advanceTransactionId || razorpayPaymentId) {
      booking.advanceTransactionId = razorpayPaymentId || advanceTransactionId || booking.advanceTransactionId;
    }

    await booking.save();

    if (booking.marketplaceOrderId) {
      const order = await MarketplaceOrder.findById(booking.marketplaceOrderId);
      if (order) {
        order.paymentStatus = 'Paid';
        await order.save();
      }
    }

    // Notify provider that online payment is confirmed
    if (mongoose.Types.ObjectId.isValid(booking.providerId)) {
      await createAndSendNotification({
        userId: booking.providerId,
        title: '💰 Online Payment Received',
        message: `${booking.customerName} completed online payment for ${booking.serviceType} via Razorpay.`,
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

// Provider Complete Activity & Work History (Admin inspection)
app.get('/api/admin/providers/:id/activity-history', auth, adminOnly, async (req, res) => {
  try {
    let provider = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      provider = await User.findById(req.params.id);
    }
    if (!provider) {
      provider = await User.findOne({ $or: [{ _id: req.params.id }, { id: req.params.id }] });
    }
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    // Fetch all bookings assigned/completed for this provider
    const bookings = await Booking.find({
      $or: [
        { providerId: provider.id },
        { providerId: provider._id.toString() },
        { providerName: provider.name }
      ]
    }).sort({ createdAt: -1 });

    // Fetch provider wallet
    const pWallet = await getOrCreateProviderWallet(provider.id, provider.name, provider.phone);

    // Fetch provider level
    const pLevel = await getOrCreateProviderLevel(provider.id);

    // Fetch all genuine reviews for this provider
    const reviews = await Review.find({
      $or: [
        { providerId: provider.id },
        { providerId: provider._id.toString() },
        { providerName: provider.name }
      ]
    }).sort({ createdAt: -1 });

    // Fetch all digital warranties for bookings
    const warranties = await Warranty.find({
      $or: [
        { providerId: provider.id },
        { providerId: provider._id.toString() },
        { providerName: provider.name }
      ]
    }).sort({ createdAt: -1 });

    // Summary calculations
    let totalWorkVolume = 0;
    let totalProviderEarnings = 0;
    let totalPlatformCommission = 0;

    bookings.forEach(b => {
      const rawPrice = b.priceBreakdown?.subtotal || (typeof b.price === 'number' ? b.price : parseInt(String(b.price || 0).replace(/[^\d]/g, ''), 10)) || 0;
      totalWorkVolume += rawPrice;
      totalProviderEarnings += (b.priceBreakdown?.providerEarnings || Math.round(rawPrice * 0.85));
      totalPlatformCommission += (b.priceBreakdown?.platformCommission || Math.round(rawPrice * 0.15));
    });

    const stats = {
      totalAssignedBookings: bookings.length,
      completedJobs: bookings.filter(b => b.status === 'Completed').length,
      confirmedJobs: bookings.filter(b => b.status === 'Confirmed').length,
      inProgressJobs: bookings.filter(b => b.status === 'In Progress' || b.status === 'Specialist Assigned').length,
      cancelledJobs: bookings.filter(b => b.status === 'Cancelled').length,
      totalWorkVolume,
      totalProviderEarnings,
      totalPlatformCommission,
      availableBalance: pWallet.availableBalance,
      pendingSettlement: pWallet.pendingSettlement,
      totalWithdrawn: pWallet.totalWithdrawn,
      milestonePoints: pWallet.milestonePoints,
      milestoneCyclesCompleted: pWallet.milestoneCyclesCompleted,
      milestoneBonusEarned: pWallet.milestoneBonusEarned,
      topProviderRank: pWallet.topProviderRank,
      topProviderBonusEarned: pWallet.topProviderBonusEarned,
      avgCustomerRating: reviews.length > 0
        ? +(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : (pLevel.rating || 5.0),
      totalReviewsCount: reviews.length,
      trustScore: pLevel.trustScore || 96,
      onTimePercentage: pLevel.onTimePercentage || 98
    };

    res.json({
      provider,
      stats,
      bookings,
      wallet: pWallet,
      level: pLevel,
      reviews,
      warranties
    });
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

// Update payments ledger (Admin)
app.put('/api/admin/payments/:id', auth, adminOnly, async (req, res) => {
  try {
    const { providerStatus, materialsStatus, payoutStatus } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    if (providerStatus) booking.paymentStatus = providerStatus;
    if (materialsStatus) booking.materialsPaymentStatus = materialsStatus;
    if (payoutStatus) booking.payoutStatus = payoutStatus;
    
    await booking.save();

    // If there is a marketplace order, also sync the status
    if (materialsStatus && booking.marketplaceOrderId) {
      const MarketplaceOrder = (await import('./models/MarketplaceOrder.js')).default;
      const order = await MarketplaceOrder.findById(booking.marketplaceOrderId);
      if (order) {
        order.paymentStatus = materialsStatus;
        await order.save();
      }
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch daily provider payouts summary (Admin)
app.get('/api/admin/daily-payouts', auth, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    const providers = await User.find({ userType: 'provider' });
    const providerMap = new Map(providers.map(p => [p.id, p]));

    const payoutsMap = {};

    for (const b of bookings) {
      const dateKey = b.date || (b.createdAt ? b.createdAt.toISOString().split('T')[0] : 'N/A');
      const pId = b.providerId;
      const key = `${dateKey}_${pId}`;

      if (!payoutsMap[key]) {
        const pUser = providerMap.get(pId);
        payoutsMap[key] = {
          key,
          date: dateKey,
          providerId: pId,
          providerName: b.providerName || (pUser ? pUser.name : 'Unknown Provider'),
          providerPhone: pUser ? pUser.phone : '',
          providerEmail: pUser ? pUser.email : b.customerEmail,
          providerUpiId: b.providerUpiId || (pUser ? pUser.upiId : 'Not Provided'),
          revenueModel: pUser ? (pUser.revenueModel || 'commission') : 'commission',
          subscriptionActive: pUser ? !!pUser.subscriptionActive : false,
          totalCollectedByWebsite: 0,
          platformRevenue: 0,
          netPayoutOwed: 0,
          payoutStatus: b.payoutStatus || 'Unpaid',
          bookingCount: 0,
          bookingIds: []
        };
      }

      const pb = b.priceBreakdown || {};
      const subtotal = pb.subtotal || parseInt(String(b.price).replace(/\D/g, '')) || 0;
      const matTotal = pb.materialsTotal || b.materialsTotal || 0;
      const comm = pb.platformCommission !== undefined ? pb.platformCommission : Math.round(subtotal * 0.05);
      const provEarnt = pb.providerEarnings !== undefined ? pb.providerEarnings : (subtotal - comm);

      const totalPaidOnline = subtotal + matTotal;

      payoutsMap[key].totalCollectedByWebsite += totalPaidOnline;
      payoutsMap[key].platformRevenue += comm;
      payoutsMap[key].netPayoutOwed += provEarnt;
      payoutsMap[key].bookingCount += 1;
      payoutsMap[key].bookingIds.push(b.id);
      if (b.payoutStatus === 'Paid') {
        payoutsMap[key].payoutStatus = 'Paid';
      }
    }

    const dailyPayouts = Object.values(payoutsMap).sort((a, b) => b.date.localeCompare(a.date));
    res.json(dailyPayouts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch update daily payout status (Admin)
app.put('/api/admin/payouts/status', auth, adminOnly, async (req, res) => {
  try {
    const { bookingIds, payoutStatus } = req.body;
    if (!Array.isArray(bookingIds) || !payoutStatus) {
      return res.status(400).json({ error: 'bookingIds[] and payoutStatus are required' });
    }

    await Booking.updateMany(
      { _id: { $in: bookingIds } },
      { $set: { payoutStatus } }
    );

    res.json({ success: true, count: bookingIds.length, payoutStatus });
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

    let commRate = 0.05;
    if (mongoose.Types.ObjectId.isValid(providerId)) {
      const pUser = await User.findById(providerId);
      if (pUser && pUser.revenueModel === 'subscription' && pUser.subscriptionActive) {
        commRate = 0;
      }
    }

    const BOOKING_FEE = 0;

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

    const platformFee = 0;
    const grandTotal = subtotal;
    const platformCommission = Math.round(subtotal * commRate);
    const providerEarnings = subtotal - platformCommission;

    res.json({
      serviceItems: calculatedItems,
      priceBreakdown: {
        subtotal,
        bookingFee: 0,
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
// --- SERVICEHUB MATERIALS MARKETPLACE API ---
// ═══════════════════════════════════════════════════════════════════════════

// Distance calculator helper
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371; // radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return +(R * c).toFixed(2);
}

// City coordinate reference points
const CITY_COORDS = {
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'madurai': { lat: 9.9252, lng: 78.1198 },
  'tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
  'salem': { lat: 11.6643, lng: 78.1460 },
  'vellore': { lat: 12.9165, lng: 79.1325 }
};

// GET Service matched products sorted & filtered dynamically
app.get('/api/marketplace/products', auth, async (req, res) => {
  try {
    const { categoryKey, serviceItemKey, workTypeKey, location, sortBy = 'nearest', brand, lat, lng, page = 1, limit = 20 } = req.query;

    if (!categoryKey || !serviceItemKey) {
      return res.status(400).json({ error: 'categoryKey and serviceItemKey are required' });
    }

    // Find all products matching category and item key
    const productQuery = {
      categoryKey: categoryKey.toLowerCase(),
      serviceItemKey: serviceItemKey.toLowerCase()
    };
    if (workTypeKey) {
      productQuery.$or = [{ workTypeKey: workTypeKey.toLowerCase() }, { workTypeKey: '' }];
    }

    const matchedProducts = await Product.find(productQuery);
    if (matchedProducts.length === 0) {
      return res.json({ products: [], total: 0 });
    }

    const productIds = matchedProducts.map(p => p._id);

    // Find inventory listings for these products
    const inventoryListings = await ShopInventory.find({
      productId: { $in: productIds },
      isActive: true,
      stock: { $gt: 0 }
    }).populate('productId').populate('shopId');

    // Parse GPS coords
    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;

    let listings = inventoryListings.map(inv => {
      const shop = inv.shopId;
      const product = inv.productId;
      if (!shop || !product) return null;

      // Determine coordinate base
      let shopLat = shop.gpsLocation?.latitude;
      let shopLng = shop.gpsLocation?.longitude;
      
      let clientLat = userLat;
      let clientLng = userLng;

      if (!clientLat && location) {
        const cityKey = String(location).toLowerCase().trim();
        const baseCoords = CITY_COORDS[cityKey];
        if (baseCoords) {
          clientLat = baseCoords.lat;
          clientLng = baseCoords.lng;
        }
      }

      const distance = getDistance(clientLat, clientLng, shopLat, shopLng);

      const finalPrice = Math.round(inv.price * (1 - (inv.discount || 0) / 100));

      return {
        id: inv.id,
        productId: product.id,
        name: product.name,
        brandName: product.brandName,
        image: product.image,
        description: product.description,
        specifications: product.specifications,
        warranty: product.warranty,
        categoryKey: product.categoryKey,
        serviceItemKey: product.serviceItemKey,
        price: inv.price,
        discount: inv.discount,
        finalPrice,
        stock: inv.stock,
        estimatedDeliveryHours: inv.estimatedDeliveryHours,
        deliveryCharge: inv.deliveryCharge,
        shop: {
          id: shop.id,
          name: shop.name,
          ownerName: shop.ownerName,
          phone: shop.phone,
          address: shop.address,
          location: shop.location,
          rating: shop.rating,
          gpsLocation: shop.gpsLocation,
          deliveryAvailable: shop.deliveryAvailable,
          pickupAvailable: shop.pickupAvailable
        },
        distance
      };
    }).filter(Boolean);

    // Apply location/district filter
    if (location) {
      const normalizedLoc = String(location).toLowerCase().trim();
      listings = listings.filter(l => l.shop.location.toLowerCase() === normalizedLoc);
    }

    // Apply Brand filter if provided (comma-separated names)
    if (brand) {
      const brandList = String(brand).split(',').map(b => b.trim().toLowerCase());
      listings = listings.filter(l => brandList.includes(l.brandName.toLowerCase()));
    }

    // Apply sorting
    if (sortBy === 'lowest_price') {
      listings.sort((a, b) => a.finalPrice - b.finalPrice);
    } else if (sortBy === 'highest_rating') {
      listings.sort((a, b) => b.shop.rating - a.shop.rating);
    } else if (sortBy === 'fastest_delivery') {
      listings.sort((a, b) => a.estimatedDeliveryHours - b.estimatedDeliveryHours);
    } else {
      // Default: nearest
      listings.sort((a, b) => a.distance - b.distance);
    }

    // Pagination
    const pg = parseInt(page) || 1;
    const lim = parseInt(limit) || 20;
    const total = listings.length;
    const paginated = listings.slice((pg - 1) * lim, pg * lim);

    res.json({
      products: paginated,
      total,
      page: pg,
      limit: lim
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET verified partner shops
app.get('/api/marketplace/shops/nearby', auth, async (req, res) => {
  try {
    const { location } = req.query;
    const query = { status: 'Verified' };
    if (location) {
      query.location = location;
    }
    const shops = await PartnerShop.find(query).sort({ rating: -1 });
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Calculate checkout prices & inventory availability
app.post('/api/marketplace/calculate-checkout', auth, async (req, res) => {
  try {
    const { shopId, products } = req.body;
    // products: [{ productId, quantity }]
    if (!shopId || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'shopId and products[] are required' });
    }

    const shop = await PartnerShop.findById(shopId);
    if (!shop) return res.status(404).json({ error: 'Partner shop not found' });

    let subtotal = 0;
    let deliveryCharge = 0;
    const checkedProducts = [];

    for (const p of products) {
      const { productId, quantity = 1 } = p;
      if (!productId) continue;

      const inventory = await ShopInventory.findOne({ shopId, productId, isActive: true }).populate('productId');
      if (!inventory) {
        return res.status(400).json({ error: `Product not found or unavailable in this shop` });
      }

      const qty = Math.max(1, parseInt(quantity) || 1);
      if (inventory.stock < qty) {
        return res.status(400).json({ error: `Insufficient stock for ${inventory.productId.name}. Available: ${inventory.stock}` });
      }

      const unitPrice = inventory.price;
      const discount = inventory.discount || 0;
      const finalUnitPrice = Math.round(unitPrice * (1 - discount / 100));
      const itemSubtotal = finalUnitPrice * qty;

      subtotal += itemSubtotal;
      deliveryCharge = Math.max(deliveryCharge, inventory.deliveryCharge || 0);

      checkedProducts.push({
        productId,
        productName: inventory.productId.name,
        brandName: inventory.productId.brandName,
        quantity: qty,
        price: unitPrice,
        discount,
        finalUnitPrice,
        subtotal: itemSubtotal
      });
    }

    const bookingFee = 0;
    const platformFee = 0;
    const taxes = 0;
    const materialsTotal = subtotal + deliveryCharge;
    const grandTotal = materialsTotal;
    const platformCommission = Math.round(materialsTotal * 0.05); // 5% marketplace commission
    const shopEarnings = materialsTotal - platformCommission;

    res.json({
      shopId,
      shopName: shop.name,
      products: checkedProducts,
      subtotal,
      deliveryCharge,
      materialsTotal,
      platformCommission,
      shopEarnings,
      priceBreakdown: {
        subtotal,
        deliveryCharge,
        materialsTotal,
        bookingFee: 0,
        platformFee,
        taxes,
        grandTotal,
        platformCommission,
        shopEarnings
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET separate invoices for a booking
app.get('/api/marketplace/invoices/booking/:bookingId', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ bookingId: req.params.bookingId });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─── ADMIN MARKETPLACE API ──────────────────────────────────────────────────

// Shops CRUD
app.get('/api/admin/marketplace/shops', auth, adminOnly, async (req, res) => {
  try {
    const shops = await PartnerShop.find().sort({ createdAt: -1 });
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/marketplace/shops', auth, adminOnly, async (req, res) => {
  try {
    const shop = new PartnerShop(req.body);
    await shop.save();
    res.status(201).json(shop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/marketplace/shops/:id', auth, adminOnly, async (req, res) => {
  try {
    const shop = await PartnerShop.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    res.json(shop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/marketplace/shops/:id', auth, adminOnly, async (req, res) => {
  try {
    await ShopInventory.deleteMany({ shopId: req.params.id });
    await MarketplaceOrder.deleteMany({ shopId: req.params.id });
    await PartnerShop.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products CRUD
app.get('/api/admin/marketplace/products', auth, adminOnly, async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/marketplace/products', auth, adminOnly, async (req, res) => {
  try {
    const { name, brandId, image, description, specifications, warranty, categoryKey, serviceItemKey, workTypeKey } = req.body;
    if (!name || !brandId || !categoryKey || !serviceItemKey) {
      return res.status(400).json({ error: 'name, brandId, categoryKey, and serviceItemKey are required' });
    }
    const brand = await Brand.findById(brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });

    const prod = new Product({
      name,
      brandId,
      brandName: brand.name,
      image: image || '📦',
      description: description || '',
      specifications: specifications || {},
      warranty: warranty || 'No warranty',
      categoryKey: categoryKey.toLowerCase(),
      serviceItemKey: serviceItemKey.toLowerCase(),
      workTypeKey: workTypeKey ? workTypeKey.toLowerCase() : '',
      isActive: true
    });
    await prod.save();
    res.status(201).json(prod);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/marketplace/products/:id', auth, adminOnly, async (req, res) => {
  try {
    const updates = req.body;
    if (updates.brandId) {
      const brand = await Brand.findById(updates.brandId);
      if (brand) updates.brandName = brand.name;
    }
    const prod = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!prod) return res.status(404).json({ error: 'Product not found' });
    res.json(prod);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/marketplace/products/:id', auth, adminOnly, async (req, res) => {
  try {
    await ShopInventory.deleteMany({ productId: req.params.id });
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Brands CRUD
app.get('/api/admin/marketplace/brands', auth, adminOnly, async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/marketplace/brands', auth, adminOnly, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Brand name is required' });
    const brand = new Brand({ name, key: name.toLowerCase().trim().replace(/\s+/g, '_') });
    await brand.save();
    res.status(201).json(brand);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Brand already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Inventory CRUD
app.get('/api/admin/marketplace/inventory', auth, adminOnly, async (req, res) => {
  try {
    const { shopId } = req.query;
    const filter = shopId ? { shopId } : {};
    const listings = await ShopInventory.find(filter).populate('productId').populate('shopId').sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/marketplace/inventory', auth, adminOnly, async (req, res) => {
  try {
    const { shopId, productId, price, discount, stock, estimatedDeliveryHours, deliveryCharge } = req.body;
    if (!shopId || !productId || price === undefined) {
      return res.status(400).json({ error: 'shopId, productId, and price are required' });
    }
    const listing = new ShopInventory({
      shopId, productId, price,
      discount: discount || 0,
      stock: stock !== undefined ? stock : 10,
      estimatedDeliveryHours: estimatedDeliveryHours || 24,
      deliveryCharge: deliveryCharge || 0,
      isActive: true
    });
    await listing.save();
    res.status(201).json(listing);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Product inventory listing already exists for this shop' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/marketplace/inventory/:id', auth, adminOnly, async (req, res) => {
  try {
    const listing = await ShopInventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/marketplace/inventory/:id', auth, adminOnly, async (req, res) => {
  try {
    await ShopInventory.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders & Payments Management (Admin)
app.get('/api/admin/marketplace/orders', auth, adminOnly, async (req, res) => {
  try {
    const orders = await MarketplaceOrder.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/marketplace/orders/:id', auth, adminOnly, async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const updates = {};
    if (orderStatus) updates.orderStatus = orderStatus;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    const order = await MarketplaceOrder.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics (Admin)
app.get('/api/admin/marketplace/analytics', auth, adminOnly, async (req, res) => {
  try {
    const totalShops = await PartnerShop.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await MarketplaceOrder.countDocuments();
    const orders = await MarketplaceOrder.find({ paymentStatus: 'Paid' });
    const totalSales = orders.reduce((sum, o) => sum + o.grandTotal, 0);

    // Sales by shop
    const shopSales = {};
    orders.forEach(o => {
      shopSales[o.shopName] = (shopSales[o.shopName] || 0) + o.grandTotal;
    });

    const shopSalesArray = Object.keys(shopSales).map(name => ({
      name,
      sales: shopSales[name]
    })).sort((a, b) => b.sales - a.sales);

    res.json({
      totalShops,
      totalProducts,
      totalOrders,
      totalSales,
      shopSales: shopSalesArray
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


// ══════════════════════════════════════════════════════════════════════════
// ══ AI BUSINESS COACH + SERVICE AGREEMENT ROUTES ═════════════════════════
// ══════════════════════════════════════════════════════════════════════════

// ── AI BUSINESS COACH: Real data-driven insights ──
app.get('/api/provider-business/ai-coach', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'provider') return res.status(403).json({ error: 'Provider access required' });
    const providerId = req.userId;

    // Gather real data
    const allBookings = await Booking.find({
      $or: [{ providerId }, { providerId: providerId.toString() }, { providerName: user.name }]
    }).sort({ createdAt: -1 });

    const reviews = await Review.find({ providerId });
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const completedBookings = allBookings.filter(b => b.status === 'Completed');
    const cancelledBookings = allBookings.filter(b => b.status === 'Cancelled');
    const thisMonthBookings = allBookings.filter(b => new Date(b.createdAt) >= thisMonth);
    const lastMonthBookings = allBookings.filter(b => {
      const d = new Date(b.createdAt);
      return d >= lastMonth && d < thisMonth;
    });
    const thisMonthCompleted = completedBookings.filter(b => new Date(b.createdAt) >= thisMonth);
    const lastMonthCompleted = completedBookings.filter(b => {
      const d = new Date(b.createdAt);
      return d >= lastMonth && d < thisMonth;
    });

    // Revenue calculation
    const getRevenue = (bookings) => bookings.reduce((sum, b) => {
      const raw = b.priceBreakdown?.subtotal || (typeof b.price === 'number' ? b.price : parseInt(String(b.price || 0).replace(/[^\d]/g, ''), 10)) || 0;
      return sum + raw;
    }, 0);
    const totalRevenue = getRevenue(completedBookings);
    const thisMonthRevenue = getRevenue(thisMonthCompleted);
    const lastMonthRevenue = getRevenue(lastMonthCompleted);

    // Revenue trend (last 6 months)
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthBookings = completedBookings.filter(b => {
        const d = new Date(b.createdAt);
        return d >= m && d < mEnd;
      });
      revenueTrend.push({
        month: m.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue: getRevenue(monthBookings),
        bookings: monthBookings.length
      });
    }

    // Top services
    const serviceCounts = {};
    completedBookings.forEach(b => {
      serviceCounts[b.serviceType] = (serviceCounts[b.serviceType] || 0) + 1;
    });
    const topServices = Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Repeat customers
    const customerCounts = {};
    completedBookings.forEach(b => {
      customerCounts[b.userId] = (customerCounts[b.userId] || 0) + 1;
    });
    const repeatCustomers = Object.values(customerCounts).filter(c => c > 1).length;
    const totalCustomers = Object.keys(customerCounts).length;

    // Peak booking periods (day of week)
    const dayCount = [0, 0, 0, 0, 0, 0, 0];
    allBookings.forEach(b => {
      const d = new Date(b.createdAt);
      dayCount[d.getDay()]++;
    });
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDay = dayNames[dayCount.indexOf(Math.max(...dayCount))];

    // Average rating
    const avgRating = reviews.length > 0
      ? +(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    // Business Health Score (0-100)
    let healthScore = 0;
    if (completedBookings.length > 0) healthScore += 20;
    if (completedBookings.length >= 5) healthScore += 10;
    if (completedBookings.length >= 20) healthScore += 10;
    if (avgRating !== null && avgRating >= 4.0) healthScore += 15;
    if (avgRating !== null && avgRating >= 4.5) healthScore += 5;
    if (cancelledBookings.length === 0) healthScore += 10;
    else if (cancelledBookings.length / allBookings.length < 0.1) healthScore += 5;
    if (repeatCustomers > 0) healthScore += 10;
    if (repeatCustomers >= 3) healthScore += 5;
    if (thisMonthRevenue > lastMonthRevenue) healthScore += 10;
    if (reviews.length >= 3) healthScore += 5;
    healthScore = Math.min(100, healthScore);

    // Growth recommendations (real data driven)
    const recommendations = [];
    if (allBookings.length === 0) {
      recommendations.push({ type: 'info', text: 'Start accepting bookings to build your profile and earn milestone points.' });
    } else {
      if (topServices.length > 0) {
        recommendations.push({ type: 'insight', text: `Your most booked service is "${topServices[0].name}" with ${topServices[0].count} completed jobs.` });
      }
      const weekendBookings = allBookings.filter(b => {
        const d = new Date(b.createdAt);
        return d.getDay() === 0 || d.getDay() === 6;
      });
      if (weekendBookings.length > allBookings.length * 0.4) {
        recommendations.push({ type: 'insight', text: 'Your weekend demand is higher than weekday demand. Consider prioritizing weekend availability.' });
      }
      if (repeatCustomers > 0) {
        recommendations.push({ type: 'positive', text: `You have ${repeatCustomers} repeat customer${repeatCustomers > 1 ? 's' : ''}. Great job building loyalty!` });
      }
      if (thisMonthRevenue > lastMonthRevenue && lastMonthRevenue > 0) {
        const growthPct = Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
        recommendations.push({ type: 'positive', text: `Your revenue grew ${growthPct}% compared to last month. Keep it up!` });
      }
      if (thisMonthRevenue < lastMonthRevenue && lastMonthRevenue > 0) {
        recommendations.push({ type: 'warning', text: 'Revenue is lower than last month. Consider expanding your availability or offering promotions.' });
      }
      if (avgRating !== null && avgRating < 4.0) {
        recommendations.push({ type: 'warning', text: `Your average rating is ${avgRating}. Focus on quality to improve customer satisfaction.` });
      }
      if (cancelledBookings.length > 0) {
        const rate = Math.round((cancelledBookings.length / allBookings.length) * 100);
        recommendations.push({ type: rate > 15 ? 'warning' : 'info', text: `Your cancellation rate is ${rate}%. ${rate > 15 ? 'Try to reduce cancellations.' : 'This is within acceptable range.'}` });
      }
      recommendations.push({ type: 'tip', text: `Your peak booking day is ${peakDay}. Ensure maximum availability on this day.` });
    }

    // Get goals
    const goal = await GrowthGoal.findOne({
      providerId,
      month: now.getMonth() + 1,
      year: now.getFullYear()
    });

    res.json({
      hasData: allBookings.length > 0,
      healthScore,
      totalBookings: allBookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings: cancelledBookings.length,
      cancellationRate: allBookings.length > 0 ? +(cancelledBookings.length / allBookings.length * 100).toFixed(1) : 0,
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueTrend,
      topServices,
      avgRating,
      totalReviews: reviews.length,
      repeatCustomers,
      totalCustomers,
      repeatCustomerRate: totalCustomers > 0 ? +(repeatCustomers / totalCustomers * 100).toFixed(1) : 0,
      peakDay,
      peakDayBookings: dayCount,
      recommendations,
      goals: goal || null,
      thisMonthBookings: thisMonthBookings.length,
      lastMonthBookings: lastMonthBookings.length
    });
  } catch (err) {
    console.error('AI Coach error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Provider Goals CRUD ──
app.get('/api/provider-business/goals', auth, async (req, res) => {
  try {
    const now = new Date();
    const goal = await GrowthGoal.findOne({
      providerId: req.userId,
      month: now.getMonth() + 1,
      year: now.getFullYear()
    });
    res.json(goal || { monthlyRevenueTarget: 0, monthlyBookingTarget: 0, ratingTarget: 0, repeatCustomerTarget: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/provider-business/goals', auth, async (req, res) => {
  try {
    const now = new Date();
    const { monthlyRevenueTarget, monthlyBookingTarget, ratingTarget, repeatCustomerTarget } = req.body;
    const goal = await GrowthGoal.findOneAndUpdate(
      { providerId: req.userId, month: now.getMonth() + 1, year: now.getFullYear() },
      { monthlyRevenueTarget, monthlyBookingTarget, ratingTarget, repeatCustomerTarget },
      { upsert: true, new: true }
    );
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════
// ── SERVICE AGREEMENT: Customer Routes ───────────────────────────────
// ══════════════════════════════════════════════════════════════════════

// Create agreement from completed booking
app.post('/api/agreements', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'customer') return res.status(403).json({ error: 'Customer access required' });

    const { bookingId } = req.body;
    let booking = null;
    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      booking = await Booking.findById(bookingId);
    }
    if (!booking && bookingId) {
      booking = await Booking.findOne({ $or: [{ trackingId: bookingId }, { id: bookingId }] });
    }
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId && booking.userId !== req.userId) return res.status(403).json({ error: 'Not your booking' });

    // Check if agreement already exists for this booking
    const bookingIdentifier = booking.id || booking._id.toString();
    const existing = await ServiceAgreement.findOne({ 
      $or: [{ bookingId: bookingIdentifier }, { trackingId: booking.trackingId }] 
    });
    if (existing) {
      return res.status(200).json(existing);
    }


    // Find matching template or use default
    let template = await AgreementTemplate.findOne({ serviceCategory: booking.category, status: 'active' });
    if (!template) template = await AgreementTemplate.findOne({ isDefault: true, status: 'active' });

    const durationMonths = template?.durationMonths || 12;
    const templateSnapshot = template ? {
      name: template.name,
      terms: template.terms,
      coveredServices: template.coveredServices,
      excludedServices: template.excludedServices,
      warrantyRules: template.warrantyRules,
      cancellationRules: template.cancellationRules,
      renewalRules: template.renewalRules,
      customerObligations: template.customerObligations,
      providerObligations: template.providerObligations,
      platformRole: template.platformRole,
      paymentModel: template.paymentModel
    } : {
      name: 'ServiceHub Standard Service Agreement',
      terms: 'This agreement covers future service requests for the same service category. All service requests are subject to provider availability and admin assignment. The customer may request service at any time during the agreement period.',
      coveredServices: [booking.serviceType],
      excludedServices: [],
      warrantyRules: 'Standard ServiceHub warranty applies to each completed service.',
      cancellationRules: 'Either party may cancel with 7 days written notice. No penalty for cancellation.',
      renewalRules: 'Agreement may be renewed upon mutual consent before expiry.',
      customerObligations: 'Provide accurate service details and maintain reasonable access for service delivery.',
      providerObligations: 'Deliver quality service within agreed timelines and maintain professional standards.',
      platformRole: 'ServiceHub facilitates matching, communication, and dispute resolution between parties.',
      paymentModel: 'additional_charge'
    };

    const agreementCount = await ServiceAgreement.countDocuments();
    const agreementId = `AGR-${String(agreementCount + 1).padStart(6, '0')}`;

    const agreement = new ServiceAgreement({
      agreementId,
      bookingId: booking.id || booking._id.toString(),
      trackingId: booking.trackingId || '',
      customerId: req.userId,
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone || booking.phone || '',
      providerId: booking.providerId,
      providerName: booking.providerName,
      serviceType: booking.serviceType,
      category: booking.category,
      location: booking.location || user.location || '',
      templateId: template?._id?.toString() || '',
      templateVersion: template?.version || 1,
      templateSnapshot,
      durationMonths,
      status: 'PENDING_SIGNATURE'
    });
    await agreement.save();

    await AgreementAuditLog.create({
      agreementId,
      action: 'created',
      performedBy: req.userId,
      performedByRole: 'customer',
      details: { bookingId: booking.id || booking._id.toString(), serviceType: booking.serviceType }
    });

    res.status(201).json(agreement);
  } catch (err) {
    console.error('Create agreement error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List customer's agreements
app.get('/api/agreements/my', auth, async (req, res) => {
  try {
    const agreements = await ServiceAgreement.find({ customerId: req.userId }).sort({ createdAt: -1 });
    // Auto-expire
    const now = new Date();
    for (const a of agreements) {
      if (a.status === 'ACTIVE' && a.endDate && new Date(a.endDate) < now) {
        a.status = 'EXPIRED';
        await a.save();
      }
    }
    res.json(agreements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get agreement details
app.get('/api/agreements/:id', auth, async (req, res) => {
  try {
    const agreement = await ServiceAgreement.findOne({ agreementId: req.params.id });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    const user = await User.findById(req.userId);
    // Authorization: customer owner, assigned provider, or admin
    if (user.userType === 'customer' && agreement.customerId !== req.userId) {
      return res.status(403).json({ error: 'Not your agreement' });
    }
    if (user.userType === 'provider' && agreement.providerId !== req.userId) {
      return res.status(403).json({ error: 'Not assigned to you' });
    }
    // Get signature if exists
    const signature = await AgreementSignature.findOne({ agreementId: agreement.agreementId });
    // Get service requests
    const serviceRequests = await AgreementServiceRequest.find({ agreementId: agreement.agreementId }).sort({ createdAt: -1 });
    res.json({ agreement, signature: signature ? { fullName: signature.fullName, signatureType: signature.signatureType, signedAt: signature.signedAt, consent: signature.consent } : null, serviceRequests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sign agreement
app.post('/api/agreements/:id/sign', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'customer') return res.status(403).json({ error: 'Customer access required' });

    const agreement = await ServiceAgreement.findOne({ agreementId: req.params.id });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.customerId !== req.userId) return res.status(403).json({ error: 'Not your agreement' });
    if (agreement.status !== 'PENDING_SIGNATURE') return res.status(400).json({ error: `Agreement is ${agreement.status}, cannot sign` });

    const { fullName, signatureType, signatureData, consent } = req.body;
    if (!fullName || !signatureType || !signatureData || !consent) {
      return res.status(400).json({ error: 'Missing required signature fields' });
    }

    // Save signature
    const sig = new AgreementSignature({
      agreementId: agreement.agreementId,
      customerId: req.userId,
      signatureType,
      signatureData,
      fullName,
      consent: true,
      signedAt: new Date(),
      auditMetadata: {
        userAgent: req.headers['user-agent'] || '',
        agreementVersion: agreement.templateVersion
      }
    });
    await sig.save();

    // Activate agreement
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + agreement.durationMonths);

    agreement.status = 'ACTIVE';
    agreement.signedAt = startDate;
    agreement.startDate = startDate;
    agreement.endDate = endDate;
    await agreement.save();

    await AgreementAuditLog.create({
      agreementId: agreement.agreementId,
      action: 'signed',
      performedBy: req.userId,
      performedByRole: 'customer',
      details: { fullName, signatureType }
    });

    // Notification to customer
    await Notification.create({
      userId: req.userId,
      title: 'Agreement Activated',
      message: `Your service agreement ${agreement.agreementId} for ${agreement.serviceType} has been activated.`,
      type: 'agreement',
      link: agreement.agreementId
    });
    // Notification to provider
    await Notification.create({
      userId: agreement.providerId,
      title: 'New Service Agreement',
      message: `${user.name} has signed a service agreement (${agreement.agreementId}) for ${agreement.serviceType}.`,
      type: 'agreement',
      link: agreement.agreementId
    });

    res.json({ success: true, agreement });
  } catch (err) {
    console.error('Sign agreement error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create service request under agreement ("Service Needed")
app.post('/api/agreements/:id/service-requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'customer') return res.status(403).json({ error: 'Customer access required' });

    const agreement = await ServiceAgreement.findOne({ agreementId: req.params.id });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.customerId !== req.userId) return res.status(403).json({ error: 'Not your agreement' });
    if (agreement.status !== 'ACTIVE') return res.status(400).json({ error: 'Agreement is not active' });
    if (agreement.endDate && new Date(agreement.endDate) < new Date()) {
      agreement.status = 'EXPIRED';
      await agreement.save();
      return res.status(400).json({ error: 'Agreement has expired' });
    }

    const { description, attachments } = req.body;
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Please describe the service needed' });
    }

    const reqCount = await AgreementServiceRequest.countDocuments();
    const requestId = `SR-${String(reqCount + 1).padStart(6, '0')}`;

    const serviceRequest = new AgreementServiceRequest({
      requestId,
      agreementId: agreement.agreementId,
      originalBookingId: agreement.bookingId,
      customerId: req.userId,
      customerName: user.name,
      customerPhone: user.phone || '',
      originalProviderId: agreement.providerId,
      originalProviderName: agreement.providerName,
      serviceType: agreement.serviceType,
      category: agreement.category,
      location: agreement.location || user.location || '',
      description: description.trim(),
      attachments: attachments || [],
      status: 'PENDING_ADMIN_ASSIGNMENT',
      paymentRequired: agreement.templateSnapshot?.paymentModel !== 'covered'
    });
    await serviceRequest.save();

    agreement.serviceRequestCount = (agreement.serviceRequestCount || 0) + 1;
    await agreement.save();

    await AgreementAuditLog.create({
      agreementId: agreement.agreementId,
      serviceRequestId: requestId,
      action: 'created',
      performedBy: req.userId,
      performedByRole: 'customer',
      details: { description: description.trim() }
    });

    // Notify admins
    const admins = await User.find({ userType: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id.toString(),
        title: 'New Agreement Service Request',
        message: `${user.name} requested service under agreement ${agreement.agreementId}: ${description.substring(0, 80)}`,
        type: 'agreement_request',
        link: requestId
      });
    }

    // Notify customer
    await Notification.create({
      userId: req.userId,
      title: 'Service Request Submitted',
      message: `Your service request ${requestId} has been submitted. ServiceHub will assign a provider shortly.`,
      type: 'agreement_request',
      link: requestId
    });

    res.status(201).json(serviceRequest);
  } catch (err) {
    console.error('Create service request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List service requests for an agreement
app.get('/api/agreements/:id/service-requests', auth, async (req, res) => {
  try {
    const agreement = await ServiceAgreement.findOne({ agreementId: req.params.id });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    const user = await User.findById(req.userId);
    if (user.userType === 'customer' && agreement.customerId !== req.userId) return res.status(403).json({ error: 'Not your agreement' });
    if (user.userType === 'provider' && agreement.providerId !== req.userId) return res.status(403).json({ error: 'Not assigned to you' });
    const requests = await AgreementServiceRequest.find({ agreementId: req.params.id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer confirms service completion
app.post('/api/agreement-service-requests/:id/customer-confirm', auth, async (req, res) => {
  try {
    const sr = await AgreementServiceRequest.findOne({ requestId: req.params.id });
    if (!sr) return res.status(404).json({ error: 'Service request not found' });
    if (sr.customerId !== req.userId) return res.status(403).json({ error: 'Not your request' });
    if (sr.status !== 'SERVICE_COMPLETED') return res.status(400).json({ error: `Cannot confirm in status ${sr.status}` });

    sr.status = 'COMPLETED';
    sr.completedAt = new Date();
    await sr.save();

    await AgreementAuditLog.create({
      agreementId: sr.agreementId,
      serviceRequestId: sr.requestId,
      action: 'completed',
      performedBy: req.userId,
      performedByRole: 'customer'
    });

    if (sr.assignedProviderId) {
      await Notification.create({
        userId: sr.assignedProviderId,
        title: 'Service Confirmed Complete',
        message: `Customer confirmed completion of service request ${sr.requestId}.`,
        type: 'agreement_request'
      });
    }

    res.json({ success: true, serviceRequest: sr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════
// ── SERVICE AGREEMENT: Admin Routes ──────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

// List all agreements
app.get('/api/admin/agreements', auth, adminOnly, async (req, res) => {
  try {
    const agreements = await ServiceAgreement.find().sort({ createdAt: -1 });
    res.json(agreements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agreement templates CRUD
app.get('/api/admin/agreement-templates', auth, adminOnly, async (req, res) => {
  try {
    const templates = await AgreementTemplate.find().sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/agreement-templates', auth, adminOnly, async (req, res) => {
  try {
    const template = new AgreementTemplate(req.body);
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/agreement-templates/:id', auth, adminOnly, async (req, res) => {
  try {
    // Create new version instead of overwriting
    const existing = await AgreementTemplate.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Template not found' });
    const updates = { ...req.body };
    if (Object.keys(updates).some(k => ['terms', 'coveredServices', 'excludedServices', 'warrantyRules', 'cancellationRules', 'renewalRules'].includes(k))) {
      updates.version = (existing.version || 1) + 1;
    }
    const template = await AgreementTemplate.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List pending service requests (admin)
app.get('/api/admin/agreement-service-requests', auth, adminOnly, async (req, res) => {
  try {
    const requests = await AgreementServiceRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign provider to service request
app.post('/api/admin/agreement-service-requests/:id/assign', auth, adminOnly, async (req, res) => {
  try {
    const { providerId } = req.body;
    const sr = await AgreementServiceRequest.findOne({ requestId: req.params.id });
    if (!sr) return res.status(404).json({ error: 'Service request not found' });
    if (!['PENDING_ADMIN_ASSIGNMENT', 'PROVIDER_DECLINED'].includes(sr.status)) {
      return res.status(400).json({ error: `Cannot assign in status ${sr.status}` });
    }

    const provider = await User.findById(providerId);
    if (!provider || provider.userType !== 'provider') return res.status(404).json({ error: 'Provider not found' });

    sr.assignedProviderId = providerId;
    sr.assignedProviderName = provider.name;
    sr.status = 'PROVIDER_ASSIGNED';
    sr.assignedAt = new Date();
    await sr.save();

    await AgreementAuditLog.create({
      agreementId: sr.agreementId,
      serviceRequestId: sr.requestId,
      action: 'assigned',
      performedBy: req.userId,
      performedByRole: 'admin',
      details: { providerId, providerName: provider.name }
    });

    // Create chat conversation for this service request
    const chatConv = new ChatConversation({
      bookingId: sr.requestId,
      customerId: sr.customerId,
      customerName: sr.customerName,
      providerId: providerId,
      providerName: provider.name,
      serviceType: sr.serviceType,
      category: sr.category,
      lastMessage: `Service request ${sr.requestId} — provider assigned.`,
      lastMessageSenderRole: 'system',
      status: 'open'
    });
    await chatConv.save();
    sr.chatConversationId = chatConv._id.toString();
    await sr.save();

    // Notify provider
    await Notification.create({
      userId: providerId,
      title: 'New Agreement Service Request',
      message: `Admin assigned service request ${sr.requestId} (${sr.serviceType}) from ${sr.customerName}.`,
      type: 'agreement_request',
      link: sr.requestId
    });

    // Notify customer
    await Notification.create({
      userId: sr.customerId,
      title: 'Provider Assigned',
      message: `${provider.name} has been assigned to your service request ${sr.requestId}.`,
      type: 'agreement_request',
      link: sr.requestId
    });

    res.json({ success: true, serviceRequest: sr });
  } catch (err) {
    console.error('Admin assign error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin update agreement status
app.put('/api/admin/agreements/:id/status', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const agreement = await ServiceAgreement.findOne({ agreementId: req.params.id });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    const validStatuses = ['CANCELLED', 'EXPIRED'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status transition' });
    agreement.status = status;
    await agreement.save();

    await AgreementAuditLog.create({
      agreementId: agreement.agreementId,
      action: 'status_change',
      performedBy: req.userId,
      performedByRole: 'admin',
      details: { newStatus: status }
    });

    res.json({ success: true, agreement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════
// ── SERVICE AGREEMENT: Provider Routes ───────────────────────────────
// ══════════════════════════════════════════════════════════════════════

// List assigned service requests
app.get('/api/provider/agreement-service-requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'provider') return res.status(403).json({ error: 'Provider access required' });
    const requests = await AgreementServiceRequest.find({
      assignedProviderId: req.userId,
      status: { $nin: ['COMPLETED', 'CANCELLED'] }
    }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Provider accepts request
app.post('/api/provider/agreement-service-requests/:id/accept', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'provider') return res.status(403).json({ error: 'Provider access required' });

    const sr = await AgreementServiceRequest.findOne({ requestId: req.params.id });
    if (!sr) return res.status(404).json({ error: 'Service request not found' });
    if (sr.assignedProviderId !== req.userId) return res.status(403).json({ error: 'Not assigned to you' });
    if (sr.status !== 'PROVIDER_ASSIGNED') return res.status(400).json({ error: `Cannot accept in status ${sr.status}` });

    sr.status = 'PROVIDER_ACCEPTED';
    sr.acceptedAt = new Date();
    await sr.save();

    await AgreementAuditLog.create({
      agreementId: sr.agreementId,
      serviceRequestId: sr.requestId,
      action: 'accepted',
      performedBy: req.userId,
      performedByRole: 'provider'
    });

    await Notification.create({
      userId: sr.customerId,
      title: 'Provider Accepted',
      message: `${user.name} accepted your service request ${sr.requestId}.`,
      type: 'agreement_request'
    });

    res.json({ success: true, serviceRequest: sr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Provider declines request
app.post('/api/provider/agreement-service-requests/:id/decline', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'provider') return res.status(403).json({ error: 'Provider access required' });

    const sr = await AgreementServiceRequest.findOne({ requestId: req.params.id });
    if (!sr) return res.status(404).json({ error: 'Service request not found' });
    if (sr.assignedProviderId !== req.userId) return res.status(403).json({ error: 'Not assigned to you' });
    if (sr.status !== 'PROVIDER_ASSIGNED') return res.status(400).json({ error: `Cannot decline in status ${sr.status}` });

    sr.status = 'PROVIDER_DECLINED';
    sr.providerNotes = req.body.reason || '';
    await sr.save();

    await AgreementAuditLog.create({
      agreementId: sr.agreementId,
      serviceRequestId: sr.requestId,
      action: 'declined',
      performedBy: req.userId,
      performedByRole: 'provider',
      details: { reason: req.body.reason || '' }
    });

    // Notify admins to reassign
    const admins = await User.find({ userType: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id.toString(),
        title: 'Provider Declined Request',
        message: `${user.name} declined service request ${sr.requestId}. Reassignment needed.`,
        type: 'agreement_request'
      });
    }

    await Notification.create({
      userId: sr.customerId,
      title: 'Provider Update',
      message: `The assigned provider declined your request ${sr.requestId}. Admin will reassign a new provider.`,
      type: 'agreement_request'
    });

    res.json({ success: true, serviceRequest: sr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Provider updates service status
app.post('/api/provider/agreement-service-requests/:id/update-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'provider') return res.status(403).json({ error: 'Provider access required' });

    const sr = await AgreementServiceRequest.findOne({ requestId: req.params.id });
    if (!sr) return res.status(404).json({ error: 'Service request not found' });
    if (sr.assignedProviderId !== req.userId) return res.status(403).json({ error: 'Not assigned to you' });

    const { status } = req.body;
    const allowedTransitions = {
      'PROVIDER_ACCEPTED': ['SERVICE_IN_PROGRESS'],
      'SERVICE_IN_PROGRESS': ['SERVICE_COMPLETED']
    };
    if (!allowedTransitions[sr.status]?.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from ${sr.status} to ${status}` });
    }

    sr.status = status;
    await sr.save();

    await AgreementAuditLog.create({
      agreementId: sr.agreementId,
      serviceRequestId: sr.requestId,
      action: 'status_change',
      performedBy: req.userId,
      performedByRole: 'provider',
      details: { newStatus: status }
    });

    const statusMessages = {
      'SERVICE_IN_PROGRESS': `${user.name} has started working on your service request ${sr.requestId}.`,
      'SERVICE_COMPLETED': `${user.name} has completed the service for request ${sr.requestId}. Please confirm completion.`
    };

    await Notification.create({
      userId: sr.customerId,
      title: status === 'SERVICE_COMPLETED' ? 'Service Completed' : 'Service Update',
      message: statusMessages[status] || `Service request ${sr.requestId} status updated to ${status}.`,
      type: 'agreement_request'
    });

    res.json({ success: true, serviceRequest: sr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



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

    // Auto-seed Training Courses if empty
    const trainingCount = await TrainingCourse.countDocuments();
    if (trainingCount === 0) {
      await TrainingCourse.insertMany([
        {
          title: 'Safety Standards & PPE Compliance',
          category: 'safety',
          badgeName: 'Certified Safety Specialist',
          durationHours: 3,
          level: 'Basic',
          description: 'Comprehensive occupational safety, electrical shock prevention, high-pressure plumbing protection, and client site hygiene.',
          topicsCovered: ['PPE Equipment Usage', 'Shock Prevention', 'Chemical Safety in Cleaning', 'Customer Home Etiquette'],
          passingScore: 85,
          enrolledCount: 340
        },
        {
          title: 'Advanced Inverter AC Diagnostics & Leak Detection',
          category: 'hvac',
          badgeName: 'HVAC Master Technician',
          durationHours: 6,
          level: 'Advanced',
          description: 'Master troubleshooting inverter compressor faults, eco-refrigerant R32 charging, and electronic expansion valve testing.',
          topicsCovered: ['R32/R410A Refrigerant Recovery', 'Micro-leak UV Detection', 'PCB Diagnostics', 'Airflow Optimization'],
          passingScore: 90,
          enrolledCount: 210
        },
        {
          title: 'Smart Home Automation & Modular Electricals',
          category: 'electrical',
          badgeName: 'Smart Home Certified',
          durationHours: 5,
          level: 'Intermediate',
          description: 'Wiring smart touch switches, modular distribution boards, surge protection devices, and IoT gateway connectivity.',
          topicsCovered: ['Neutral Wire Load Distribution', 'Smart WiFi Relays', 'Earthing Resistance Testing', 'Surge Arrestors'],
          passingScore: 85,
          enrolledCount: 280
        },
        {
          title: 'Precision CPVC/PPR Plumbing & Hydrostatic Testing',
          category: 'plumbing',
          badgeName: 'Precision Plumbing Master',
          durationHours: 4,
          level: 'Master',
          description: 'Certified fusion welding for PPR pipes, multi-story water pressure balancing, concealed shower diverter installation.',
          topicsCovered: ['Heat Fusion Technique', 'Concealed Valve Calibration', 'Pressure Regulating Valves', 'Anti-siphon Systems'],
          passingScore: 85,
          enrolledCount: 195
        }
      ]);
      console.log('🌱 Seeded Provider Training & Certification Courses!');
    }

    // Auto-seed Reward Rules if empty
    const rulesCount = await RewardRule.countDocuments();
    if (rulesCount === 0) {
      await RewardRule.create({
        pointsPerHundredRupees: 5,
        redemptionRate: 1,
        welcomeBonusPoints: 100,
        referralBonusRupees: 150,
        emergencySurcharge: 150,
        activeCampaignName: 'Festival Service Rewards Extravaganza',
        activeCampaignMultiplier: 1.5
      });
      console.log('🌱 Seeded Default Reward Rules & Loyalty Campaigns!');
    }

    // ══════════════════════════════════════════════════════════════════════
    // ── CUSTOMER RETENTION REST APIS ─────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // 1. Customer Retention Summary (Wallet, Rewards, Warranties, Membership, History)
    app.get('/api/customer/retention-summary', auth, async (req, res) => {
      try {
        const user = await User.findById(req.userId);
        const wallet = await getOrCreateCustomerWallet(req.userId, user?.name);
        const membership = await getOrCreateCustomerMembership(req.userId, user?.name, user?.email);
        
        // Auto-generate warranty for completed bookings if missing
        const completedBookings = await Booking.find({ userId: req.userId, status: 'Completed' });
        for (const b of completedBookings) {
          await createOrUpdateWarrantyForBooking(b);
        }

        const warranties = await Warranty.find({ userId: req.userId }).sort({ createdAt: -1 });
        const allBookings = await Booking.find({ userId: req.userId }).sort({ createdAt: -1 });
        const rule = (await RewardRule.findOne()) || { pointsPerHundredRupees: 5, redemptionRate: 1 };

        res.json({
          wallet: {
            balance: wallet.balance,
            cashbackBalance: wallet.cashbackBalance,
            promoCredits: wallet.promoCredits,
            rewardPoints: wallet.rewardPoints,
            referralCode: wallet.referralCode,
            totalEarned: wallet.totalEarned,
            transactions: wallet.transactions
          },
          membership,
          activeWarranties: warranties.filter(w => w.status === 'Active' && !w.isUsed && (!w.claims || !w.claims.some(c => c.status === 'Resolved' || c.status === 'Pending' || c.status === 'Specialist Assigned'))),
          claimedWarranties: warranties.filter(w => w.status === 'Claimed' || (w.claims && w.claims.some(c => c.status === 'Pending' || c.status === 'Specialist Assigned'))),
          fulfilledWarranties: warranties.filter(w => w.status === 'Fulfilled' || w.isUsed || (w.claims && w.claims.some(c => c.status === 'Resolved'))),
          allWarranties: warranties,
          serviceHistory: allBookings,
          rules: rule
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 2. Warranties List
    app.get('/api/warranties', auth, async (req, res) => {
      try {
        const warranties = await Warranty.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(warranties);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 3. File Warranty Claim
    app.post('/api/warranties/:id/claim', auth, async (req, res) => {
      try {
        const { issueDescription } = req.body;
        if (!issueDescription) {
          return res.status(400).json({ error: 'Issue description is required to file a warranty claim' });
        }

        const warranty = await Warranty.findOne({ _id: req.params.id, userId: req.userId });
        if (!warranty) {
          return res.status(404).json({ error: 'Warranty not found' });
        }

        if (warranty.status === 'Fulfilled' || warranty.isUsed || (warranty.claims && warranty.claims.some(c => c.status === 'Resolved'))) {
          return res.status(400).json({ error: 'This warranty protection claim has already been used and fulfilled.' });
        }

        const newClaim = {
          id: `CLM-${Date.now()}`,
          claimDate: new Date(),
          issueDescription,
          status: 'Pending',
          resolutionNotes: 'Claim received. Quality team is dispatching a specialist for zero-cost inspection.',
          assignedProviderId: warranty.providerId,
          assignedProviderName: warranty.providerName
        };

        warranty.claims.push(newClaim);
        warranty.status = 'Claimed';
        await warranty.save();

        // Notify user & provider
        await createAndSendNotification({
          userId: req.userId,
          title: '🛡️ Warranty Claim Received',
          message: `Claim filed for ${warranty.serviceName} (#${warranty.warrantyNumber}). A free specialist review is in progress.`,
          type: 'warranty_claim'
        });

        res.json({ success: true, warranty, claim: newClaim });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 4. Customer Wallet Topup / Redeem
    app.get('/api/wallet', auth, async (req, res) => {
      try {
        const user = await User.findById(req.userId);
        const wallet = await getOrCreateCustomerWallet(req.userId, user?.name);
        res.json(wallet);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/wallet/topup', auth, async (req, res) => {
      try {
        const { amount, description } = req.body;
        const topupAmt = Math.max(0, parseInt(amount) || 0);
        if (topupAmt <= 0) return res.status(400).json({ error: 'Invalid topup amount' });

        const wallet = await getOrCreateCustomerWallet(req.userId);
        wallet.balance += topupAmt;
        wallet.totalEarned += topupAmt;
        wallet.transactions.unshift({
          id: `WT-${Date.now()}`,
          type: 'topup',
          amount: topupAmt,
          description: description || 'Wallet cash top-up credited.',
          date: new Date()
        });
        await wallet.save();
        res.json(wallet);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/wallet/redeem', auth, async (req, res) => {
      try {
        const { amount, bookingId, description } = req.body;
        const redeemAmt = Math.max(0, parseInt(amount) || 0);
        const wallet = await getOrCreateCustomerWallet(req.userId);

        if (redeemAmt > wallet.balance) {
          return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        wallet.balance -= redeemAmt;
        wallet.totalSpent += redeemAmt;
        wallet.transactions.unshift({
          id: `WT-${Date.now()}`,
          type: 'booking_payment',
          amount: redeemAmt,
          description: description || `Wallet discount applied for booking #${bookingId || ''}`,
          bookingId: bookingId || null,
          date: new Date()
        });
        await wallet.save();
        res.json({ success: true, newBalance: wallet.balance, redeemed: redeemAmt });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/wallet/withdraw', auth, async (req, res) => {
      try {
        const { amount, upiId } = req.body;
        const withdrawAmt = Math.max(0, parseInt(amount) || 0);
        if (withdrawAmt <= 0) {
          return res.status(400).json({ error: 'Please enter a valid withdrawal amount' });
        }
        if (!upiId || !upiId.trim() || !upiId.includes('@')) {
          return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g. name@okhdfcbank or 9840994649@paytm)' });
        }

        const wallet = await getOrCreateCustomerWallet(req.userId);
        if (withdrawAmt > wallet.balance) {
          return res.status(400).json({ error: `Insufficient wallet balance. Available balance: ₹${wallet.balance}` });
        }

        wallet.balance -= withdrawAmt;
        wallet.totalSpent += withdrawAmt;
        const txId = `WT-${Date.now()}`;
        wallet.transactions.unshift({
          id: txId,
          type: 'withdrawal',
          amount: withdrawAmt,
          description: `Transferred ₹${withdrawAmt} to bank account via UPI (${upiId.trim()})`,
          date: new Date()
        });
        await wallet.save();

        await createAndSendNotification({
          userId: req.userId,
          title: '💸 Wallet Withdrawal Processed',
          message: `₹${withdrawAmt} has been deposited to your account (${upiId.trim()}). Transaction Ref: ${txId}`,
          type: 'wallet_withdrawal'
        });

        res.json({
          success: true,
          newBalance: wallet.balance,
          withdrawnAmount: withdrawAmt,
          upiId: upiId.trim(),
          transactionId: txId,
          wallet
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });


    // 5. Reward Points API
    app.get('/api/rewards', auth, async (req, res) => {
      try {
        const wallet = await getOrCreateCustomerWallet(req.userId);
        const rule = (await RewardRule.findOne()) || { pointsPerHundredRupees: 5, redemptionRate: 1 };
        res.json({
          rewardPoints: wallet.rewardPoints,
          cashbackBalance: wallet.cashbackBalance,
          referralCode: wallet.referralCode,
          rule
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/rewards/redeem', auth, async (req, res) => {
      try {
        const { pointsToRedeem } = req.body;
        const points = Math.max(0, parseInt(pointsToRedeem) || 0);
        const wallet = await getOrCreateCustomerWallet(req.userId);
        const rule = (await RewardRule.findOne()) || { redemptionRate: 1 };

        if (points > wallet.rewardPoints) {
          return res.status(400).json({ error: 'Insufficient reward points' });
        }

        const rupeeVal = Math.round(points * rule.redemptionRate);
        wallet.rewardPoints -= points;
        wallet.balance += rupeeVal;
        wallet.cashbackBalance += rupeeVal;
        wallet.totalEarned += rupeeVal;
        wallet.transactions.unshift({
          id: `WT-${Date.now()}`,
          type: 'reward_redemption',
          amount: rupeeVal,
          description: `Converted ${points} loyalty points into ₹${rupeeVal} wallet cashback.`,
          date: new Date()
        });
        await wallet.save();
        res.json({ success: true, newPoints: wallet.rewardPoints, newBalance: wallet.balance });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 6. Membership Plans
    app.get('/api/memberships/plans', (req, res) => {
      res.json([
        {
          id: 'free',
          name: 'Free Shield',
          price: 0,
          billing: 'Free Forever',
          discount: '0% off',
          warranty: '90-Day Standard Warranty',
          badge: 'Standard',
          features: ['Standard Provider Dispatch', '90-Day Workmanship Warranty', 'Split Invoice Downloads', 'Community Reviews Access']
        },
        {
          id: 'silver',
          name: 'Silver Shield Plus',
          price: 299,
          billing: '₹299 for 6 Months',
          discount: '5% Off All Services',
          warranty: '120-Day Extended Warranty',
          badge: 'Popular',
          features: ['5% Instant Bill Discount', '120-Day Extended Warranty', 'Priority Specialist Dispatch', '1 Free Annual AC Inspection', 'Zero Cancellation Charges']
        },
        {
          id: 'gold',
          name: 'Gold Home Protection',
          price: 599,
          billing: '₹599 / Year',
          discount: '10% Off All Services',
          warranty: '180-Day Double Warranty',
          badge: 'Best Value',
          features: ['10% Instant Bill Discount', '180-Day Extended Warranty', 'Priority Emergency Dispatch (30-min SLA)', '2 Free Annual Plumbing & Electrical Audits', 'Dedicated WhatsApp Concierge']
        },
        {
          id: 'platinum',
          name: 'Platinum VIP Shield',
          price: 999,
          billing: '₹999 / Year',
          discount: '15% Off All Services',
          warranty: '365-Day 1-Year Full Coverage',
          badge: 'VIP Elite',
          features: ['15% Instant Bill Discount', '365-Day Full Year Warranty', 'Zero Emergency Surcharges', 'Unlimited Priority Dispatches', 'VIP Account Manager & 24/7 Hotline']
        }
      ]);
    });

    app.post('/api/memberships/subscribe', auth, async (req, res) => {
      try {
        const { planType } = req.body;
        const validPlans = {
          free: { name: 'ServiceHub Free Shield', price: 0, discount: 0, months: 0 },
          silver: { name: 'Silver Shield Plus', price: 299, discount: 5, months: 6 },
          gold: { name: 'Gold Home Protection', price: 599, discount: 10, months: 12 },
          platinum: { name: 'Platinum VIP Shield', price: 999, discount: 15, months: 12 }
        };

        const target = validPlans[planType] || validPlans.free;
        const user = await User.findById(req.userId);
        const membership = await getOrCreateCustomerMembership(req.userId, user?.name, user?.email);

        membership.planType = planType;
        membership.planName = target.name;
        membership.discountPercent = target.discount;
        membership.amountPaid = target.price;
        membership.startDate = new Date();
        if (target.months > 0) {
          const exp = new Date();
          exp.setMonth(exp.getMonth() + target.months);
          membership.expiresAt = exp;
        } else {
          membership.expiresAt = null;
        }
        await membership.save();

        res.json({ success: true, membership });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 7. One-Click Rebooking Payload Generator
    app.get('/api/customer/rebooking/:bookingId', auth, async (req, res) => {
      try {
        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        const provider = await User.findById(booking.providerId) || {
          id: booking.providerId,
          name: booking.providerName,
          category: booking.category,
          location: booking.location,
          phone: booking.phone
        };

        res.json({
          providerId: booking.providerId,
          providerName: booking.providerName,
          category: booking.category,
          serviceType: booking.serviceType,
          location: booking.location,
          phone: booking.phone,
          serviceItems: booking.serviceItems || []
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ══════════════════════════════════════════════════════════════════════
    // ── PROVIDER BUSINESS CENTER REST APIS ───────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // 1. Provider Business Analytics
    app.get('/api/provider-business/analytics', auth, async (req, res) => {
      try {
        const providerId = req.userId;
        const allBookings = await Booking.find({ providerId });
        const completed = allBookings.filter(b => b.status === 'Completed');
        const cancelled = allBookings.filter(b => b.status === 'Cancelled');

        // Calculate today's earnings
        const todayStr = new Date().toISOString().split('T')[0];
        const todayBookings = completed.filter(b => b.date === todayStr || (b.createdAt && b.createdAt.toISOString().split('T')[0] === todayStr));
        const todayEarnings = todayBookings.reduce((sum, b) => sum + (b.priceBreakdown?.providerEarnings || parsePrice(b.price) || 0), 0);

        // Monthly & Yearly
        const totalEarnings = completed.reduce((sum, b) => sum + (b.priceBreakdown?.providerEarnings || parsePrice(b.price) || 0), 0);
        const monthlyEarnings = Math.round(totalEarnings * 0.45) || (completed.length * 450);
        const yearlyEarnings = totalEarnings || (completed.length * 520);

        // Repeat customers count
        const customerMap = {};
        allBookings.forEach(b => {
          if (b.customerEmail) customerMap[b.customerEmail] = (customerMap[b.customerEmail] || 0) + 1;
        });
        const repeatCount = Object.values(customerMap).filter(count => count > 1).length;

        // Popular services breakdown
        const serviceCountMap = {};
        completed.forEach(b => {
          const sName = b.serviceType || 'General Service';
          serviceCountMap[sName] = (serviceCountMap[sName] || 0) + 1;
        });

        const popularServices = Object.keys(serviceCountMap).map(k => ({
          name: k,
          count: serviceCountMap[k],
          percentage: Math.round((serviceCountMap[k] / Math.max(1, completed.length)) * 100)
        }));

        res.json({
          todayEarnings,
          monthlyEarnings,
          yearlyEarnings,
          totalCompleted: completed.length,
          totalCancelled: cancelled.length,
          repeatCustomers: repeatCount,
          averageRating: 4.9,
          growthRate: '+24.6% vs last month',
          popularServices
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 2. Provider Reputation System — Real Customer Reviews from Completed Bookings
    app.get('/api/provider-business/reputation', auth, async (req, res) => {
      try {
        const pLevel = await getOrCreateProviderLevel(req.userId);
        const providerUser = await User.findById(req.userId);
        const allBookings = await Booking.find({ 
          $or: [{ providerId: req.userId }, ...(providerUser?.name ? [{ providerName: providerUser.name }] : [])]
        });
        const completed = allBookings.filter(b => b.status === 'Completed');

        // Query real reviews submitted by customers who booked this provider
        const realReviews = await Review.find({
          $or: [
            { providerId: req.userId },
            { providerId: req.userId.toString() },
            ...(providerUser?.name ? [{ providerName: providerUser.name }] : [])
          ]
        }).sort({ createdAt: -1 });

        const totalRealReviews = realReviews.length;
        const realAvgRating = totalRealReviews > 0
          ? +(realReviews.reduce((s, r) => s + r.rating, 0) / totalRealReviews).toFixed(1)
          : (completed.length > 0 ? 4.9 : 5.0);

        // Dynamically compute verified trust score from genuine ratings & completed work
        const dynamicTrustScore = Math.min(100, Math.round(
          (realAvgRating / 5.0 * 50) + 
          Math.min(25, completed.length * 2.5) + 
          ((pLevel.onTimePercentage || 98) * 0.25)
        ));

        const formattedReviews = realReviews.map(r => ({
          id: r.id || r._id.toString(),
          customerName: r.customerName || 'Verified Customer',
          rating: r.rating || 5,
          comment: r.comment || 'Job completed professionally and on schedule.',
          serviceType: r.serviceType || 'Service Completed',
          bookingId: r.bookingId,
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'
        }));

        res.json({
          verifiedBadge: true,
          trustScore: dynamicTrustScore,
          onTimePercentage: pLevel.onTimePercentage || 98,
          responseRatePercentage: pLevel.responseRatePercentage || 99,
          completedJobs: Math.max(pLevel.completedJobsCount || 0, completed.length),
          repeatCustomers: pLevel.repeatCustomersCount || Math.round(completed.length * 0.3),
          averageRating: realAvgRating,
          totalReviewsCount: totalRealReviews,
          experienceLevel: pLevel.experienceYears || '5+ Yrs',
          recentReviews: formattedReviews
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 3. Provider Membership Levels (Bronze -> Silver -> Gold -> Platinum)
    app.get('/api/provider-business/levels', auth, async (req, res) => {
      try {
        const pLevel = await getOrCreateProviderLevel(req.userId);
        const tiers = [
          { name: 'Bronze', minJobs: 0, commissionDiscount: '0%', perks: ['Standard Leads', 'Profile Listing', 'Standard Settlement'] },
          { name: 'Silver', minJobs: 15, commissionDiscount: '1% Off', perks: ['Verified Specialist Badge', '1.25x Priority Leads', 'Direct WhatsApp Contact', '1% Commission Discount'] },
          { name: 'Gold', minJobs: 40, commissionDiscount: '2% Off', perks: ['Top Specialist Gold Badge', '1.5x Lead Priority', 'Free Safety Tool Kit', '2% Commission Discount', 'Exclusive Wholesale Spares'] },
          { name: 'Platinum', minJobs: 100, commissionDiscount: '3% Off', perks: ['Elite Platinum Badge', '2.0x Top Dispatch Priority', 'Zero Platform Commission Days', 'Dedicated Service Manager', 'Instant Same-Day Settlement'] }
        ];

        res.json({
          currentTier: pLevel.tier,
          trustScore: pLevel.trustScore,
          completedJobs: pLevel.completedJobsCount,
          unlockedPerks: pLevel.unlockedPerks,
          tiers
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 4. Provider Business Reports (Monthly Summary, Invoices, Export)
    app.get('/api/provider-business/reports', auth, async (req, res) => {
      try {
        const bookings = await Booking.find({ providerId: req.userId, status: 'Completed' }).sort({ createdAt: -1 });
        const summary = {
          generatedAt: new Date(),
          totalInvoicedJobs: bookings.length,
          grossRevenue: bookings.reduce((sum, b) => sum + (b.priceBreakdown?.subtotal || parsePrice(b.price) || 0), 0),
          netProviderEarnings: bookings.reduce((sum, b) => sum + (b.priceBreakdown?.providerEarnings || parsePrice(b.price) || 0), 0),
          platformCommissionPaid: bookings.reduce((sum, b) => sum + (b.priceBreakdown?.platformCommission || 0), 0),
          monthlyBreakdown: [
            { month: 'Current Month', jobs: bookings.length, revenue: bookings.reduce((sum, b) => sum + (b.priceBreakdown?.providerEarnings || 0), 0) },
            { month: 'Previous Month', jobs: Math.max(1, Math.round(bookings.length * 0.8)), revenue: 14500 },
            { month: 'Two Months Ago', jobs: Math.max(1, Math.round(bookings.length * 0.6)), revenue: 11200 }
          ],
          bookingsList: bookings.map(b => ({
            id: b.id,
            trackingId: b.trackingId,
            date: b.date,
            customer: b.customerName,
            service: b.serviceType,
            amount: b.priceBreakdown?.subtotal || parsePrice(b.price),
            earnings: b.priceBreakdown?.providerEarnings || parsePrice(b.price),
            commission: b.priceBreakdown?.platformCommission || 0
          }))
        };
        res.json(summary);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 5. Provider Wallet & Withdrawal
    app.get('/api/provider-business/wallet', auth, async (req, res) => {
      try {
        const user = await User.findById(req.userId);
        const pWallet = await getOrCreateProviderWallet(req.userId, user?.name, user?.phone);
        res.json(pWallet);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/provider-business/wallet/withdraw', auth, async (req, res) => {
      try {
        const { amount, upiId } = req.body;
        const withdrawAmt = Math.max(0, parseInt(amount) || 0);
        if (withdrawAmt < 100) {
          return res.status(400).json({ error: 'Minimum withdrawal amount is ₹100' });
        }

        const user = await User.findById(req.userId);
        const pWallet = await getOrCreateProviderWallet(req.userId, user?.name, user?.phone);

        if (withdrawAmt > pWallet.availableBalance) {
          return res.status(400).json({ error: 'Insufficient available wallet balance' });
        }

        pWallet.availableBalance -= withdrawAmt;
        pWallet.pendingSettlement += withdrawAmt;
        const newRequest = {
          id: `PWR-${Date.now()}`,
          amount: withdrawAmt,
          upiId: upiId || user?.upiId || 'provider@upi',
          status: 'Pending',
          requestDate: new Date(),
          processedDate: null,
          adminNotes: 'Payout request queued for bank NEFT / UPI settlement.'
        };
        pWallet.payoutRequests.unshift(newRequest);
        pWallet.transactions.unshift({
          id: `PWT-${Date.now()}`,
          type: 'withdrawal',
          amount: withdrawAmt,
          description: `Withdrawal request submitted to UPI ID: ${upiId || 'provider@upi'}`,
          status: 'Pending',
          date: new Date()
        });
        await pWallet.save();

        res.json({ success: true, wallet: pWallet, request: newRequest });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 6. AI Business Insights (Future-Ready with Smart Heuristics)
    app.get('/api/provider-business/insights', auth, async (req, res) => {
      res.json({
        highDemandServices: [
          { service: 'Inverter AC Jet Pump Cleaning & Gas Leak Test', demandScore: 98, avgTicket: '₹1,200', surgeHours: '09:00 AM - 01:00 PM' },
          { service: 'Concealed Bathroom Pipe Replacement & Pressure Balancing', demandScore: 92, avgTicket: '₹1,850', surgeHours: '07:30 AM - 11:30 AM' },
          { service: 'MCB Tripping & Modular Circuit Diagnostics', demandScore: 89, avgTicket: '₹750', surgeHours: '04:00 PM - 08:30 PM' }
        ],
        peakWorkingHours: 'Mon-Sat: 08:30 AM - 12:30 PM & 04:30 PM - 07:30 PM',
        seasonalTrends: 'Current Monsoon Season: High surge in water heater repairs, roof dampness waterproofing, and lightning surge arrestor installations.',
        businessTips: [
          'Offering 90-day digital warranty cards increases repeat booking chances by 68%.',
          'Supplying certified materials via Partner Shops earns you an additional 5% cashback.',
          'Completing safety certification boosts your Trust Score to 98/100 for top lead priority.'
        ]
      });
    });

    // 7. Materials Marketplace Benefits for Providers
    app.get('/api/provider-business/marketplace-benefits', auth, async (req, res) => {
      try {
        const shops = await PartnerShop.find({ status: 'Verified' }).limit(6);
        res.json({
          providerDiscountPercent: 12, // 12% wholesale discount for certified providers
          partnerShopsCount: shops.length,
          fastDeliveryTime: '30 - 45 Minutes on-site delivery',
          benefits: [
            '12% Exclusive Wholesale Discount on all branded electrical & plumbing spares',
            'Priority counter pickup with zero waiting time at all partner stores',
            '5% Cashback credited directly to Provider Wallet on every material order',
            '100% Genuine manufacturer warranty backed replacement'
          ],
          nearbyShops: shops
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 8. Provider Training & Certification Center
    app.get('/api/provider-business/training', auth, async (req, res) => {
      try {
        const courses = await TrainingCourse.find();
        const myCerts = await ProviderCertificate.find({ providerId: req.userId });
        res.json({ courses, myCertificates: myCerts });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/provider-business/training/:courseId/complete', auth, async (req, res) => {
      try {
        const course = await TrainingCourse.findById(req.params.courseId);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const user = await User.findById(req.userId);
        const certNumber = `SH-CERT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const certificate = new ProviderCertificate({
          certificateNumber: certNumber,
          providerId: req.userId,
          providerName: user?.name || 'Certified Specialist',
          courseId: course.id,
          courseTitle: course.title,
          category: course.category,
          score: 95,
          status: 'Active',
          verificationUrl: `/verify-cert/${certNumber}`
        });
        await certificate.save();

        // Update provider trust score
        const pLevel = await getOrCreateProviderLevel(req.userId);
        pLevel.trustScore = Math.min(100, pLevel.trustScore + 2);
        if (!pLevel.unlockedPerks.includes(course.badgeName)) {
          pLevel.unlockedPerks.push(course.badgeName);
        }
        await pLevel.save();

        res.json({ success: true, certificate, newTrustScore: pLevel.trustScore });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ══════════════════════════════════════════════════════════════════════
    // ── ADMIN RETENTION MANAGEMENT REST APIS ─────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // 1. Admin Retention Overview
    app.get('/api/admin/retention/overview', auth, async (req, res) => {
      try {
        const activeWarranties = await Warranty.countDocuments({ status: 'Active' });
        const claimedWarranties = await Warranty.countDocuments({ status: 'Claimed' });
        const activeMemberships = await CustomerMembership.countDocuments({ planType: { $ne: 'free' } });
        const providerWallets = await ProviderWallet.find();
        const pendingPayouts = providerWallets.reduce((sum, w) => sum + (w.pendingSettlement || 0), 0);
        const rules = (await RewardRule.findOne()) || {};

        res.json({
          activeWarranties,
          claimedWarranties,
          activeMemberships,
          pendingPayoutsTotal: pendingPayouts,
          rules
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 2. Admin Warranty Claims
    app.get('/api/admin/retention/warranty-claims', auth, async (req, res) => {
      try {
        const warrantiesWithClaims = await Warranty.find({ 'claims.0': { $exists: true } }).sort({ updatedAt: -1 });
        res.json(warrantiesWithClaims);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.put('/api/admin/retention/warranty-claims/:id', auth, async (req, res) => {
      try {
        const { status, resolutionNotes, assignedProviderId, assignedProviderName } = req.body;
        const warranty = await Warranty.findById(req.params.id);
        if (!warranty) return res.status(404).json({ error: 'Warranty not found' });

        const targetProviderId = assignedProviderId || warranty.providerId;
        const targetProviderName = assignedProviderName || warranty.providerName;

        if (warranty.claims.length > 0) {
          const lastClaim = warranty.claims[warranty.claims.length - 1];
          if (status) lastClaim.status = status;
          if (resolutionNotes) lastClaim.resolutionNotes = resolutionNotes;
          if (targetProviderId) lastClaim.assignedProviderId = targetProviderId;
          if (targetProviderName) lastClaim.assignedProviderName = targetProviderName;
        }

        if (status === 'Resolved') {
          warranty.status = 'Fulfilled';
          warranty.isUsed = true;
        } else if (status === 'Specialist Assigned' || status === 'Approved') {
          warranty.status = 'Claimed';
        }
        await warranty.save();

        // Send notifications
        if (targetProviderId) {
          await createAndSendNotification({
            userId: targetProviderId,
            title: '🛡️ Warranty Rework Assigned',
            message: `You have been assigned for zero-cost warranty rework for ${warranty.serviceName} (#${warranty.warrantyNumber}) requested by ${warranty.customerName}.`,
            type: 'warranty_rework_assigned'
          });
        }

        if (warranty.userId) {
          await createAndSendNotification({
            userId: warranty.userId,
            title: '🛡️ Specialist Assigned for Warranty Rework',
            message: `Specialist ${targetProviderName || 'assigned'} will inspect and resolve your rework claim for ${warranty.serviceName}.`,
            type: 'warranty_assigned'
          });
        }

        res.json({ success: true, warranty });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Provider Warranty Claims & Rework Dispatches
    app.get(['/api/provider/warranty-claims', '/api/provider-business/warranty-claims', '/api/warranties/provider/claims'], auth, async (req, res) => {
      try {
        const user = await User.findById(req.userId);
        const nameRegex = user?.name ? new RegExp(`^${user.name.trim()}$`, 'i') : null;
        const query = {
          $or: [
            { providerId: req.userId },
            { providerId: req.userId.toString() },
            { 'claims.assignedProviderId': req.userId },
            { 'claims.assignedProviderId': req.userId.toString() },
            ...(nameRegex ? [
              { providerName: nameRegex },
              { 'claims.assignedProviderName': nameRegex }
            ] : [])
          ],
          'claims.0': { $exists: true }
        };
        const claims = await Warranty.find(query).sort({ updatedAt: -1 });
        res.json(claims);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post(['/api/provider/warranty-claims/:id/resolve', '/api/provider-business/warranty-claims/:id/resolve'], auth, async (req, res) => {
      try {
        const { resolutionNotes } = req.body;
        const warranty = await Warranty.findById(req.params.id);
        if (!warranty) return res.status(404).json({ error: 'Warranty not found' });

        if (warranty.claims.length > 0) {
          const lastClaim = warranty.claims[warranty.claims.length - 1];
          lastClaim.status = 'Resolved';
          lastClaim.resolutionNotes = resolutionNotes || 'Warranty rework successfully inspected and resolved by specialist at zero cost.';
        }
        warranty.status = 'Fulfilled';
        warranty.isUsed = true;
        await warranty.save();

        if (warranty.userId) {
          await createAndSendNotification({
            userId: warranty.userId,
            title: '🛡️ Warranty Rework Completed',
            message: `Specialist ${warranty.providerName} has completed your free warranty rework for ${warranty.serviceName}. Your warranty claim is now fulfilled and completed.`,
            type: 'warranty_resolved',
            bookingId: warranty.bookingId
          });
        }

        res.json({ success: true, warranty });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Provider get warranty for booking
    app.get('/api/provider/bookings/:id/warranty', auth, async (req, res) => {
      try {
        const warranty = await Warranty.findOne({
          $or: [
            { bookingId: req.params.id },
            { trackingId: req.params.id }
          ]
        });
        res.json(warranty || null);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Provider sets/edits warranty days for a completed booking
    app.post('/api/provider/bookings/:id/set-warranty', auth, async (req, res) => {
      try {
        const { durationDays, coverageTerms } = req.body;
        const days = Math.max(1, parseInt(durationDays) || 30);

        let booking = await Booking.findById(req.params.id);
        if (!booking) {
          booking = await Booking.findOne({ trackingId: req.params.id });
        }
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);

        const terms = coverageTerms || `100% Free rework guarantee for ${days} days covering workmanship, quality check, and certified spare parts performance.`;

        let warranty = await Warranty.findOne({
          $or: [
            { bookingId: booking.id || booking._id.toString() },
            { trackingId: booking.trackingId }
          ]
        });

        if (warranty) {
          warranty.durationDays = days;
          warranty.startDate = startDate;
          warranty.expiryDate = expiryDate;
          warranty.status = 'Active';
          warranty.coverageTerms = terms;
          await warranty.save();
        } else {
          const wrnNumber = `SH-WRN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
          const providerUser = await User.findById(req.userId);
          warranty = new Warranty({
            warrantyNumber: wrnNumber,
            bookingId: booking.id || booking._id.toString(),
            trackingId: booking.trackingId || `SH-${Date.now()}`,
            userId: booking.userId,
            customerName: booking.customerName || 'Valued Customer',
            customerPhone: booking.phone || '',
            providerId: req.userId,
            providerName: booking.providerName || providerUser?.name || 'Certified Specialist',
            serviceName: booking.serviceType || 'Home Service',
            category: booking.category || 'General',
            serviceAmount: booking.priceBreakdown?.subtotal || 500,
            startDate,
            durationDays: days,
            expiryDate,
            status: 'Active',
            coverageTerms: terms
          });
          await warranty.save();
        }

        // Send push notification to Customer
        if (booking.userId) {
          await createAndSendNotification({
            userId: booking.userId,
            title: '🛡️ Workmanship Warranty Issued!',
            message: `Specialist ${warranty.providerName} has issued ${days}-day warranty protection for your ${warranty.serviceName} (Valid until ${expiryDate.toLocaleDateString()}).`,
            type: 'warranty_issued',
            bookingId: booking.id
          });
        }

        res.json({ success: true, warranty });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });


    // 3. Admin Retention Rules
    app.get('/api/admin/retention/rules', auth, async (req, res) => {
      try {
        const rules = (await RewardRule.findOne()) || await RewardRule.create({});
        res.json(rules);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.put('/api/admin/retention/rules', auth, async (req, res) => {
      try {
        const { pointsPerHundredRupees, redemptionRate, welcomeBonusPoints, referralBonusRupees, emergencySurcharge, activeCampaignName } = req.body;
        let rules = await RewardRule.findOne();
        if (!rules) rules = new RewardRule({});
        
        if (pointsPerHundredRupees !== undefined) rules.pointsPerHundredRupees = pointsPerHundredRupees;
        if (redemptionRate !== undefined) rules.redemptionRate = redemptionRate;
        if (welcomeBonusPoints !== undefined) rules.welcomeBonusPoints = welcomeBonusPoints;
        if (referralBonusRupees !== undefined) rules.referralBonusRupees = referralBonusRupees;
        if (emergencySurcharge !== undefined) rules.emergencySurcharge = emergencySurcharge;
        if (activeCampaignName !== undefined) rules.activeCampaignName = activeCampaignName;
        
        await rules.save();
        res.json({ success: true, rules });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 4. Admin Provider Payout Requests
    app.get('/api/admin/retention/payout-requests', auth, async (req, res) => {
      try {
        const wallets = await ProviderWallet.find({ 'payoutRequests.0': { $exists: true } });
        const allRequests = [];
        wallets.forEach(w => {
          w.payoutRequests.forEach(r => {
            allRequests.push({
              providerId: w.providerId,
              providerName: w.providerName,
              providerPhone: w.providerPhone,
              ...r.toObject()
            });
          });
        });
        res.json(allRequests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.put('/api/admin/retention/payout-requests/:id', auth, async (req, res) => {
      try {
        const { status, referenceId, adminNotes } = req.body;
        const wallet = await ProviderWallet.findOne({ 'payoutRequests.id': req.params.id });
        if (!wallet) return res.status(404).json({ error: 'Payout request not found' });

        const reqObj = wallet.payoutRequests.find(r => r.id === req.params.id);
        if (reqObj) {
          reqObj.status = status || 'Transferred';
          if (referenceId) reqObj.referenceId = referenceId;
          if (adminNotes) reqObj.adminNotes = adminNotes;
          reqObj.processedDate = new Date();

          if (status === 'Transferred') {
            wallet.pendingSettlement = Math.max(0, wallet.pendingSettlement - reqObj.amount);
            wallet.totalWithdrawn += reqObj.amount;
          } else if (status === 'Rejected') {
            wallet.pendingSettlement = Math.max(0, wallet.pendingSettlement - reqObj.amount);
            wallet.availableBalance += reqObj.amount; // Refund to wallet
          }
        }
        await wallet.save();

        res.json({ success: true, wallet });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 5. Admin Top 5 Providers Performance Leaderboard
    app.get('/api/admin/retention/top-providers', auth, async (req, res) => {
      try {
        const providers = await User.find({ userType: 'provider' });
        const results = [];

        const recommendedBonuses = [
          { rank: 1, bonus: 1500, title: '🥇 #1 Star Specialist Platform Award' },
          { rank: 2, bonus: 1000, title: '🥈 #2 Top Quality Performer Award' },
          { rank: 3, bonus: 750,  title: '🥉 #3 Customer Satisfaction Star' },
          { rank: 4, bonus: 500,  title: '⭐ #4 High-Speed Response Master' },
          { rank: 5, bonus: 250,  title: '🌟 #5 Reliability & Workmanship Star' }
        ];

        for (const p of providers) {
          const providerId = p.id || p._id.toString();
          const completedBookings = await Booking.find({
            $or: [{ providerId }, { providerName: p.name }],
            status: 'Completed'
          });

          let totalRevenue = 0;
          for (const b of completedBookings) {
            const rawPrice = b.priceBreakdown?.subtotal || (typeof b.price === 'number' ? b.price : parseInt(String(b.price || 0).replace(/[^\d]/g, ''), 10)) || 0;
            totalRevenue += rawPrice;
          }

          const pLevel = await ProviderLevel.findOne({ providerId });
          const pWallet = await ProviderWallet.findOne({ providerId });

          const completedCount = completedBookings.length || pLevel?.completedJobsCount || (p.name ? 5 : 0);
          const rating = pLevel?.rating || (4.7 + (completedCount % 4) * 0.1);
          const milestonePoints = pWallet?.milestonePoints || (Math.floor(totalRevenue / 100) % 100);
          const milestoneCycles = pWallet?.milestoneCyclesCompleted || Math.floor(Math.floor(totalRevenue / 100) / 100);
          const topBonusEarned = pWallet?.topProviderBonusEarned || 0;

          // Composite score: Job count + Customer Rating + Volume
          const score = (completedCount * 20) + (rating * 25) + Math.min(100, totalRevenue / 100);

          results.push({
            providerId,
            providerName: p.name || 'Certified Specialist',
            providerPhone: p.phone || '9840994649',
            category: p.category || 'Service Specialist',
            completedJobs: completedCount,
            customerRating: parseFloat(rating.toFixed(1)),
            totalRevenue,
            milestonePoints,
            milestoneCycles,
            topBonusEarned,
            walletBalance: pWallet?.availableBalance || 0,
            score
          });
        }

        // Sort by composite score descending and take Top 5
        results.sort((a, b) => b.score - a.score);
        const top5 = results.slice(0, 5).map((p, idx) => ({
          rank: idx + 1,
          ...p,
          recommendedBonus: recommendedBonuses[idx]?.bonus || 250,
          bonusTitle: recommendedBonuses[idx]?.title || `Top #${idx + 1} Specialist Award`
        }));

        res.json({
          topProviders: top5,
          totalProvidersEvaluated: providers.length
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 6. Admin Award Bonus to Top Provider
    app.post('/api/admin/retention/award-top-provider-bonus', auth, async (req, res) => {
      try {
        const { providerId, bonusAmount, bonusTitle, rank } = req.body;
        const amt = Math.max(0, parseInt(bonusAmount) || 500);

        const providerUser = await User.findById(providerId);
        const pWallet = await getOrCreateProviderWallet(providerId, providerUser?.name, providerUser?.phone);

        pWallet.availableBalance += amt;
        pWallet.totalLifetimeEarnings += amt;
        pWallet.topProviderBonusEarned = (pWallet.topProviderBonusEarned || 0) + amt;
        pWallet.topProviderRank = rank || 1;

        pWallet.transactions.unshift({
          id: `PWT-TOP-${Date.now()}`,
          type: 'top_provider_bonus',
          amount: amt,
          description: `🏆 Top #${rank || 1} Specialist Award Credited: ${bonusTitle || 'Top 5 Provider Excellence Bonus'}`,
          status: 'Completed',
          date: new Date()
        });
        await pWallet.save();

        // Send congratulatory notification to the top provider
        await createAndSendNotification({
          userId: providerId,
          title: `🏆 Top #${rank || 1} Specialist Star Bonus Awarded!`,
          message: `Congratulations! ServiceHub Admin awarded you a ₹${amt.toLocaleString()} Top Provider Cash Bonus for outstanding customer ratings & work completed. Credited directly to your wallet!`,
          type: 'provider_bonus'
        });

        res.json({ success: true, wallet: pWallet, bonusCredited: amt });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ══════════════════════════════════════════════════════════════════════
    // ── BOOKING-SPECIFIC SERVICEHUB CHAT SYSTEM ─────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // 1. Get or initialize booking conversation & messages
    app.get('/api/chat/booking/:bookingId', auth, async (req, res) => {
      try {
        const bookingParam = req.params.bookingId;
        const booking = await Booking.findOne({
          $or: [
            { trackingId: bookingParam },
            ...(mongoose.Types.ObjectId.isValid(bookingParam) ? [{ _id: bookingParam }] : [])
          ]
        });

        if (!booking) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        // Security check: Must be the customer of this booking, the assigned provider, or an admin
        const isCustomer = req.userId === booking.userId?.toString();
        const isProvider = req.userId === booking.providerId?.toString();
        const isAdmin = req.userType === 'admin';

        if (!isCustomer && !isProvider && !isAdmin) {
          return res.status(403).json({ error: 'Access Denied: You do not have permission to access this booking conversation.' });
        }

        // Find or create the conversation for this specific booking
        let conversation = await ChatConversation.findOne({
          $or: [
            { bookingId: booking.trackingId },
            { bookingMongoId: booking._id }
          ]
        });

        if (!conversation) {
          conversation = new ChatConversation({
            bookingId: booking.trackingId,
            bookingMongoId: booking._id,
            customerId: booking.userId,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            providerId: booking.providerId,
            providerName: booking.providerName,
            serviceType: booking.serviceType,
            category: booking.category,
            warrantyChatExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180-day support/warranty chat duration
            status: 'open',
            lastMessage: `Booking #${booking.trackingId} created for ${booking.serviceType}.`,
            lastMessageAt: new Date(),
            lastMessageSenderRole: 'system'
          });
          await conversation.save();

          // Seed initial welcoming system message
          const sysMsg = new ChatMessage({
            conversationId: conversation._id,
            bookingId: booking.trackingId,
            senderId: 'system',
            senderRole: 'system',
            senderName: 'ServiceHub System',
            message: `👋 Welcome! You are securely connected with ${booking.providerName} for ${booking.serviceType} (Booking #${booking.trackingId}). Need immediate support? Contact ServiceHub Support at 9840994649.`,
            messageType: 'system',
            read: true,
            readAt: new Date()
          });
          await sysMsg.save();
        }

        // Check if warranty / chat window has expired
        if (conversation.warrantyChatExpiresAt && new Date() > new Date(conversation.warrantyChatExpiresAt)) {
          conversation.isReadOnly = true;
        }

        // Mark unread messages as read for the viewer
        if (isCustomer) {
          conversation.customerUnreadCount = 0;
          await ChatMessage.updateMany(
            { conversationId: conversation._id, senderRole: { $ne: 'customer' }, read: false },
            { read: true, readAt: new Date() }
          );
        } else if (isProvider) {
          conversation.providerUnreadCount = 0;
          await ChatMessage.updateMany(
            { conversationId: conversation._id, senderRole: { $ne: 'provider' }, read: false },
            { read: true, readAt: new Date() }
          );
        }
        await conversation.save();

        const messages = await ChatMessage.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

        res.json({
          success: true,
          conversation,
          messages,
          booking: {
            id: booking._id,
            trackingId: booking.trackingId,
            customerName: booking.customerName,
            providerName: booking.providerName,
            serviceType: booking.serviceType,
            category: booking.category,
            date: booking.date,
            time: booking.time,
            price: booking.price,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            supportPhone: '9840994649'
          }
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 2. Send message inside a specific booking conversation
    app.post('/api/chat/booking/:bookingId/messages', auth, async (req, res) => {
      try {
        const { message, messageType = 'text', mediaUrl } = req.body;
        if (!message || !message.trim()) {
          return res.status(400).json({ error: 'Message cannot be empty.' });
        }

        const bookingParam = req.params.bookingId;
        const booking = await Booking.findOne({
          $or: [
            { trackingId: bookingParam },
            ...(mongoose.Types.ObjectId.isValid(bookingParam) ? [{ _id: bookingParam }] : [])
          ]
        });

        if (!booking) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        const isCustomer = req.userId === booking.userId?.toString();
        const isProvider = req.userId === booking.providerId?.toString();
        const isAdmin = req.userType === 'admin';

        if (!isCustomer && !isProvider && !isAdmin) {
          return res.status(403).json({ error: 'Access Denied: You cannot send messages in this booking conversation.' });
        }

        let conversation = await ChatConversation.findOne({
          $or: [
            { bookingId: booking.trackingId },
            { bookingMongoId: booking._id }
          ]
        });

        if (!conversation) {
          conversation = new ChatConversation({
            bookingId: booking.trackingId,
            bookingMongoId: booking._id,
            customerId: booking.userId,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            providerId: booking.providerId,
            providerName: booking.providerName,
            serviceType: booking.serviceType,
            category: booking.category,
            status: 'open'
          });
          await conversation.save();
        }

        if (conversation.isReadOnly && !isAdmin) {
          return res.status(400).json({ error: 'This booking conversation is now in read-only archive mode.' });
        }

        // Determine sender identity
        let senderRole = 'customer';
        let senderName = booking.customerName;

        if (isAdmin) {
          senderRole = 'admin';
          senderName = 'ServiceHub Support';
        } else if (isProvider) {
          senderRole = 'provider';
          senderName = booking.providerName;
        }

        const chatMsg = new ChatMessage({
          conversationId: conversation._id,
          bookingId: booking.trackingId,
          senderId: req.userId,
          senderRole,
          senderName,
          message: message.trim(),
          messageType,
          mediaUrl: mediaUrl || '',
          read: false
        });
        await chatMsg.save();

        // Update conversation metadata
        conversation.lastMessage = message.trim();
        conversation.lastMessageAt = new Date();
        conversation.lastMessageSenderRole = senderRole;

        if (senderRole === 'customer') {
          conversation.providerUnreadCount = (conversation.providerUnreadCount || 0) + 1;
        } else if (senderRole === 'provider') {
          conversation.customerUnreadCount = (conversation.customerUnreadCount || 0) + 1;
        } else if (senderRole === 'admin') {
          conversation.customerUnreadCount = (conversation.customerUnreadCount || 0) + 1;
          conversation.providerUnreadCount = (conversation.providerUnreadCount || 0) + 1;
        }
        await conversation.save();

        // Trigger Notification for the other party
        if (senderRole === 'customer' && mongoose.Types.ObjectId.isValid(booking.providerId)) {
          await createAndSendNotification({
            userId: booking.providerId,
            title: `New message from ${booking.customerName} for Booking #${booking.trackingId}`,
            message: message.trim(),
            type: 'chat',
            bookingId: booking._id
          });
        } else if (senderRole === 'provider' && mongoose.Types.ObjectId.isValid(booking.userId)) {
          await createAndSendNotification({
            userId: booking.userId,
            title: `New message from ${booking.providerName} for Booking #${booking.trackingId}`,
            message: message.trim(),
            type: 'chat',
            bookingId: booking._id
          });
        }

        res.json({
          success: true,
          message: chatMsg,
          conversation
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 3. Provider Inbox: List all booking conversations assigned to this provider
    app.get('/api/chat/provider/conversations', auth, async (req, res) => {
      try {
        const providerUser = await User.findById(req.userId);
        const providerName = providerUser?.name || '';

        // Find conversations matching providerId or providerName
        const conversations = await ChatConversation.find({
          $or: [
            { providerId: req.userId },
            ...(providerName ? [{ providerName }] : [])
          ]
        }).sort({ lastMessageAt: -1 });

        res.json(conversations);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 4. Customer Inbox: List all booking conversations for this customer
    app.get('/api/chat/customer/conversations', auth, async (req, res) => {
      try {
        const conversations = await ChatConversation.find({
          customerId: req.userId
        }).sort({ lastMessageAt: -1 });

        res.json(conversations);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 5. Total unread message badge count
    app.get('/api/chat/unread-summary', auth, async (req, res) => {
      try {
        let unreadCount = 0;
        if (req.userType === 'provider') {
          const provUser = await User.findById(req.userId);
          const provName = provUser?.name || '';
          const convos = await ChatConversation.find({
            $or: [{ providerId: req.userId }, ...(provName ? [{ providerName: provName }] : [])]
          });
          unreadCount = convos.reduce((sum, c) => sum + (c.providerUnreadCount || 0), 0);
        } else if (req.userType === 'customer') {
          const convos = await ChatConversation.find({ customerId: req.userId });
          unreadCount = convos.reduce((sum, c) => sum + (c.customerUnreadCount || 0), 0);
        } else if (req.userType === 'admin') {
          unreadCount = await ChatConversation.countDocuments({ customerUnreadCount: { $gt: 0 } });
        }
        res.json({ unreadCount });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 6. Admin Chat Audit & Inspection
    app.get('/api/chat/admin/conversations', auth, async (req, res) => {
      try {
        if (req.userType !== 'admin') {
          return res.status(403).json({ error: 'Access Denied: Admin privileges required.' });
        }

        const { search } = req.query;
        let query = {};
        if (search) {
          query = {
            $or: [
              { bookingId: { $regex: search, $options: 'i' } },
              { customerName: { $regex: search, $options: 'i' } },
              { providerName: { $regex: search, $options: 'i' } },
              { serviceType: { $regex: search, $options: 'i' } }
            ]
          };
        }

        const conversations = await ChatConversation.find(query).sort({ lastMessageAt: -1 }).limit(100);
        res.json(conversations);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 7. Admin update conversation status or extend warranty
    app.put('/api/chat/admin/conversations/:id/status', auth, async (req, res) => {
      try {
        if (req.userType !== 'admin') {
          return res.status(403).json({ error: 'Access Denied: Admin privileges required.' });
        }

        const { status, isReadOnly, extendDays } = req.body;
        const convo = await ChatConversation.findById(req.params.id);
        if (!convo) return res.status(404).json({ error: 'Conversation not found' });

        if (status) convo.status = status;
        if (isReadOnly !== undefined) convo.isReadOnly = isReadOnly;
        if (extendDays) {
          convo.warrantyChatExpiresAt = new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000);
          convo.isReadOnly = false;
        }

        await convo.save();
        res.json({ success: true, conversation: convo });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ══════════════════════════════════════════════════════════════════════

    // Seed Marketplace if empty
    const shopsCount = await PartnerShop.countDocuments();
    if (shopsCount === 0) {
      console.log('🌱 Seeding ServiceHub Materials Marketplace...');
      // 1. Seed Brands
      const brandsData = [
        { name: 'Anchor', key: 'anchor' },
        { name: 'GM', key: 'gm' },
        { name: 'Legrand', key: 'legrand' },
        { name: 'Havells', key: 'havells' },
        { name: 'Crompton', key: 'crompton' },
        { name: 'Orient', key: 'orient' },
        { name: 'Bajaj', key: 'bajaj' },
        { name: 'Usha', key: 'usha' },
        { name: 'Jaquar', key: 'jaquar' },
        { name: 'Parryware', key: 'parryware' },
        { name: 'Hindware', key: 'hindware' },
        { name: 'Asian Paints', key: 'asian_paints' },
        { name: 'Berger', key: 'berger' },
        { name: 'Nerolac', key: 'nerolac' },
        { name: 'Dulux', key: 'dulux' },
        { name: 'Supreme Pipes', key: 'supreme' },
        { name: 'Finolex', key: 'finolex' },
        { name: 'Tata Steel', key: 'tata' },
        { name: 'Bosch', key: 'bosch' },
        { name: 'Samsung', key: 'samsung' },
        { name: 'Crucial', key: 'crucial' },
        { name: 'Logitech', key: 'logitech' }
      ];
      const brands = await Brand.insertMany(brandsData);
      const brandMap = {};
      brands.forEach(b => { brandMap[b.key] = b; });

      // 2. Seed Partner Shops in key districts
      const districts = ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Vellore'];
      const shopSeeds = [];
      
      const shopTypes = [
        { suffix: 'Electricals & Hardware', key: 'electrical', latOffset: 0.02, lngOffset: 0.02 },
        { suffix: 'Plumbing & Sanitary Stores', key: 'plumbing', latOffset: -0.02, lngOffset: 0.02 },
        { suffix: 'Paints & Décor World', key: 'painter', latOffset: 0.02, lngOffset: -0.02 },
        { suffix: 'Climate Solutions & Spares', key: 'hvac', latOffset: -0.02, lngOffset: -0.02 },
        { suffix: 'Computer Tech Hub', key: 'electronics', latOffset: 0.01, lngOffset: 0.01 },
        { suffix: 'Eco Garden Center', key: 'landscaping', latOffset: -0.01, lngOffset: -0.01 }
      ];

      // Coordinate reference points for Tamil Nadu cities
      const cityCoords = {
        'Chennai': { lat: 13.0827, lng: 80.2707 },
        'Coimbatore': { lat: 11.0168, lng: 76.9558 },
        'Madurai': { lat: 9.9252, lng: 78.1198 },
        'Tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
        'Salem': { lat: 11.6643, lng: 78.1460 },
        'Vellore': { lat: 12.9165, lng: 79.1325 }
      };

      for (const city of districts) {
        const base = cityCoords[city];
        for (const type of shopTypes) {
          shopSeeds.push({
            name: `${city} ${type.suffix}`,
            ownerName: `Owner of ${city} ${type.suffix}`,
            phone: `+91 ${98400 + Math.floor(Math.random() * 999)} ${10000 + Math.floor(Math.random() * 89999)}`,
            email: `contact.${city.toLowerCase()}.${type.key}@example.com`,
            address: `No. ${10 + Math.floor(Math.random() * 100)}, Bazaar Street, ${city}, Tamil Nadu`,
            location: city,
            gpsLocation: {
              latitude: base.lat + type.latOffset + (Math.random() - 0.5) * 0.01,
              longitude: base.lng + type.lngOffset + (Math.random() - 0.5) * 0.01
            },
            gst: `33AAAAA${1000 + Math.floor(Math.random() * 8999)}A1Z${Math.floor(Math.random() * 9)}`,
            businessHours: '09:00 AM - 08:30 PM',
            deliveryAvailable: true,
            pickupAvailable: true,
            rating: +(4.0 + Math.random() * 1.0).toFixed(1),
            status: 'Verified'
          });
        }
      }
      const seededShops = await PartnerShop.insertMany(shopSeeds);

      // 3. Seed Products
      const productsData = [
        // Fan replacement/installation (electrical -> fan)
        { name: 'Havells Florence Ceiling Fan 1200mm', brandKey: 'havells', categoryKey: 'electrical', serviceItemKey: 'fan', warranty: '2 years', image: '🍃', desc: 'Premium ceiling fan with gold decoration lines and energy efficient motor.' },
        { name: 'Crompton Hill Briz Ceiling Fan 1200mm', brandKey: 'crompton', categoryKey: 'electrical', serviceItemKey: 'fan', warranty: '2 years', image: '🍃', desc: 'High-speed utility ceiling fan with high air delivery.' },
        { name: 'Orient Electric Apex Ceiling Fan 1200mm', brandKey: 'orient', categoryKey: 'electrical', serviceItemKey: 'fan', warranty: '2 years', image: '🍃', desc: 'Super high air delivery and silent operation.' },
        { name: 'Bajaj Frore Ceiling Fan 1200mm', brandKey: 'bajaj', categoryKey: 'electrical', serviceItemKey: 'fan', warranty: '2 years', image: '🍃', desc: 'Double ball bearing ceiling fan with rust-free aluminum blades.' },
        { name: 'Usha Swift Ceiling Fan 1200mm', brandKey: 'usha', categoryKey: 'electrical', serviceItemKey: 'fan', warranty: '2 years', image: '🍃', desc: 'High speed and low power consumption ceiling fan.' },
        // Switches (electrical -> switch)
        { name: 'Anchor Roma 6 Amp 1 Way Switch', brandKey: 'anchor', categoryKey: 'electrical', serviceItemKey: 'switch', warranty: '10 years', image: '🔌', desc: 'Modular Switch Roma series.' },
        { name: 'GM Modular G-Power 1 Way Switch', brandKey: 'gm', categoryKey: 'electrical', serviceItemKey: 'switch', warranty: '10 years', image: '🔌', desc: 'Smooth modular switch with indicator.' },
        { name: 'Legrand Mylinc 6A Switch', brandKey: 'legrand', categoryKey: 'electrical', serviceItemKey: 'switch', warranty: '10 years', image: '🔌', desc: 'Luxury modular switch plates.' },
        // Sockets (electrical -> socket)
        { name: 'Anchor Roma 2-in-1 Modular Socket 6A/16A', brandKey: 'anchor', categoryKey: 'electrical', serviceItemKey: 'socket', warranty: '5 years', image: '🔌', desc: 'Heavy load power socket.' },
        // Lights (electrical -> light)
        { name: 'Havells 9W LED Bulb White', brandKey: 'havells', categoryKey: 'electrical', serviceItemKey: 'light', warranty: '1 year', image: '💡', desc: 'High lumen LED bulb.' },
        // Taps (plumbing -> tap)
        { name: 'Jaquar Continental Basin Tap', brandKey: 'jaquar', categoryKey: 'plumbing', serviceItemKey: 'tap', warranty: '10 years', image: '🚰', desc: 'Chrome plated luxury brass tap.' },
        { name: 'Parryware Slimline Basin Tap', brandKey: 'parryware', categoryKey: 'plumbing', serviceItemKey: 'tap', warranty: '7 years', image: '🚰', desc: 'Durable brass faucet.' },
        { name: 'Hindware Faucet Chrome Plated', brandKey: 'hindware', categoryKey: 'plumbing', serviceItemKey: 'tap', warranty: '5 years', image: '🚰', desc: 'Anti-corrosive brass bathroom tap.' },
        // Pipes (plumbing -> pipe)
        { name: 'Supreme PVC Pipe 1 inch (3 meters)', brandKey: 'supreme', categoryKey: 'plumbing', serviceItemKey: 'pipe', warranty: '5 years', image: '🪠', desc: 'High durability PVC pipe.' },
        { name: 'Finolex CPVC Pipe 0.75 inch (3 meters)', brandKey: 'finolex', categoryKey: 'plumbing', serviceItemKey: 'pipe', warranty: '5 years', image: '🪠', desc: 'Hot and cold water CPVC pipe.' },
        // Painting Emulsion (painting -> interior_wall)
        { name: 'Asian Paints Apcolite Premium Emulsion 4L', brandKey: 'asian_paints', categoryKey: 'painter', serviceItemKey: 'interior_wall', warranty: '3 years', image: '🎨', desc: 'Premium interior wall paint.' },
        { name: 'Berger Easy Clean Luxury Emulsion 4L', brandKey: 'berger', categoryKey: 'painter', serviceItemKey: 'interior_wall', warranty: '3 years', image: '🎨', desc: 'Washable wall paint.' },
        // Landscaping plants & tools (landscaping -> plants / garden)
        { name: 'Areca Palm Indoor Plant', brandKey: 'bosch', categoryKey: 'landscaping', serviceItemKey: 'plants', warranty: 'Live guarantee', image: '🪴', desc: 'Natural air purifier plant.' },
        { name: 'Premium Garden Soil Mix 5kg', brandKey: 'bosch', categoryKey: 'landscaping', serviceItemKey: 'plants', warranty: 'N/A', image: '🪴', desc: 'Organic coco peat and vermicompost soil.' },
        { name: 'Organic NPK Fertilizer 1kg', brandKey: 'bosch', categoryKey: 'landscaping', serviceItemKey: 'plants', warranty: 'N/A', image: '🪴', desc: 'Organic NPK compound.' },
        // AC spares (hvac -> indoor_unit / compressor)
        { name: 'AC Copper Pipe Kit (3 meters)', brandKey: 'finolex', categoryKey: 'hvac', serviceItemKey: 'indoor_unit', warranty: '1 year', image: '❄️', desc: 'Seamless copper tubing for AC.' },
        { name: 'AC Drain Pipe Flexible (5 meters)', brandKey: 'finolex', categoryKey: 'hvac', serviceItemKey: 'indoor_unit', warranty: '1 year', image: '❄️', desc: 'Flexible drain pipe.' },
        { name: 'Heavy Duty AC Outdoor Stand', brandKey: 'tata', categoryKey: 'hvac', serviceItemKey: 'indoor_unit', warranty: '5 years', image: '❄️', desc: 'Sturdy wall bracket stand.' }
      ];

      const seededProducts = [];
      for (const p of productsData) {
        const brand = brandMap[p.brandKey];
        const newProduct = new Product({
          name: p.name,
          brandId: brand ? brand._id : new mongoose.Types.ObjectId(),
          brandName: brand ? brand.name : 'Generic',
          image: p.image,
          description: p.desc,
          warranty: p.warranty,
          categoryKey: p.categoryKey,
          serviceItemKey: p.serviceItemKey,
          isActive: true
        });
        await newProduct.save();
        seededProducts.push(newProduct);
      }

      // 4. Seed ShopInventory mapping
      const inventorySeeds = [];
      for (const shop of seededShops) {
        // Map products of shop type
        // e.g. electrical shops get electrical products
        const matchingProducts = seededProducts.filter(p => {
          if (shop.name.includes('Electricals') && p.categoryKey === 'electrical') return true;
          if (shop.name.includes('Plumbing') && p.categoryKey === 'plumbing') return true;
          if (shop.name.includes('Paints') && p.categoryKey === 'painter') return true;
          if (shop.name.includes('Climate') && p.categoryKey === 'hvac') return true;
          if (shop.name.includes('Garden') && p.categoryKey === 'landscaping') return true;
          return false;
        });

        for (const prod of matchingProducts) {
          // Add variations in price per city/shop
          const priceMultiplier = 0.95 + Math.random() * 0.1;
          const basePriceMap = {
            'Florence Ceiling Fan': 2200,
            'Hill Briz Ceiling Fan': 1600,
            'Apex Ceiling Fan': 1750,
            'Frore Ceiling Fan': 1550,
            'Swift Ceiling Fan': 1800,
            'Roma 1 Way Switch': 35,
            'G-Power 1 Way Switch': 40,
            'Mylinc 6A Switch': 55,
            'Roma 2-in-1 Modular Socket': 110,
            '9W LED Bulb White': 120,
            'Continental Basin Tap': 1400,
            'Slimline Basin Tap': 950,
            'Faucet Chrome Plated': 1100,
            'PVC Pipe 1 inch': 250,
            'CPVC Pipe 0.75 inch': 350,
            'Apcolite Premium Emulsion': 1250,
            'Easy Clean Luxury Emulsion': 1450,
            'Areca Palm Indoor Plant': 299,
            'Garden Soil Mix': 180,
            'NPK Fertilizer': 150,
            'AC Copper Pipe Kit': 1800,
            'AC Drain Pipe Flexible': 250,
            'Outdoor Stand': 750
          };

          let basePrice = 500;
          for (const key of Object.keys(basePriceMap)) {
            if (prod.name.includes(key)) {
              basePrice = basePriceMap[key];
              break;
            }
          }

          inventorySeeds.push({
            shopId: shop._id,
            productId: prod._id,
            price: Math.round(basePrice * priceMultiplier),
            discount: Math.floor(Math.random() * 15), // 0 to 15% discount
            stock: 5 + Math.floor(Math.random() * 25),
            estimatedDeliveryHours: 12 + Math.floor(Math.random() * 24),
            deliveryCharge: Math.random() > 0.5 ? 50 : 0,
            isActive: true
          });
        }
      }
      await ShopInventory.insertMany(inventorySeeds);
      console.log(`🌱 Materials Marketplace seeded: ${seededShops.length} shops, ${seededProducts.length} products, ${inventorySeeds.length} stock listings.`);
    }

    const startServer = () => {
      const server = app.listen(PORT, () => {
        console.log(`🚀 Express server running on port ${PORT}`);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`\n⚠️  Port ${PORT} is already in use. Retrying in 2 seconds...\n`);
          setTimeout(startServer, 2000);
        } else {
          console.error('❌ Server error:', err);
        }
      });
    };

    startServer();


  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
  });

// Trigger comment for nodemon restart and Atlas marketplace database seeding.
