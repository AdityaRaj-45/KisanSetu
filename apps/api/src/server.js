import 'dotenv/config';
import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { Server } from 'socket.io';
import { z } from 'zod';
import { BOOKING_STATUSES, ORDER_STATUSES, PROCUREMENT_COMMODITIES, UNITS } from '../../../shared/src/domain.js';
import { User, Centre, Harvest, Crop, Booking, Order, Notification, Payment } from './models.js';
import { allowRoles, issueToken, requireAuth } from './auth.js';

const app = express();
const server = http.createServer(app);
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be configured before starting KisanSetu.');
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true } });
const upload = multer({ dest: 'uploads/', limits: { fileSize: 3 * 1024 * 1024 }, fileFilter: (_req, file, done) => done(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) });
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve('uploads')));
io.on('connection', socket => socket.on('join-state', state => socket.join(`state:${state}`)));
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const otpSessions = new Map();
const normaliseMobile = mobile => String(mobile || '').replace(/\D/g, '');
const demoOtp = () => process.env.DEMO_OTP || '123456';
const token = () => `KS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const bookingNo = () => `KS-${new Date().getFullYear()}-${Math.random().toString().slice(2, 8)}`;
const orderNo = () => `ORD-${new Date().getFullYear()}-${Math.random().toString().slice(2, 8)}`;
async function notify(user, state, title, message) { const notification = await Notification.create({ user, state, title, message }); io.to(`state:${state}`).emit('notification:new', notification); }
function emitQueue(state) { io.to(`state:${state}`).emit('queue:updated'); }

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.post('/api/auth/request-otp', (req, res) => {
  const phone = normaliseMobile(req.body.phone);
  if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number.' });
  otpSessions.set(phone, { otp: demoOtp(), expiresAt: Date.now() + 10 * 60 * 1000, verified: false });
  return res.json({ message: 'OTP generated for demo mode.', demoOtp: process.env.NODE_ENV === 'production' ? undefined : demoOtp() });
});
app.post('/api/auth/verify-otp', (req, res) => {
  const phone = normaliseMobile(req.body.phone); const session = otpSessions.get(phone);
  if (!session || session.expiresAt < Date.now()) return res.status(400).json({ message: 'OTP has expired. Request a new one.' });
  if (String(req.body.otp || '') !== session.otp) return res.status(400).json({ message: 'OTP is incorrect. Please try again.' });
  session.verified = true; return res.json({ verified: true });
});
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const phone = normaliseMobile(req.body.phone); const session = otpSessions.get(phone);
  if (!session || !session.verified || session.expiresAt < Date.now()) return res.status(400).json({ message: 'Request and verify your OTP before logging in.' });
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ message: 'No KisanSetu account was found for this mobile number.' });
  otpSessions.delete(phone);
  res.cookie('kisansetu_token', issueToken(user), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 });
  return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, state: user.state } });
}));
app.post('/api/auth/register', upload.single('profilePhoto'), asyncRoute(async (req, res) => {
  const input = z.object({ name: z.string().min(2, 'Enter your full name.'), email: z.string().email(), state: z.string(), role: z.enum(['FARMER', 'DISTRIBUTOR', 'ADMIN']).default('FARMER'), phone: z.string().optional(), village: z.string().optional(), district: z.string().optional(), aadhaar: z.string().optional(), detectedLocation: z.string().optional() }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: 'Please complete all required farmer registration fields.' });
  if (await User.exists({ email: input.data.email.toLowerCase() })) return res.status(409).json({ message: 'An account already exists for this email.' });
  const phone = normaliseMobile(input.data.phone);
  if (input.data.role === 'FARMER') {
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
    const session = otpSessions.get(phone); if (!session?.verified || session.expiresAt < Date.now()) return res.status(400).json({ message: 'Verify your mobile OTP before submitting registration.' });
    const aadhaar = String(input.data.aadhaar || '').replace(/\s/g, ''); if (!/^\d{12}$/.test(aadhaar)) return res.status(400).json({ message: 'Aadhaar must be a 12-digit number for this demo.' });
  }
  const { aadhaar, ...values } = input.data; const masked = aadhaar ? `XXXX-XXXX-${aadhaar.replace(/\s/g, '').slice(-4)}` : undefined;
  const user = await User.create({ ...values, phone: phone || values.phone, aadhaarMasked: masked, profilePhotoUrl: req.file ? `/uploads/${req.file.filename}` : undefined, email: input.data.email.toLowerCase(), passwordHash: await bcrypt.hash(token(), 12) });
  otpSessions.delete(phone);
  res.cookie('kisansetu_token', issueToken(user), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 });
  return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, state: user.state } });
}));
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('kisansetu_token'); res.status(204).end(); });
app.get('/api/auth/me', requireAuth, asyncRoute(async (req, res) => res.json({ user: await User.findById(req.user.id).select('-passwordHash') })));
app.patch('/api/profile', requireAuth, asyncRoute(async (req, res) => {
  const allowed = ['name', 'phone', 'village', 'district', 'address', 'bankAccountLast4', 'preferredLanguage'];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-passwordHash');
  res.json({ user });
}));
app.get('/api/notifications', requireAuth, asyncRoute(async (req, res) => res.json({ notifications: await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(30) })));
app.patch('/api/notifications/:id/read', requireAuth, asyncRoute(async (req, res) => { await Notification.updateOne({ _id: req.params.id, user: req.user.id }, { read: true }); res.status(204).end(); }));

app.get('/api/dashboard', requireAuth, asyncRoute(async (req, res) => {
  const stateScope = { state: req.user.state }; const scope = req.user.role === 'FARMER' ? { ...stateScope, farmer: req.user.id } : stateScope;
  const [bookings, total, waiting, completed] = await Promise.all([Booking.find(scope).populate('farmer', 'name village phone').populate('centre', 'name code district').sort({ appointmentDate: 1 }).limit(12), Booking.countDocuments(scope), Booking.countDocuments({ ...scope, status: { $in: ['BOOKED', 'WAITING'] } }), Booking.countDocuments({ ...scope, status: 'PAYMENT_COMPLETED' })]);
  res.json({ state: req.user.state, stats: { total, waiting, completed }, bookings });
}));

app.get('/api/farmer/harvests', requireAuth, allowRoles('FARMER'), asyncRoute(async (req, res) => res.json({ harvests: await Harvest.find({ farmer: req.user.id }).sort({ createdAt: -1 }) })));
app.post('/api/farmer/harvests', requireAuth, allowRoles('FARMER'), asyncRoute(async (req, res) => {
  const input = z.object({ crop: z.string().min(2), variety: z.string().optional(), quantity: z.coerce.number().positive(), unit: z.enum(UNITS).default('quintal') }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: 'Enter a crop, quantity, and unit.' });
  const harvest = await Harvest.create({ ...input.data, farmer: req.user.id, state: req.user.state }); res.status(201).json({ harvest });
}));
app.patch('/api/farmer/harvests/:id', requireAuth, allowRoles('FARMER'), asyncRoute(async (req, res) => { const harvest = await Harvest.findOneAndUpdate({ _id: req.params.id, farmer: req.user.id }, req.body, { new: true }); if (!harvest) return res.status(404).json({ message: 'Harvest record not found.' }); res.json({ harvest }); }));
app.delete('/api/farmer/harvests/:id', requireAuth, allowRoles('FARMER'), asyncRoute(async (req, res) => { await Harvest.deleteOne({ _id: req.params.id, farmer: req.user.id }); res.status(204).end(); }));
app.get('/api/crops', requireAuth, asyncRoute(async (req, res) => res.json({ crops: await Crop.find({ state: req.user.state, active: true }).populate('distributor', 'name').sort({ name: 1 }) })));
app.get('/api/centres/recommended', requireAuth, allowRoles('FARMER'), asyncRoute(async (req, res) => {
  const commodity = String(req.query.commodity || '');
  const centres = await Centre.aggregate([{ $match: { state: req.user.state, active: true, ...(commodity ? { categories: commodity } : {}) } }, { $lookup: { from: 'bookings', localField: '_id', foreignField: 'centre', as: 'bookings' } }, { $addFields: { activeQueue: { $size: { $filter: { input: '$bookings', as: 'b', cond: { $in: ['$$b.status', ['BOOKED', 'WAITING']] } } } } } }, { $sort: { activeQueue: 1, dailyCapacityQuintals: -1 } }]);
  res.json({ centres });
}));
app.get('/api/farmer/bookings', requireAuth, allowRoles('FARMER'), asyncRoute(async (req, res) => res.json({ bookings: await Booking.find({ farmer: req.user.id }).populate('centre', 'name code district address').sort({ createdAt: -1 }) })));
app.post('/api/farmer/bookings', requireAuth, allowRoles('FARMER'), asyncRoute(async (req, res) => {
  const input = z.object({ centreId: z.string(), crop: z.enum(PROCUREMENT_COMMODITIES), variety: z.string().optional(), estimatedQuantity: z.coerce.number().positive(), unit: z.enum(UNITS), appointmentDate: z.coerce.date() }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: 'Please provide a centre, crop, quantity, unit, and appointment date.' });
  const centre = await Centre.findOne({ _id: input.data.centreId, state: req.user.state, active: true });
  if (!centre) return res.status(404).json({ message: 'Selected centre is unavailable in your state.' });
  if (!centre.categories.includes(input.data.crop)) return res.status(400).json({ message: 'This procurement centre does not accept the selected commodity.' });
  const queuePosition = await Booking.countDocuments({ centre: centre.id, appointmentDate: input.data.appointmentDate, status: { $nin: ['REJECTED', 'PAYMENT_COMPLETED'] } }) + 1;
  const configuredRate = centre.procurementRates.find((item) => item.commodity === input.data.crop)?.rate || 0;
  const booking = await Booking.create({ ...input.data, centre: centre.id, state: req.user.state, farmer: req.user.id, bookingNumber: bookingNo(), token: token(), queuePosition, procurementRate: configuredRate, status: 'BOOKED', statusHistory: [{ status: 'BOOKED', note: 'Produce sale booking created by farmer', changedBy: req.user.id }] });
  await notify(req.user.id, req.user.state, 'Digital token generated', `Your ${booking.bookingNumber} token is ${booking.token}.`); emitQueue(req.user.state);
  res.status(201).json({ booking });
}));
app.get('/api/farmer/bookings/:id/receipt', requireAuth, allowRoles('FARMER'), asyncRoute(async (req, res) => { const booking = await Booking.findOne({ _id: req.params.id, farmer: req.user.id }).populate('centre', 'name code address').populate('farmer', 'name phone'); if (!booking) return res.status(404).json({ message: 'Booking not found.' }); res.json({ receipt: { bookingNumber: booking.bookingNumber, token: booking.token, farmer: booking.farmer, centre: booking.centre, crop: booking.crop, quantity: `${booking.estimatedQuantity} ${booking.unit}`, status: booking.status, paymentStatus: booking.paymentStatus, value: booking.procurementValue } }); }));

app.get('/api/officer/bookings', requireAuth, allowRoles('OFFICER'), asyncRoute(async (req, res) => { const bookings = await Booking.find({ state: req.user.state }).populate('farmer', 'name village phone').populate('centre', 'name code district').sort({ appointmentDate: 1, queuePosition: 1 }); res.json({ bookings }); }));
app.patch('/api/officer/bookings/:id', requireAuth, allowRoles('OFFICER'), asyncRoute(async (req, res) => {
  const input = z.object({ status: z.enum(BOOKING_STATUSES), note: z.string().max(300).optional(), weighedQuantity: z.coerce.number().positive().optional(), acceptedQuantity: z.coerce.number().positive().optional(), procurementRate: z.coerce.number().nonnegative().optional(), qualityGrade: z.string().optional(), qualityNote: z.string().optional(), failureReason: z.string().optional(), transactionId: z.string().optional() }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: 'Invalid procurement update.' });
  const booking = await Booking.findOne({ _id: req.params.id, state: req.user.state }); if (!booking) return res.status(404).json({ message: 'Booking not found.' });
  Object.assign(booking, input.data); if (input.data.acceptedQuantity !== undefined) booking.procurementValue = input.data.acceptedQuantity * (input.data.procurementRate ?? booking.procurementRate ?? 0); if (input.data.status === 'PAYMENT_PROCESSING') booking.paymentStatus = 'PROCESSING'; if (input.data.status === 'PAYMENT_FAILED') booking.paymentStatus = 'FAILED'; if (input.data.status === 'PAYMENT_COMPLETED') { if (booking.paymentStatus !== 'PROCESSING') return res.status(400).json({ message: 'Payment must be processing before it can be completed.' }); booking.paymentStatus = 'COMPLETED'; booking.transactionId = input.data.transactionId || `KS-PAY-${Date.now()}`; }
  booking.statusHistory.push({ status: input.data.status, note: input.data.note || 'Updated by procurement officer', changedBy: req.user.id }); await booking.save();
  if (['PAYMENT_PROCESSING', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED'].includes(input.data.status)) await Payment.findOneAndUpdate({ booking: booking.id }, { booking: booking.id, farmer: booking.farmer, state: booking.state, amount: booking.procurementValue, status: booking.paymentStatus, transactionId: booking.transactionId }, { upsert: true, new: true });
  await notify(booking.farmer, booking.state, input.data.status.startsWith('PAYMENT') ? 'Government procurement payment update' : 'Procurement update', `${booking.bookingNumber}: ${input.data.status.replaceAll('_', ' ')}${booking.procurementValue ? ` - ₹${booking.procurementValue}` : ''}`); io.to(`state:${booking.state}`).emit('booking:updated', booking); io.to(`state:${booking.state}`).emit(input.data.status.startsWith('PAYMENT') ? 'payment:updated' : 'procurement:updated', booking); emitQueue(booking.state); res.json({ booking });
}));

app.get('/api/admin/analytics', requireAuth, allowRoles('ADMIN'), asyncRoute(async (req, res) => {
  const state = req.user.state; const [centres, farmers, totalBookings, completed, payments, failed, daily] = await Promise.all([Centre.find({ state }), User.countDocuments({ state, role: 'FARMER' }), Booking.countDocuments({ state }), Booking.countDocuments({ state, status: { $in: ['PROCUREMENT_COMPLETED', 'PAYMENT_PROCESSING', 'PAYMENT_COMPLETED'] } }), Booking.countDocuments({ state, paymentStatus: 'COMPLETED' }), Booking.find({ state, status: { $in: ['QUALITY_FAILED', 'REJECTED', 'REVIEW'] } }).populate('farmer', 'name').populate('centre', 'name'), Booking.aggregate([{ $match: { state } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, quantity: { $sum: '$estimatedQuantity' }, bookings: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 14 }])]);
  const queues = await Promise.all(centres.map(async centre => ({ id: centre.id, name: centre.name, district: centre.district, active: centre.active, queue: await Booking.countDocuments({ centre: centre.id, status: { $in: ['BOOKED', 'WAITING'] } }) })));
  res.json({ metrics: { centres: centres.length, farmers, totalBookings, completed, payments, averageWaitMinutes: Math.max(8, Math.round((totalBookings / Math.max(centres.length, 1)) * 6)) }, centres: queues, failed, daily });
}));
app.patch('/api/admin/centres/:id', requireAuth, allowRoles('ADMIN'), asyncRoute(async (req, res) => { const centre = await Centre.findOneAndUpdate({ _id: req.params.id, state: req.user.state }, req.body, { new: true }); if (!centre) return res.status(404).json({ message: 'Centre not found.' }); res.json({ centre }); }));

app.get('/api/distributor/crops', requireAuth, allowRoles('DISTRIBUTOR'), asyncRoute(async (req, res) => res.json({ crops: await Crop.find({ distributor: req.user.id }).sort({ createdAt: -1 }) })));
app.post('/api/distributor/crops', requireAuth, allowRoles('DISTRIBUTOR'), upload.single('image'), asyncRoute(async (req, res) => {
  const crop = await Crop.create({ ...req.body, availableQuantity: Number(req.body.availableQuantity), pricePerUnit: Number(req.body.pricePerUnit || 0), distributor: req.user.id, state: req.user.state, imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined }); res.status(201).json({ crop });
}));
app.patch('/api/distributor/crops/:id', requireAuth, allowRoles('DISTRIBUTOR'), upload.single('image'), asyncRoute(async (req, res) => { const update = { ...req.body }; if (req.file) update.imageUrl = `/uploads/${req.file.filename}`; const crop = await Crop.findOneAndUpdate({ _id: req.params.id, distributor: req.user.id }, update, { new: true }); if (!crop) return res.status(404).json({ message: 'Crop not found.' }); res.json({ crop }); }));
app.get('/api/distributor/orders', requireAuth, allowRoles('DISTRIBUTOR'), asyncRoute(async (req, res) => res.json({ orders: await Order.find({ distributor: req.user.id }).populate('crop', 'name variety').sort({ createdAt: -1 }) })));
app.post('/api/distributor/orders', requireAuth, allowRoles('DISTRIBUTOR'), asyncRoute(async (req, res) => { const crop = await Crop.findOne({ _id: req.body.cropId, distributor: req.user.id }); if (!crop) return res.status(404).json({ message: 'Crop not found.' }); const order = await Order.create({ orderNumber: orderNo(), distributor: req.user.id, state: req.user.state, crop: crop.id, requestedQuantity: req.body.requestedQuantity, unit: req.body.unit || crop.unit, history: [{ status: 'NEW' }] }); res.status(201).json({ order }); }));
app.patch('/api/distributor/orders/:id', requireAuth, allowRoles('DISTRIBUTOR'), asyncRoute(async (req, res) => { const { status, paymentStatus } = req.body; if (status && !ORDER_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid order status.' }); const order = await Order.findOne({ _id: req.params.id, distributor: req.user.id }); if (!order) return res.status(404).json({ message: 'Order not found.' }); if (status) { order.status = status; order.history.push({ status }); } if (paymentStatus) order.paymentStatus = paymentStatus; await order.save(); res.json({ order }); }));

app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ message: 'Something went wrong. Please try again.' }); });
const port = Number(process.env.PORT || 4000);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kisansetu').then(() => server.listen(port, () => console.log(`KisanSetu API listening on ${port}`))).catch(error => { console.error('MongoDB connection failed', error); process.exit(1); });
