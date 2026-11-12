import type { StudentStatus } from "@prisma/client";

export type View = {
    name: string; track: string; status: StudentStatus;
    slotAt?: string; interviewer?: string; cancelBy?: string;
    hoursLeft?: number; retakeFrom?: string; attemptsLeft: number; notes?: string | null;
};
export type Msg = { tone: "info" | "success" | "warn" | "danger"; title: string; body: string };

export function messageFor(v: View): Msg | null {
    const n = v.name.split(" ")[0];
    switch (v.status) {
        case "NOT_ELIGIBLE":
            return { tone: "info", title: "Your interview unlocks soon",
                body: `Clear all the skill contests for the ${v.track} track and your interview will unlock here automatically.` };
        case "ELIGIBLE":
            return { tone: "info", title: `You're eligible, ${n}!`,
                body: `You've cleared every skill for the ${v.track} track. Pick a time below to book your interview.` };
        case "BOOKED":
            // MESSAGE 2: Reminder (24 ghante ke andar)
            if (v.hoursLeft !== undefined && v.hoursLeft <= 24)
                return { tone: "warn", title: "Your interview is coming up",
                    body: `${n}, your ${v.track} interview is at ${v.slotAt} with ${v.interviewer}. Join 5 minutes early, keep your camera on and your college ID ready. Cancellation is now closed, so if something urgent has come up, please contact the interview team right away.` };
            // MESSAGE 1: Booking confirmed
            return { tone: "success", title: "Your interview is booked ✅",
                body: `You're all set, ${n}. Your ${v.track} interview is on ${v.slotAt} with ${v.interviewer}. You can cancel for free until ${v.cancelBy}. We'll remind you 24 hours before.` };
        // MESSAGE 3: Result (4 variants)
        case "PASSED":
            return { tone: "success", title: `Congratulations, ${n}! You passed 🎉`,
                body: `You cleared the ${v.track} interview and your ${v.track} Track Badge is now on your profile. Please keep following the GRIT rules, because a badge can be removed if malpractice is found later.` };
        case "FAILED":
            return { tone: "danger", title: "You didn't clear it this time",
                body: `Thank you for giving it your best, ${n}. You can book your next attempt from ${v.retakeFrom}. Use the time to revisit the feedback below. Attempts left: ${v.attemptsLeft}.` };
        case "RETAKE_LATER":
            return { tone: "warn", title: "Almost there, one more round",
                body: `${n}, the interviewer would like to meet you once more before awarding the ${v.track} badge. You can book your retake from ${v.retakeFrom}. Your contest progress is safe. Attempts left: ${v.attemptsLeft}.` };
        case "BADGE_NULLIFIED":
            return { tone: "danger", title: "Your badge has been nullified",
                body: `Your ${v.track} Track Badge was removed after a malpractice review. If you think this is a mistake, please contact the interview team.` };
        default:
            return null;
    }
}