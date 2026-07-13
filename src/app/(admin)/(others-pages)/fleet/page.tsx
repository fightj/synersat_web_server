import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fleet | Synersat",
};

export default function FleetPage() {
  return (
    <div className="min-h-screen rounded-2xl border border-gray-200 bg-(--color-surface-1) px-5 py-7 dark:border-gray-800 xl:px-10 xl:py-12">
      <div className="mx-auto w-full max-w-[630px] text-center">
        <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
          Fleet
        </h3>
      </div>
    </div>
  );
}
