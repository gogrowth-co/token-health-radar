export function band(n?: number | null) {
  if (n == null) return { text: "#9aa3af", fill: "#374151" } // muted
  if (n >= 70) return { text: "#10b981", fill: "rgba(16,185,129,0.18)" } // green
  if (n >= 40) return { text: "#f59e0b", fill: "rgba(245,158,11,0.20)" } // amber
  return { text: "#ef4444", fill: "rgba(239,68,68,0.20)" } // red
}
