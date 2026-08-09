import { Timestamp } from 'firebase/firestore';

/**
 * Tizimning barcha foydalanuvchilari uchun TypeScript modeli.
 */
export interface User {
  uid: string;
  phoneNumber: string;
  fullName: string;
  role: 'passenger' | 'driver' | 'admin';
  isBlocked: boolean;
  createdAt: Timestamp;
}

/**
 * Haydovchilar uchun qo'shimcha ma'lumotlar modeli.
 */
export interface Driver {
  uid: string;
  carModel: string;
  carPlateNumber: string;
  drivingLicensePhotoUrl: string;
  taxiLicensePhotoUrl: string; // Sariq litsenziya
  techPassportPhotoUrl: string;
  isApproved: boolean;
  isOnline: boolean;
  currentLat: number | null;
  currentLng: number | null;
  lastLocationUpdate: Timestamp | null;
  rating: number;
  totalTrips: number;
}

/**
 * Taksi buyurtmalari modeli.
 */
export interface Order {
  orderId: string;
  passengerId: string;
  driverId: string | null;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  distanceKm: number;
  durationMin: number;
  price: number;
  commissionAmount: number;
  status: 'searching' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

/**
 * Tizimning global narx va komissiya sozlamalari.
 */
export interface Settings {
  baseFare: number;
  pricePerKm: number;
  commissionPercent: number;
  currency: string;
}
