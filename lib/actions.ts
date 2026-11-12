"use server";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { RULES, assertMove } from "./state";
import { fmtDay } from "./format";

function back(id: string, key: "ok" | "err", text: string): never {
    redirect(`/student?id=${id}&${key}=${encodeURIComponent(text)}`);
}

export async function bookSlot(fd: FormData) {
    const studentId = String(fd.get("studentId"));
    const startsAt = new Date(String(fd.get("startsAt")));
    let err: string | null = null;

    try {
        await prisma.$transaction(async (tx) => {
            const st = await tx.student.findUniqueOrThrow({ where: { id: studentId } });
            if (st.status !== "ELIGIBLE") throw new Error("You can't book an interview right now.");
            if (st.retakeAfter && st.retakeAfter > new Date())
                throw new Error(`You can book again from ${fmtDay(st.retakeAfter)}.`);
            if (startsAt <= new Date()) throw new Error("That time has passed.");

            const used = await tx.booking.count({
                where: { studentId, status: { in: ["COMPLETED", "NO_SHOW"] } },
            });
            if (used >= RULES.MAX_ATTEMPTS) throw new Error("You've used all interview attempts.");

            // Is time ke saare OPEN slots, jis interviewer ke paas sabse kam interviews hain wo chuno
            const open = await tx.slot.findMany({ where: { startsAt, status: "OPEN" } });
            if (open.length === 0) throw new Error("That slot was just taken. Please pick another time.");
            const loads = await Promise.all(
                open.map((s) =>
                    tx.booking.count({
                        where: { status: { in: ["BOOKED", "COMPLETED"] }, slot: { interviewerId: s.interviewerId } },
                    })
                )
            );
            const pick = open[loads.indexOf(Math.min(...loads))];

            // RACE CONDITION: update tabhi hoga jab slot abhi bhi OPEN ho
            const won = await tx.slot.updateMany({
                where: { id: pick.id, status: "OPEN" },
                data: { status: "BOOKED" },
            });
            if (won.count === 0) throw new Error("That slot was just taken. Please pick another time.");

            assertMove(st.status, "BOOKED");
            await tx.booking.create({ data: { studentId, slotId: pick.id, attempt: used + 1 } });
            await tx.student.update({ where: { id: studentId }, data: { status: "BOOKED" } });
            await tx.auditLog.create({
                data: { entity: "Booking", entityId: pick.id, action: "BOOKED", actor: studentId },
            });
        });
    } catch (e) {
        err = e instanceof Error ? e.message : "Something went wrong.";
    }
    if (err) back(studentId, "err", err);
    back(studentId, "ok", "Interview booked!");
}

export async function cancelBooking(fd: FormData) {
    const studentId = String(fd.get("studentId"));
    const bookingId = String(fd.get("bookingId"));
    let err: string | null = null;

    try {
        await prisma.$transaction(async (tx) => {
            const b = await tx.booking.findUniqueOrThrow({
                where: { id: bookingId },
                include: { slot: true },
            });
            if (b.studentId !== studentId || b.status !== "BOOKED") throw new Error("Nothing to cancel.");

            const hoursLeft = (b.slot.startsAt.getTime() - Date.now()) / 36e5;
            if (hoursLeft < RULES.CANCEL_BEFORE_HOURS)
                throw new Error(`Cancellation closes ${RULES.CANCEL_BEFORE_HOURS} hours before the interview.`);

            await tx.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
            await tx.slot.update({ where: { id: b.slotId }, data: { status: "OPEN" } }); // slot wapas khul gaya
            await tx.student.update({ where: { id: studentId }, data: { status: "ELIGIBLE" } });
            await tx.auditLog.create({
                data: { entity: "Booking", entityId: bookingId, action: "CANCELLED", actor: studentId },
            });
        });
    } catch (e) {
        err = e instanceof Error ? e.message : "Something went wrong.";
    }
    if (err) back(studentId, "err", err);
    back(studentId, "ok", "Booking cancelled. You can pick a new slot.");
}