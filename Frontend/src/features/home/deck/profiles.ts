/**
 * Sample people for the hero deck. Fictional, drawn (no photos — the product
 * has none). `mutual` decides whether saying hello shows the match moment.
 */

export type SampleProfile = {
  name: string;
  age: number;
  km: number;
  bio: string;
  interests: string[];
  /** Tailwind classes for the avatar circle — tokens only. */
  avatar: string;
  mutual: boolean;
};

export const PROFILES: SampleProfile[] = [
  {
    name: "Asha",
    age: 27,
    km: 2,
    bio: "New in town and looking for people to explore trails and weekend markets with. Always up for a game night.",
    interests: ["Hiking", "Board games", "Coffee", "Photo walks"],
    avatar: "bg-secondary-soft text-secondary-deep",
    mutual: true,
  },
  {
    name: "Rohan",
    age: 31,
    km: 4,
    bio: "Amateur chef, terrible guitarist. Looking for a Sunday cooking crew and someone to drag to open mics.",
    interests: ["Cooking", "Live music", "Cycling"],
    avatar: "bg-primary-soft text-primary-deep",
    mutual: false,
  },
  {
    name: "Meera",
    age: 24,
    km: 1,
    bio: "Bouldering three times a week and always hunting for a new belay buddy. Coffee after is non-negotiable.",
    interests: ["Bouldering", "Coffee", "Yoga", "Reading"],
    avatar: "bg-info-soft text-info",
    mutual: true,
  },
  {
    name: "Kabir",
    age: 29,
    km: 6,
    bio: "Board game collector (140 and counting). Hosting a strategy night every Friday — bring snacks.",
    interests: ["Board games", "Sci-fi", "Baking"],
    avatar: "bg-warning-soft text-warning",
    mutual: false,
  },
  {
    name: "Zoya",
    age: 26,
    km: 3,
    bio: "Sketchbook always in my bag. Let's hit galleries, flea markets and every chai stall in the city.",
    interests: ["Art", "Chai", "Thrifting", "Films"],
    avatar: "bg-success-soft text-success",
    mutual: true,
  },
  {
    name: "Dev",
    age: 33,
    km: 5,
    bio: "Early riser. 6am runs by the lake, badminton on weekends, and I will talk podcasts for hours.",
    interests: ["Running", "Badminton", "Podcasts"],
    avatar: "bg-danger-soft text-danger",
    mutual: false,
  },
];
