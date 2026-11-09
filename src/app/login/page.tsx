import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07090e] px-4 pt-20 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d121d] p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-3xl text-indigo-200">
          ◈
        </div>
        <h1 className="mt-5 text-2xl font-black">Sign in to AnimeTeal</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Use your Discord account to join discussions and keep your AnimeTeal account across devices.
        </p>
        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-left text-xs text-rose-200">
            {error}
          </p>
        )}
        <a
          href="/api/auth/discord/start"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#4752C4]"
        >
          Continue with Discord
        </a>
        <Link href="/" className="mt-5 inline-block text-xs text-slate-500 hover:text-slate-300">
          Continue browsing without an account
        </Link>
      </div>
    </main>
  );
}
