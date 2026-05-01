import Link from "next/link";

export default function CuttingPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-4xl space-y-4 rounded-xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Cutting Module</h1>
        <p className="text-sm text-muted-foreground">
          Use submenu pages to manage available and completed cutting flows.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cutting/available"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Open Available Cutting
          </Link>
          <Link
            href="/cutting/complete"
            className="rounded-md border px-4 py-2 text-sm"
          >
            Open Complete Cutting
          </Link>
        </div>
      </section>
    </main>
  );
}
