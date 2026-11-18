// Stand-in for src/views/GymReminder.jsx, which this fork removes along with the gym map
// (Leaflet) and the place search (.fork/removed-paths). Settings.jsx still imports the pages;
// they are phone-only (settings-pages.js gates them on MOBILE), so nothing ever renders these.
export default function GymReminderPage() { return null }
export function GymFindPage() { return null }
export function GymEditPage() { return null }
