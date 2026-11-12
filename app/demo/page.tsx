import StatusPanel from "@/components/StatusPanel";
import type { View } from "@/lib/messages";

const base = { name: "Aarav Sharma", track: "Full Stack", attemptsLeft: 2 };
const booked = { slotAt: "Sat, 15 Nov, 10:00 am IST", interviewer: "Priya Nair", cancelBy: "Fri, 14 Nov, 10:00 am IST" };

const before: [string, View][] = [
    ["1. Eligible, not booked", { ...base, attemptsLeft: 3, status: "ELIGIBLE" }],
    ["2. Booked (more than 24h away)", { ...base, attemptsLeft: 3, status: "BOOKED", ...booked, hoursLeft: 48 }],
    ["3. Reminder (within 24h)", { ...base, attemptsLeft: 3, status: "BOOKED", ...booked, hoursLeft: 20 }],
];
const after: [string, View][] = [
    ["Passed", { ...base, status: "PASSED" }],
    ["Failed", { ...base, status: "FAILED", retakeFrom: "29 Nov", notes: "Revise SQL joins and API error handling." }],
    ["Retake later", { ...base, status: "RETAKE_LATER", retakeFrom: "29 Nov", notes: "Strong on React, needs more depth in system design." }],
    ["Badge nullified (malpractice)", { ...base, status: "BADGE_NULLIFIED" }],
];

function Grid({ items }: { items: [string, View][] }) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {items.map(([t, v]) => (
                <div key={t} className="space-y-2">
                    <p className="text-sm font-semibold text-indigo-700">{t}</p>
                    <StatusPanel v={v} />
                </div>
            ))}
        </div>
    );
}

export default function Demo() {
    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Student home: before and after the result</h1>
            <h2 className="font-semibold">BEFORE the result</h2>
            <Grid items={before} />
            <h2 className="font-semibold">AFTER the result</h2>
            <Grid items={after} />
        </div>
    );
}