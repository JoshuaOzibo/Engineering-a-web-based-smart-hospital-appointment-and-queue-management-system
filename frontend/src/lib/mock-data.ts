import doc1 from "@/assets/doc-1.jpg";
import doc2 from "@/assets/doc-2.jpg";
import doc3 from "@/assets/doc-3.jpg";

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  department: string;
  experience: number;
  rating: number;
  nextAvailable: string;
  queue: number;
  photo: string;
  bio: string;
};

export const doctors: Doctor[] = [
  {
    id: "d1",
    name: "Dr. Mei Tanaka",
    specialty: "Internal Medicine",
    department: "General Medicine",
    experience: 12,
    rating: 4.9,
    nextAvailable: "Today · 2:40 PM",
    queue: 3,
    photo: doc1,
    bio: "Focuses on preventive care and chronic condition management.",
  },
  {
    id: "d2",
    name: "Dr. Daniel Weiss",
    specialty: "Cardiology",
    department: "Cardiology",
    experience: 18,
    rating: 4.8,
    nextAvailable: "Tomorrow · 9:15 AM",
    queue: 6,
    photo: doc2,
    bio: "Interventional cardiologist, 1,200+ procedures.",
  },
  {
    id: "d3",
    name: "Dr. Amara Okafor",
    specialty: "Pediatrics",
    department: "Pediatrics",
    experience: 9,
    rating: 4.9,
    nextAvailable: "Today · 4:00 PM",
    queue: 2,
    photo: doc3,
    bio: "Gentle, child-friendly approach to family health.",
  },
];

export const departments = [
  "General Medicine",
  "Cardiology",
  "Pediatrics",
  "Dermatology",
  "Orthopedics",
  "Neurology",
  "Gynecology",
  "ENT",
  "Ophthalmology",
];

export const branches = [
  "St. Helena — Main Campus",
  "St. Helena — Westside Clinic",
  "St. Helena — Riverside",
];

export const timeSlots = [
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
];
