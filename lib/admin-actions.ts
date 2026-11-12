"use server";
import { revalidatePath } from "next/cache";
import type { StudentStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { RULES, assertMove } from "./state";

// Malpractice baad mein mila: sirf PASSED student ka badge nullify ho sakta hai
export async function flagMalpractice(fd: FormData) {
    const studentId = String(fd.get("studentId"));
    await prisma.$transaction(async (tx) => {
        const s = await tx.student.findUniqueOrThrow({ where: { id: studentId } });
        assertMove(s.status, "BADGE_NULLIFIED");
        await tx.student.update({ where: { id: studentId }, data: { status: "BADGE_NULLIFIED" } });
        await tx.badge.updateMany({
            where: { studentId, active: true },
            data: { active: false, nullifiedReason: "Malpractice flagged after interview" },
        });
        await tx.auditLog.create({ data: { entity: "Student", entityId: studentId, action: "BADGE_NULLIFIED", actor: "admin" } });
    });
    revalidatePath("/admin");
}

// Demo: cooldown khatam hua maan lo (student agli baar dashboard kholega to ELIGIBLE ho jayega)
export async function skipCooldown(fd: FormData) {
    await prisma.student.update({
        where: { id: String(fd.get("studentId")) },
        data: { retakeAfter: new Date(Date.now() - 1000) },
    });
    revalidatePath("/admin");
}

// Demo: student ko seedha kisi state mein daalo (before/after screens ke liye)
export async function demoSet(fd: FormData) {
    const studentId = String(fd.get("studentId"));
    const to = String(fd.get("to")) as StudentStatus;
    await prisma.$transaction(async (tx) => {
        // Active booking ho to cancel karo aur slot wapas kholo (contest revoke wala case bhi yahi hai)
        const live = await tx.booking.findMany({ where: { studentId, status: "BOOKED" } });
        for (const b of live) {
            await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
            await tx.slot.update({ where: { id: b.slotId }, data: { status: "OPEN" } });
        }
        const s = await tx.student.findUniqueOrThrow({ where: { id: studentId } });
        const cool = to === "FAILED" || to === "RETAKE_LATER" ? new Date(Date.now() + RULES.RETAKE_COOLDOWN_DAYS * 864e5) : null;
        await tx.student.update({ where: { id: studentId }, data: { status: to, retakeAfter: cool } });
        await tx.badge.deleteMany({ where: { studentId } });
        if (to === "PASSED") await tx.badge.create({ data: { studentId, track: s.track } });
        if (to === "BADGE_NULLIFIED")
            await tx.badge.create({ data: { studentId, track: s.track, active: false, nullifiedReason: "Malpractice flagged after interview" } });
        await tx.auditLog.create({ data: { entity: "Student", entityId: studentId, action: `DEMO_SET_${to}`, actor: "admin" } });
    });
    revalidatePath("/admin");
}