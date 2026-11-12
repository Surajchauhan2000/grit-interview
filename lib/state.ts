import type { StudentStatus } from "@prisma/client";

// Business rules (write-up mein bhi yahi likhna)
export const RULES = {
    SLOT_MINUTES: 30,
    CANCEL_BEFORE_HOURS: 24,   // isse kam time bacha ho to cancel/reschedule nahi
    RETAKE_COOLDOWN_DAYS: 14,  // retake / fail ke baad dobara book karne se pehle wait
    MAX_ATTEMPTS: 3,
};

// Kaun si state se kahan ja sakte hain
export const TRANSITIONS: Record<StudentStatus, StudentStatus[]> = {
    NOT_ELIGIBLE: ["ELIGIBLE"],
    ELIGIBLE: ["BOOKED", "NOT_ELIGIBLE"],            // NOT_ELIGIBLE = contest result revoke
    BOOKED: ["ELIGIBLE", "AWAITING_RESULT", "NOT_ELIGIBLE"], // ELIGIBLE = cancel / no-show
    AWAITING_RESULT: ["PASSED", "FAILED", "RETAKE_LATER"],
    PASSED: ["BADGE_NULLIFIED"],                     // malpractice baad mein mila
    FAILED: ["ELIGIBLE"],                            // cooldown ke baad
    RETAKE_LATER: ["ELIGIBLE"],                      // cooldown ke baad
    BADGE_NULLIFIED: [],                             // final
};

export function canMove(from: StudentStatus, to: StudentStatus) {
    return TRANSITIONS[from].includes(to);
}

export function assertMove(from: StudentStatus, to: StudentStatus) {
    if (!canMove(from, to)) throw new Error(`Invalid move: ${from} -> ${to}`);
}

// UI labels + colours
export const STATUS_UI: Record<StudentStatus, { label: string; color: string }> = {
    NOT_ELIGIBLE: { label: "Not eligible yet", color: "bg-gray-100 text-gray-700" },
    ELIGIBLE: { label: "Ready to book", color: "bg-blue-100 text-blue-700" },
    BOOKED: { label: "Interview booked", color: "bg-indigo-100 text-indigo-700" },
    AWAITING_RESULT: { label: "Result pending", color: "bg-amber-100 text-amber-700" },
    PASSED: { label: "Passed", color: "bg-green-100 text-green-700" },
    FAILED: { label: "Not cleared", color: "bg-red-100 text-red-700" },
    RETAKE_LATER: { label: "Retake later", color: "bg-orange-100 text-orange-700" },
    BADGE_NULLIFIED: { label: "Badge nullified", color: "bg-rose-100 text-rose-700" },
};