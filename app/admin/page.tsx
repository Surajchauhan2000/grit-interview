export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUS_UI } from "@/lib/state";
import { fmtFull } from "@/lib/format";
import { demoSet, flagMalpractice, skipCooldown } from "@/lib/admin-actions";

const DEMO = ["NOT_ELIGIBLE", "ELIGIBLE", "PASSED", "FAILED", "RETAKE_LATER", "BADGE_NULLIFIED"] as const;

export default async function AdminPage() {
    const students = await prisma.student.findMany({
        include: { bookings: { include: { slot: { include: { interviewer: true } } } } },
        orderBy: { name: "asc" },
    });
    const count = (f: (s: (typeof students)[number]) => boolean) => students.filter(f).length;
    const stats = [
        { label: "Eligible, not booked", n: count((s) => s.status === "ELIGIBLE"), c: "text-blue-700" },
        { label: "Booked", n: count((s) => s.status === "BOOKED"), c: "text-indigo-700" },
        { label: "Passed", n: count((s) => s.status === "PASSED"), c: "text-green-700" },
        { label: "Fail / Retake", n: count((s) => s.status === "FAILED" || s.status === "RETAKE_LATER"), c: "text-orange-700" },
    ];
    const rank = (s: (typeof students)[number]) => (s.status === "ELIGIBLE" ? 0 : s.status === "BOOKED" ? 1 : 2);
    const sorted = [...students].sort((a, b) => rank(a) - rank(b));

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold">Interview team overview</h1>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {stats.map((x) => (
                    <div key={x.label} className="rounded-xl border bg-white p-3">
                        <p className={`text-2xl font-bold ${x.c}`}>{x.n}</p>
                        <p className="text-sm text-gray-700">{x.label}</p>
                    </div>
                ))}
            </div>

            <div className="overflow-x-auto rounded-xl border bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                    <tr><th className="p-3">Student</th><th className="p-3">Status</th><th className="p-3">Interview</th><th className="p-3">Attempts</th><th className="p-3">Demo controls</th></tr>
                    </thead>
                    <tbody>
                    {sorted.map((s) => {
                        const live = s.bookings.find((b) => b.status === "BOOKED");
                        const used = s.bookings.filter((b) => b.status === "COMPLETED" || b.status === "NO_SHOW").length;
                        return (
                            <tr key={s.id} className="border-t align-top">
                                <td className="p-3"><p className="font-medium">{s.name}</p><p className="text-xs text-gray-700">{s.track}</p></td>
                                <td className="p-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_UI[s.status].color}`}>{STATUS_UI[s.status].label}</span>
                                    {s.status === "ELIGIBLE" && <p className="mt-1 text-xs font-medium text-blue-700">Not booked yet</p>}
                                </td>
                                <td className="p-3">{live ? <>{fmtFull(live.slot.startsAt)}<p className="text-xs text-gray-700">{live.slot.interviewer.name}</p></> : "-"}</td>
                                <td className="p-3">{used}/3</td>
                                <td className="space-y-2 p-3">
                                    <form action={demoSet} className="flex gap-1">
                                        <input type="hidden" name="studentId" value={s.id} />
                                        <select name="to" defaultValue={s.status} className="rounded-md border px-1 py-1 text-xs">
                                            {DEMO.map((d) => <option key={d} value={d}>{STATUS_UI[d].label}</option>)}
                                        </select>
                                        <button className="rounded-md border px-2 py-1 text-xs">Set</button>
                                    </form>
                                    {s.status === "PASSED" && (
                                        <form action={flagMalpractice}><input type="hidden" name="studentId" value={s.id} />
                                            <button className="text-xs text-red-600 underline">Flag malpractice</button></form>
                                    )}
                                    {(s.status === "FAILED" || s.status === "RETAKE_LATER") && (
                                        <form action={skipCooldown}><input type="hidden" name="studentId" value={s.id} />
                                            <button className="text-xs text-indigo-600 underline">Skip cooldown</button></form>
                                    )}
                                    <Link href={`/student?id=${s.id}`} className="block text-xs text-indigo-600 underline">Open student view</Link>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}