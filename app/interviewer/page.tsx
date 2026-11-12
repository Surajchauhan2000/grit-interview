export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtDay, fmtTime } from "@/lib/format";
import { addAvailability, removeSlot, recordOutcome, markNoShow } from "@/lib/interviewer-actions";

type Props = { searchParams: Promise<{ id?: string; ok?: string; err?: string }> };

export default async function InterviewerPage({ searchParams }: Props) {
    const { id, ok, err } = await searchParams;

    if (!id) {
        const list = await prisma.interviewer.findMany({ orderBy: { name: "asc" } });
        return (
            <div className="space-y-3">
                <h1 className="text-xl font-semibold">Continue as an interviewer (demo)</h1>
                {list.map((i) => (
                    <Link key={i.id} href={`/interviewer?id=${i.id}`}
                          className="block rounded-lg border bg-white p-3 hover:border-indigo-400">{i.name}</Link>
                ))}
            </div>
        );
    }

    const me = await prisma.interviewer.findUniqueOrThrow({ where: { id } });
    const bookings = await prisma.booking.findMany({
        where: { slot: { interviewerId: id }, status: { in: ["BOOKED", "COMPLETED", "NO_SHOW"] } },
        include: { student: true, slot: true, outcome: true },
        orderBy: { slot: { startsAt: "asc" } },
    });
    const pending = bookings.filter((b) => b.status === "BOOKED");
    const done = bookings.filter((b) => b.status !== "BOOKED");
    const open = await prisma.slot.findMany({
        where: { interviewerId: id, status: "OPEN", startsAt: { gt: new Date() } },
        orderBy: { startsAt: "asc" },
    });

    const group = <T,>(arr: T[], d: (x: T) => Date) => {
        const m = new Map<string, T[]>();
        arr.forEach((x) => m.set(fmtDay(d(x)), [...(m.get(fmtDay(d(x))) ?? []), x]));
        return [...m.entries()];
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">{me.name}&apos;s schedule</h1>
                <Link href="/interviewer" className="text-sm text-indigo-600">Switch interviewer</Link>
            </div>
            {ok && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{ok}</p>}
            {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

            <section className="space-y-3">
                <h2 className="font-semibold">Upcoming interviews ({pending.length})</h2>
                {pending.length === 0 && <p className="text-sm text-gray-700">No interviews booked yet.</p>}
                {group(pending, (b) => b.slot.startsAt).map(([day, list]) => (
                    <div key={day} className="space-y-2 rounded-xl border bg-white p-3">
                        <p className="text-sm font-medium">{day}</p>
                        {list.map((b) => (
                            <div key={b.id} className="space-y-2 rounded-lg border p-3">
                                <p><b>{fmtTime(b.slot.startsAt)}</b> · {b.student.name}
                                    <span className="text-sm text-gray-700"> · {b.student.track} · attempt {b.attempt}</span></p>
                                <form action={recordOutcome} className="flex flex-wrap items-center gap-2">
                                    <input type="hidden" name="interviewerId" value={id} />
                                    <input type="hidden" name="bookingId" value={b.id} />
                                    <select name="result" required defaultValue="" className="rounded-md border px-2 py-1.5 text-sm">
                                        <option value="" disabled>Result…</option>
                                        <option value="PASS">Pass</option>
                                        <option value="FAIL">Fail</option>
                                        <option value="RETAKE">Retake later</option>
                                    </select>
                                    <input name="notes" placeholder="Notes (optional)" className="min-w-40 flex-1 rounded-md border px-2 py-1.5 text-sm" />
                                    <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white">Save outcome</button>
                                </form>
                                <form action={markNoShow}>
                                    <input type="hidden" name="interviewerId" value={id} />
                                    <input type="hidden" name="bookingId" value={b.id} />
                                    <button className="text-xs text-red-600 underline">Mark no-show</button>
                                </form>
                            </div>
                        ))}
                    </div>
                ))}
            </section>

            {done.length > 0 && (
                <section className="space-y-2">
                    <h2 className="font-semibold">Completed</h2>
                    {done.map((b) => (
                        <p key={b.id} className="rounded-lg border bg-white p-3 text-sm">
                            {fmtDay(b.slot.startsAt)}, {fmtTime(b.slot.startsAt)} · {b.student.name} ·{" "}
                            <b>{b.outcome?.result ?? b.status}</b>{b.outcome?.notes ? ` · ${b.outcome.notes}` : ""}
                        </p>
                    ))}
                </section>
            )}

            <section className="space-y-3">
                <h2 className="font-semibold">My availability</h2>
                <form action={addAvailability} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-3 text-sm">
                    <input type="hidden" name="interviewerId" value={id} />
                    <label>Date<input type="date" name="date" required className="mt-1 block rounded-md border px-2 py-1.5" /></label>
                    <label>From (hr)<input type="number" name="from" min={0} max={23} defaultValue={10} className="mt-1 block w-20 rounded-md border px-2 py-1.5" /></label>
                    <label>To (hr)<input type="number" name="to" min={1} max={24} defaultValue={13} className="mt-1 block w-20 rounded-md border px-2 py-1.5" /></label>
                    <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-white">Add 30-min slots</button>
                </form>
                {group(open, (s) => s.startsAt).map(([day, list]) => (
                    <div key={day} className="rounded-xl border bg-white p-3">
                        <p className="mb-2 text-sm font-medium">{day}</p>
                        <div className="flex flex-wrap gap-2">
                            {list.map((s) => (
                                <form key={s.id} action={removeSlot}>
                                    <input type="hidden" name="interviewerId" value={id} />
                                    <input type="hidden" name="slotId" value={s.id} />
                                    <button title="Remove slot" className="rounded-md border px-2 py-1 text-sm hover:border-red-400 hover:text-red-600">
                                        {fmtTime(s.startsAt)} ✕
                                    </button>
                                </form>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}