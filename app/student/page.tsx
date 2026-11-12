export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RULES, STATUS_UI } from "@/lib/state";
import { fmtDay, fmtTime, fmtFull } from "@/lib/format";
import { bookSlot, cancelBooking } from "@/lib/actions";
import StatusPanel from "@/components/StatusPanel";

type Props = { searchParams: Promise<{ id?: string; ok?: string; err?: string }> };

export default async function StudentPage({ searchParams }: Props) {
    const { id, ok, err } = await searchParams;

    if (!id) {
        const students = await prisma.student.findMany({ orderBy: { name: "asc" } });
        return (
            <div className="space-y-3">
                <h1 className="text-xl font-semibold">Continue as a student (demo)</h1>
                {students.map((s) => (
                    <Link key={s.id} href={`/student?id=${s.id}`}
                          className="flex items-center justify-between rounded-lg border bg-white p-3 hover:border-indigo-400">
                        <span>{s.name} <span className="text-sm text-gray-700">· {s.track}</span></span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_UI[s.status].color}`}>{STATUS_UI[s.status].label}</span>
                    </Link>
                ))}
            </div>
        );
    }

    let student = await prisma.student.findUniqueOrThrow({ where: { id } });
    // Cooldown khatam: FAILED / RETAKE_LATER apne aap ELIGIBLE ho jata hai
    if ((student.status === "FAILED" || student.status === "RETAKE_LATER") && (!student.retakeAfter || student.retakeAfter <= new Date()))
        student = await prisma.student.update({ where: { id }, data: { status: "ELIGIBLE", retakeAfter: null } });

    const booking = await prisma.booking.findFirst({
        where: { studentId: id, status: "BOOKED" },
        include: { slot: { include: { interviewer: true } } },
    });
    const used = await prisma.booking.count({ where: { studentId: id, status: { in: ["COMPLETED", "NO_SHOW"] } } });
    const last = await prisma.outcome.findFirst({ where: { booking: { studentId: id } }, orderBy: { recordedAt: "desc" } });
    const attemptsLeft = Math.max(0, RULES.MAX_ATTEMPTS - used);

    const canBook = student.status === "ELIGIBLE" && attemptsLeft > 0;
    const slots = canBook
        ? await prisma.slot.findMany({ where: { status: "OPEN", startsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" } })
        : [];
    const unique = new Map<number, (typeof slots)[number]>();
    slots.forEach((s) => !unique.has(s.startsAt.getTime()) && unique.set(s.startsAt.getTime(), s));
    const byDay = new Map<string, typeof slots>();
    [...unique.values()].forEach((s) => {
        const k = fmtDay(s.startsAt);
        byDay.set(k, [...(byDay.get(k) ?? []), s]);
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Hi {student.name.split(" ")[0]} 👋</h1>
                <Link href="/student" className="text-sm text-indigo-600">Switch student</Link>
            </div>

            {ok && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{ok}</p>}
            {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

            <StatusPanel
                v={{
                    name: student.name, track: student.track, status: student.status, attemptsLeft,
                    notes: last?.notes,
                    retakeFrom: student.retakeAfter ? fmtDay(student.retakeAfter) : undefined,
                    slotAt: booking ? fmtFull(booking.slot.startsAt) : undefined,
                    interviewer: booking?.slot.interviewer.name,
                    hoursLeft: booking ? (booking.slot.startsAt.getTime() - Date.now()) / 36e5 : undefined,
                    cancelBy: booking ? fmtFull(new Date(booking.slot.startsAt.getTime() - RULES.CANCEL_BEFORE_HOURS * 36e5)) : undefined,
                }}
            />

            {booking && (
                <form action={cancelBooking} className="rounded-xl border bg-white p-4">
                    <input type="hidden" name="studentId" value={id} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600">Cancel booking</button>
                    <p className="mt-2 text-xs text-gray-700">Free cancellation up to {RULES.CANCEL_BEFORE_HOURS} hours before.</p>
                </form>
            )}

            {canBook && (
                <div className="space-y-3">
                    <h2 className="font-semibold">Pick a time (IST)</h2>
                    {byDay.size === 0 && <p className="text-sm text-gray-700">No slots open right now. Please check back soon.</p>}
                    {[...byDay.entries()].map(([day, list]) => (
                        <div key={day} className="rounded-xl border bg-white p-3">
                            <p className="mb-2 text-sm font-medium">{day}</p>
                            <div className="flex flex-wrap gap-2">
                                {list.map((s) => (
                                    <form key={s.id} action={bookSlot}>
                                        <input type="hidden" name="studentId" value={id} />
                                        <input type="hidden" name="startsAt" value={s.startsAt.toISOString()} />
                                        <button className="rounded-md border px-3 py-1.5 text-sm hover:border-indigo-500 hover:bg-indigo-50">{fmtTime(s.startsAt)}</button>
                                    </form>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}