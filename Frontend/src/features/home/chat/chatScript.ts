/** The scripted conversation the chat demo plays: a match turning into plans. */

export type ChatLine =
  | { from: "me" | "them"; kind: "text"; text: string; reaction?: string }
  | { from: "me" | "them"; kind: "voice"; seconds: number }
  | { kind: "event"; text: string };

export const CHAT: ChatLine[] = [
  { kind: "event", text: "You matched with Meera · 1 km away" },
  { from: "them", kind: "text", text: "Hey! Saw bouldering on your profile 🧗 how long have you been climbing?" },
  { from: "me", kind: "text", text: "About a year! Still looking for a regular climbing buddy", reaction: "🙌" },
  { from: "them", kind: "voice", seconds: 7 },
  { from: "me", kind: "text", text: "Haha same. Saturday morning at the wall on 5th?" },
  { from: "them", kind: "text", text: "Deal. Coffee after? ☕", reaction: "❤️" },
  { kind: "event", text: "🎉 Plans made · Saturday, 9:00" },
];
