import { Brush, Camera, Dog, Dumbbell, GraduationCap, Hand, Music, Scissors, Sparkles, SprayCan, type LucideIcon } from "lucide-react";

/** Mirrors CATEGORIES in backend/app/models/common.py */
export const CATEGORIES: { name: string; icon: LucideIcon }[] = [
  { name: "Barber", icon: Scissors },
  { name: "Hair Stylist", icon: Brush },
  { name: "Tutor", icon: GraduationCap },
  { name: "Cleaner", icon: SprayCan },
  { name: "Personal Trainer", icon: Dumbbell },
  { name: "Massage Therapist", icon: Hand },
  { name: "Photographer", icon: Camera },
  { name: "Pet Groomer", icon: Dog },
  { name: "Nail Technician", icon: Sparkles },
  { name: "Music Teacher", icon: Music },
];
