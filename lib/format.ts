const tz = "Asia/Kolkata";
export const fmtDay = (d: Date) =>
    d.toLocaleDateString("en-IN", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
export const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { timeZone: tz, hour: "numeric", minute: "2-digit" });
export const fmtFull = (d: Date) => `${fmtDay(d)}, ${fmtTime(d)} IST`;