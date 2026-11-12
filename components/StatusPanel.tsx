import { STATUS_UI } from "@/lib/state";
import { messageFor, type View } from "@/lib/messages";

const STEPS = ["Clear contests", "Book slot", "Interview", "Result"];
const IDX: Record<string, number> = { NOT_ELIGIBLE: 0, ELIGIBLE: 1, BOOKED: 2, AWAITING_RESULT: 3 };
const TONE = {
    info: "border-indigo-200 bg-indigo-50", success: "border-green-200 bg-green-50",
    warn: "border-amber-200 bg-amber-50", danger: "border-red-200 bg-red-50",
};

export default function StatusPanel({ v }: { v: View }) {
    const ui = STATUS_UI[v.status];
    const idx = IDX[v.status] ?? 4;
    const m = messageFor(v);
    return (
        <div className="space-y-3">
            <div className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">{v.track} Track · Interview</p>
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${ui.color}`}>{ui.label}</span>
                </div>
                <div className="mt-4 flex gap-1">
                    {STEPS.map((s, i) => (
                        <div key={s} className="flex-1">
                            <div className={`h-1.5 rounded ${i < idx ? "bg-green-500" : i === idx ? "bg-indigo-500" : "bg-gray-200"}`} />
                            <p className="mt-1 text-[11px] text-gray-700">{s}</p>
                        </div>
                    ))}
                </div>
            </div>

            {m && (
                <div className={`rounded-xl border p-4 ${TONE[m.tone]}`}>
                    <p className="font-semibold">{m.title}</p>
                    <p className="mt-1 text-sm">{m.body}</p>
                    {v.notes && (v.status === "FAILED" || v.status === "RETAKE_LATER") && (
                        <p className="mt-2 rounded-md bg-white/70 p-2 text-sm"><b>Interviewer feedback:</b> {v.notes}</p>
                    )}
                </div>
            )}

            <div className="rounded-xl border bg-white p-4 text-sm">
                {v.status === "PASSED" ? (
                    <p>🏅 <b>{v.track} Track Badge</b> earned</p>
                ) : v.status === "BADGE_NULLIFIED" ? (
                    <p className="text-rose-700">🚫 <b>{v.track} Track Badge</b> nullified</p>
                ) : (
                    <p className="text-gray-700">🔒 {v.track} Track Badge: pass the interview to earn it</p>
                )}
            </div>
        </div>
    );
}