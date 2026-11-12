import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    await prisma.auditLog.deleteMany();
    await prisma.outcome.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.badge.deleteMany();
    await prisma.slot.deleteMany();
    await prisma.student.deleteMany();
    await prisma.interviewer.deleteMany();

    await prisma.student.createMany({
        data: [
            { name: "Aarav Sharma", email: "aarav@niat.in", track: "Full Stack", status: "ELIGIBLE" },
            { name: "Diya Patel", email: "diya@niat.in", track: "Full Stack", status: "ELIGIBLE" },
            { name: "Rohan Verma", email: "rohan@niat.in", track: "Data Science", status: "NOT_ELIGIBLE" },
            { name: "Sneha Rao", email: "sneha@niat.in", track: "Full Stack", status: "ELIGIBLE" },
        ],
    });

    const [i1, i2] = await Promise.all([
        prisma.interviewer.create({ data: { name: "Priya Nair", email: "priya@niat.in" } }),
        prisma.interviewer.create({ data: { name: "Karan Mehta", email: "karan@niat.in" } }),
    ]);

    // Next 3 days, 10:00-14:00, 30-min slots
    const slots = [];
    for (let d = 1; d <= 3; d++) {
        for (const iv of [i1, i2]) {
            for (let h = 10; h < 14; h++) {
                for (const m of [0, 30]) {
                    const s = new Date();
                    s.setDate(s.getDate() + d);
                    s.setHours(h, m, 0, 0);
                    slots.push({
                        interviewerId: iv.id,
                        startsAt: s,
                        endsAt: new Date(s.getTime() + 30 * 60000),
                    });
                }
            }
        }
    }
    await prisma.slot.createMany({ data: slots });
    console.log(`Seeded ${slots.length} slots`);
}

main().finally(() => prisma.$disconnect());