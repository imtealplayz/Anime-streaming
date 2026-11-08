import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Play,
  ShieldAlert,
  Smartphone,
  Subtitles,
} from "lucide-react";
import Container from "@/components/container";

export const metadata: Metadata = {
  title: "Download AnimeTeal for Android",
  description: "Download the AnimeTeal Android app and learn how to install it safely.",
};

const APK_DOWNLOAD_URL =
  "https://github.com/imtealplayz/Anime-streaming/releases/download/android-latest/AnimeTeal.apk";

const DownloadPage = () => (
  <main className="min-h-screen bg-[#07090e] pb-20 pt-28 text-white sm:pt-32">
    <Container>
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-teal-200"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Back to AnimeTeal
        </Link>

        <section className="mt-7 overflow-hidden rounded-3xl border border-teal-300/15 bg-gradient-to-br from-teal-300/[0.10] via-[#0b141b] to-[#090d14] p-6 shadow-2xl shadow-black/20 sm:p-10">
          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_260px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-100">
                <Smartphone className="h-3.5 w-3.5" />
                Android app
              </div>
              <h1 className="mt-5 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
                AnimeTeal,
                <span className="block bg-gradient-to-r from-teal-200 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
                  made for Android.
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                A dedicated Android experience with its own built-in video player,
                playback controls, and subtitle options. Episodes play inside the app,
                without sending you to the website.
              </p>
              <div className="mt-7">
                <a
                  href={APK_DOWNLOAD_URL}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-teal-300 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-teal-950/30 transition hover:-translate-y-0.5 hover:bg-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 min-[430px]:w-auto"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Download AnimeTeal (.apk)
                </a>
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Android APK · Release-signed · Direct download
                </p>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[230px] flex-col items-center rounded-3xl border border-white/10 bg-slate-950/55 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-teal-200/20 bg-teal-300/10 shadow-lg shadow-teal-950/40">
                <Smartphone className="h-14 w-14 text-teal-100" strokeWidth={1.4} />
              </div>
              <p className="mt-5 text-lg font-extrabold">AnimeTeal</p>
              <p className="mt-1 text-xs text-slate-400">Android app</p>
              <span className="mt-4 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Not Play Store verified
              </span>
            </div>
          </div>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <Feature icon={<Play className="h-5 w-5" />} title="Built-in player">
            Plays supported provider streams inside the Android app.
          </Feature>
          <Feature icon={<Gauge className="h-5 w-5" />} title="Playback controls">
            Double-tap seeking, adjustable speed, volume, and quality controls.
          </Feature>
          <Feature icon={<Subtitles className="h-5 w-5" />} title="Subtitle options">
            Subtitle and audio-track choices when the selected source provides them.
          </Feature>
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
          <h2 className="text-lg font-bold text-white">Install the app</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            <Step number="01" title="Download">
              Tap the button above to download the AnimeTeal APK file.
            </Step>
            <Step number="02" title="Open the APK">
              Open the downloaded AnimeTeal.apk file from your Downloads folder.
            </Step>
            <Step number="03" title="Install">
              Follow Android&apos;s installer prompts. Android may ask which app is allowed to install APK files.
            </Step>
          </ol>
        </section>

        <section className="mt-7 rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-200" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                Important security information
              </p>
              <h2 className="mt-2 text-xl font-extrabold text-white">
                This APK is not verified by Google Play.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                AnimeTeal is distributed directly as an APK, not through the Google
                Play Store. It has not completed Google Play certification or an
                independent third-party security audit. Android or Play Protect may
                therefore show an unknown-app or can&apos;t-verify warning when you install
                it. That kind of warning is not, by itself, proof that the app contains
                malware.
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                We cannot guarantee that every security warning is harmless. If Play
                Protect specifically identifies a harmful threat, the installer shows
                unexpected permissions, or the APK did not come from this download
                page, cancel the installation and do not try to bypass the warning.
              </p>
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" />
                <p className="text-xs leading-5 text-slate-300">
                  This is a release-signed APK distributed directly by AnimeTeal outside Google Play.
                  It has not been independently security-audited. APK signing helps verify
                  that updates come from the same publisher key; it is not a malware scan.
                </p>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-xs leading-6 text-slate-500">
          Need help? Return to the{" "}
          <Link href="/" className="font-semibold text-teal-200 hover:text-teal-100">
            AnimeTeal website
          </Link>.
        </p>
      </div>
    </Container>
  </main>
);

const Feature = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-200/15 bg-teal-300/10 text-teal-100">
      {icon}
    </div>
    <h3 className="mt-4 font-bold text-white">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate-400">{children}</p>
  </div>
);

const Step = ({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) => (
  <li className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
    <p className="text-xs font-extrabold tracking-widest text-teal-200">{number}</p>
    <h3 className="mt-2 text-sm font-bold text-white">{title}</h3>
    <p className="mt-2 text-xs leading-5 text-slate-400">{children}</p>
  </li>
);

export default DownloadPage;
