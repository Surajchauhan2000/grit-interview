"use server";
import { redirect } from "next/navigation";
import type { Result } from "@prisma/client";
import { prisma } from "./prisma";
import { RULES, assertMove } from "./state";

function back(id: string, key: "ok" | "err", text: string): never {
    redirect(`/interviewer?id=${id}&${key}=${encodeURIComponent(text)}`);
}
const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export async function addAvailability(fd: FormData) {
    const id = String(fd.get("interviewerId"));
    const date = String(fd.get("date"));
    const from = Number(fd.get("from"));
    const to = Number(fd.get("to"));
    if (!date || !(to > from)) back(id, "err", "Choose a date and a valid time range.");

    const times: Date[] = [];
    for (let m = from * 60; m < to * 60; m += RULES.SLOT_MINUTES) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        times.push(new Date(`${date}T${hh}:${mm}:00+05:30`)); // hamesha IST
    }
    const future = times.filter((t) => t > new Date());
    if (!future.length) back(id, "err", "Those times are in the past.");

    await prisma.slot.createMany({
        data: future.map((t) => ({
            interviewerId: id,
            startsAt: t,
            endsAt: new Date(t.getTime() + RULES.SLOT_MINUTES * 60000),
        })),
        skipDuplicates: true,
    });
    // pehle hataye gaye slot wapas khol do
    await prisma.slot.updateMany({
        where: { interviewerId: id, startsAt: { in: future }, status: "CANCELLED" },
        data: { status: "OPEN" },
    });
    back(id, "ok", `Availability saved (${future.length} slots).`);
}

export async function removeSlot(fd: FormData) {
    const id = String(fd.get("interviewerId"));
    const slotId = String(fd.get("slotId"));
    // sirf OPEN slot hi hat sakta hai, booked slot par student ka interview hai
    const r = await prisma.slot.updateMany({
        where: { id: slotId, status: "OPEN" },
        data: { status: "CANCELLED" },
    });
    if (r.count === 0) back(id, "err", "This slot is already booked. Ask the admin to reassign it.");
    back(id, "ok", "Slot removed.");
}

const NEXT = { PASS: "PASSED", FAIL: "FAILED", RETAKE: "RETAKE_LATER" } as const;

export async function recordOutcome(fd: FormData) {
    const id = String(fd.get("interviewerId"));
    const bookingId = String(fd.get("bookingId"));
    const result = String(fd.get("result")) as Result;
    const notes = String(fd.get("notes") ?? "").trim() || null;
    let err: string | null = null;

    try {
        if (!(result in NEXT)) throw new Error("Pick a result.");
        await prisma.$transaction(async (tx) => {
            const b = await tx.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { student: true } });
            if (b.status !== "BOOKED") throw new Error("Outcome already recorded.");
            const target = NEXT[result];
            assertMove(b.student.status, "AWAITING_RESULT");
            assertMove("AWAITING_RESULT", target);

            await tx.outcome.create({ data: { bookingId, result, notes, recordedBy: id } });
            await tx.booking.update({ where: { id: bookingId }, data: { status: "COMPLETED" } });
            await tx.student.update({
                where: { id: b.studentId },
                data: {
                    status: target,
                    retakeAfter: target === "PASSED" ? null : new Date(Date.now() + RULES.RETAKE_COOLDOWN_DAYS * 864e5),
                },
            });
            if (target === "PASSED") await tx.badge.create({ data: { studentId: b.studentId, track: b.student.track } });
            await tx.auditLog.create({
                data: { entity: "Booking", entityId: bookingId, action: `OUTCOME_${result}`, actor: id },
            });
        });
    } catch (e) {
        err = msg(e);
    }
    if (err) back(id, "err", err);
    back(id, "ok", "Outcome recorded.");
}

export async function markNoShow(fd: FormData) {
    const id = String(fd.get("interviewerId"));
    const bookingId = String(fd.get("bookingId"));
    let err: string | null = null;

    try {
        await prisma.$transaction(async (tx) => {
            const b = await tx.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { student: true } });
            if (b.status !== "BOOKED") throw new Error("Already handled.");
            assertMove(b.student.status, "ELIGIBLE");
            await tx.booking.update({ where: { id: bookingId }, data: { status: "NO_SHOW" } });
            await tx.student.update({ where: { id: b.studentId }, data: { status: "ELIGIBLE" } });
            await tx.auditLog.create({ data: { entity: "Booking", entityId: bookingId, action: "NO_SHOW", actor: id } });
        });
    } catch (e) {
        err = msg(e);
    }
    if (err) back(id, "err", err);
    back(id, "ok", "Marked as no-show. The attempt is counted.");
}