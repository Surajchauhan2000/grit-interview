import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = { title: "GRIT Interviews" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
      <Nav />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
      </html>
  );
}