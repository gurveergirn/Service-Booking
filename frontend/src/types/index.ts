export type Role = "CUSTOMER" | "PROVIDER";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
  has_provider_profile: boolean;
}

/** Identity decoded from the access token; available on the server and passed to the client. */
export interface Session {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ProviderSummary {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  category: string;
  location: string;
  hourly_rate: number;
  avatar_url: string | null;
  avg_rating: number;
  review_count: number;
  starting_price: number;
}

export interface Service {
  id: string;
  provider_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

export interface AvailabilityWindow {
  id?: string;
  /** 0 = Sunday ... 6 = Saturday */
  day_of_week: number;
  /** "HH:MM" or "HH:MM:SS" */
  start_time: string;
  end_time: string;
}

export interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}

export interface ProviderDetail extends ProviderSummary {
  services: Service[];
  availability: AvailabilityWindow[];
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
}

export interface SlotsResponse {
  date: string;
  service_id: string;
  blocked: boolean;
  slots: TimeSlot[];
}

export interface Booking {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  provider_id: string;
  provider_name: string;
  provider_email: string;
  provider_category: string;
  provider_avatar_url: string | null;
  service_id: string;
  service_name: string;
  duration_minutes: number;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  price: number;
  cancelled_by: Role | null;
  created_at: string;
  is_upcoming: boolean;
  has_review: boolean;
}

export interface Review {
  id: string;
  booking_id: string;
  provider_id: string;
  customer_name: string;
  service_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ProviderDashboard {
  today: Booking[];
  pending: Booking[];
  upcoming: Booking[];
  earnings: { total: number; this_month: number; completed_count: number };
  rating: { average: number; count: number };
}
