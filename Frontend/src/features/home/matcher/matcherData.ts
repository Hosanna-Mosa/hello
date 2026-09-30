/** Interests and fictional sample people for the "try it" radar. */

export const INTERESTS = [
  "☕ Coffee",
  "🥾 Hiking",
  "🎲 Board games",
  "🎸 Live music",
  "🧗 Bouldering",
  "📚 Reading",
  "🍜 Food crawls",
  "🎨 Art",
  "🏸 Badminton",
  "🎬 Films",
] as const;

export type Interest = (typeof INTERESTS)[number];

export type RadarPerson = {
  name: string;
  interests: Interest[];
  /** Position on the radar, as % of its size. */
  top: string;
  left: string;
  avatar: string;
};

export const PEOPLE: RadarPerson[] = [
  { name: "Asha", interests: ["🥾 Hiking", "☕ Coffee", "🎲 Board games"], top: "18%", left: "30%", avatar: "bg-secondary-soft text-secondary-deep" },
  { name: "Rohan", interests: ["🎸 Live music", "🍜 Food crawls"], top: "26%", left: "76%", avatar: "bg-primary-soft text-primary-deep" },
  { name: "Meera", interests: ["🧗 Bouldering", "☕ Coffee", "📚 Reading"], top: "58%", left: "84%", avatar: "bg-info-soft text-info" },
  { name: "Kabir", interests: ["🎲 Board games", "🎬 Films"], top: "80%", left: "62%", avatar: "bg-warning-soft text-warning" },
  { name: "Zoya", interests: ["🎨 Art", "🎬 Films", "☕ Coffee"], top: "76%", left: "22%", avatar: "bg-success-soft text-success" },
  { name: "Dev", interests: ["🏸 Badminton", "🥾 Hiking"], top: "46%", left: "12%", avatar: "bg-danger-soft text-danger" },
  { name: "Isha", interests: ["📚 Reading", "🎨 Art", "🍜 Food crawls"], top: "10%", left: "58%", avatar: "bg-primary-soft text-primary-deep" },
  { name: "Arjun", interests: ["🧗 Bouldering", "🏸 Badminton", "🎸 Live music"], top: "90%", left: "42%", avatar: "bg-secondary-soft text-secondary-deep" },
];
