import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Centre, Harvest, Crop, Booking, Order, Notification } from './models.js';

const passwordHash = await bcrypt.hash('Demo@123', 12);
const people = [
  ['Asha Kumari', 'farmer.jh@kisansetu.demo', 'FARMER', 'Jharkhand', 'Khunti', '9876543210'], ['Ravi Verma', 'officer.jh@kisansetu.demo', 'OFFICER', 'Jharkhand', 'Ranchi', '9876543211'], ['Nisha Sinha', 'admin.jh@kisansetu.demo', 'ADMIN', 'Jharkhand', 'Ranchi', '9876543212'], ['Kunal Agrawal', 'distributor.jh@kisansetu.demo', 'DISTRIBUTOR', 'Jharkhand', 'Ranchi', '9876543213'],
  ['Sunita Patil', 'farmer.mh@kisansetu.demo', 'FARMER', 'Maharashtra', 'Nashik', '9876543214'], ['Harpreet Singh', 'farmer.pb@kisansetu.demo', 'FARMER', 'Punjab', 'Ludhiana', '9876543215'], ['Arun Yadav', 'farmer.up@kisansetu.demo', 'FARMER', 'Uttar Pradesh', 'Varanasi', '9876543216']
];
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kisansetu');
await Promise.all(people.map(([name, email, role, state, village, phone]) => User.findOneAndUpdate({ email }, { name, email, role, state, village, district: village, phone, passwordHash }, { upsert: true, new: true })));
const centres = await Promise.all([
  Centre.findOneAndUpdate({ code: 'JH-RNC-01' }, { name: 'Ranchi Central Procurement Centre', code: 'JH-RNC-01', state: 'Jharkhand', district: 'Ranchi', address: 'Kanke Road, Ranchi', dailyCapacityQuintals: 600, categories: ['Paddy / Rice', 'Maize', 'Wheat', 'Pulses'], procurementRates: [{ commodity: 'Paddy / Rice', rate: 2320 }, { commodity: 'Maize', rate: 2180 }] }, { upsert: true, new: true }),
  Centre.findOneAndUpdate({ code: 'JH-KHT-02' }, { name: 'Khunti Agri Collection Centre', code: 'JH-KHT-02', state: 'Jharkhand', district: 'Khunti', address: 'Main Market Road, Khunti', dailyCapacityQuintals: 320, categories: ['Paddy / Rice', 'Pulses'], procurementRates: [{ commodity: 'Paddy / Rice', rate: 2320 }, { commodity: 'Pulses', rate: 6400 }] }, { upsert: true, new: true })
]);
const farmer = await User.findOne({ email: 'farmer.jh@kisansetu.demo' }); const distributor = await User.findOne({ email: 'distributor.jh@kisansetu.demo' });
const crop = await Crop.findOneAndUpdate({ distributor: distributor._id, name: 'Paddy' }, { distributor: distributor._id, state: 'Jharkhand', name: 'Paddy', variety: 'Swarna', category: 'Cereals', availableQuantity: 950, unit: 'quintal', pricePerUnit: 2320 }, { upsert: true, new: true });
await Harvest.findOneAndUpdate({ farmer: farmer._id, crop: 'Paddy' }, { farmer: farmer._id, state: 'Jharkhand', crop: 'Paddy', variety: 'Swarna', quantity: 42, unit: 'quintal' }, { upsert: true });
const booking = await Booking.findOneAndUpdate({ bookingNumber: 'KS-2026-100001' }, { bookingNumber: 'KS-2026-100001', state: 'Jharkhand', farmer: farmer._id, centre: centres[0]._id, crop: 'Paddy / Rice', variety: 'Swarna', estimatedQuantity: 35, unit: 'quintal', procurementRate: 2320, appointmentDate: new Date('2026-09-02'), queuePosition: 4, token: 'KS-8F4D2A', status: 'WAITING', statusHistory: [{ status: 'BOOKED', note: 'Produce sale booking created' }, { status: 'WAITING', note: 'Queue assigned' }] }, { upsert: true, new: true });
await Order.findOneAndUpdate({ orderNumber: 'ORD-2026-100001' }, { orderNumber: 'ORD-2026-100001', distributor: distributor._id, state: 'Jharkhand', crop: crop._id, requestedQuantity: 100, unit: 'quintal', status: 'NEW', paymentStatus: 'PENDING', history: [{ status: 'NEW' }] }, { upsert: true });
await Notification.findOneAndUpdate({ user: farmer._id, title: 'Digital token generated' }, { user: farmer._id, state: 'Jharkhand', title: 'Digital token generated', message: `Your token for ${booking.bookingNumber} is KS-8F4D2A.` }, { upsert: true });
console.log('Demo data seeded. All accounts use Demo@123.');
await mongoose.disconnect();
