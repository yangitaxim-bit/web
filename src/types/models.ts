import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  phoneNumber: string;
  fullName: string;
  role: 'passenger' | 'driver' | 'admin';
  isBlocked: boolean;
  createdAt: Timestamp;
}

export interface Driver {
  uid: string;
  carModel: string;
  carPlateNumber: string;
  drivingLicensePhotoUrl: string;
  taxiLicensePhotoUrl: string;
  techPassportPhotoUrl: string;
  isApproved: boolean;
  isOnline: boolean;
  currentLat: number | null;
  currentLng: number | null;
  lastLocationUpdate: Timestamp | null;
  rating: number;
  totalTrips: number;
}

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

export interface Settings {
  baseFare: number;
  pricePerKm: number;
  commissionPercent: number;
  currency: string;
}
