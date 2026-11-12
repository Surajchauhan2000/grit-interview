"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const roles = [
    { href: "/student", label: "Student" },
    { href: "/interviewer", label: "Interviewer" },
    { href: "/admin", label: "Admin" },
    { href: "/demo", label: "Before / After" },
];

export default function Nav() {
    const path = usePathname();
    return (
        <header className="border-b bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                <span className="font-bold text-indigo-600">GRIT Interviews</span>
                <nav className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
                    {roles.map((r) => (
                        <Link
                            key={r.href}
                            href={r.href}
                            className={`rounded-md px-3 py-1.5 ${
                                path.startsWith(r.href) ? "bg-white font-medium shadow" : "text-gray-600"
                            }`}
                        >
                            {r.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
}