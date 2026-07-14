"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import Image from "next/image";
import RecentVesselTabs from "./RecentVesselTabs";
import { Terminal } from "lucide-react";
import type { VesselDetail } from "@/types/vessel";
import {
  getVesselDetail,
  deleteVessel,
  antennaUpdate,
  vesselSmartboxUpdate,
  resetCore,
  patchBetaVersion,
} from "@/api/vessel";
import { updatePrepayEnabled } from "@/api/crew-account";
import { getAuth } from "@/api/auth";
import { useRouter } from "next/navigation";
import { useVesselStore } from "@/store/vessel.store";
import { useRecentVesselsStore } from "@/store/recent-vessels.store";
import { SktelinkIcon, GrafanaDashIcon } from "@/icons";
import { getServiceBadgeStyles } from "../common/AnntennaMapping";
import VesselFormModal from "./VesselFormModal";
import VesselDeleteAlert from "./VesselDeleteAlert";
import GrafanaDashModal from "./GrafanaDashModal";
import ErrorAlertModal from "../ui/ErrorAlertModal";
import ConfirmModal from "../ui/ConfirmModal";
import Button from "../ui/button/Button";

export type MainTab = "detail" | "crew" | "firewall" | "manage";

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: "detail", label: "Detail" },
  { id: "crew", label: "Crew Account" },
  { id: "firewall", label: "Firewall" },
  { id: "manage", label: "Manage" },
];

interface VesselPageHeaderProps {
  vesselImo: string;
  mainTab: MainTab;
  onMainTabChange: (tab: MainTab) => void;
  onOpenTerminal?: (vpnIp: string, type: 'core' | 'firewall') => void;
  tabRightSlot?: React.ReactNode;
}

export default function VesselPageHeader({
  vesselImo,
  mainTab,
  onMainTabChange,
  onOpenTerminal,
  tabRightSlot,
}: VesselPageHeaderProps) {
  const [data, setData] = useState<VesselDetail | null>(null);
  const [isHeaderLoading, setIsHeaderLoading] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGrafana, setShowGrafana] = useState(false);
  // store의 prepaidEnabled를 초기값으로 사용 → SSE로 변경 시 즉시 반영
  const storePrepaid = useVesselStore((s) => s.selectedVessel?.prepaidEnabled ?? false);
  const [prepaidEnabled, setPrepaidEnabled] = useState(storePrepaid);
  const [prepaidLoading, setPrepaidLoading] = useState(false);

  // SSE로 store가 변경되면 로컬 상태 동기화 (토글 로딩 중엔 무시)
  useEffect(() => {
    if (!prepaidLoading) setPrepaidEnabled(storePrepaid);
  }, [storePrepaid, prepaidLoading]);
  const [betaVersionEnabled, setBetaVersionEnabled] = useState(false);
  const [betaVersionLoading, setBetaVersionLoading] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<"prepaid" | "beta" | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: "",
  });
  const router = useRouter();

  const updateVesselPrepaid = useVesselStore((s) => s.updateVesselPrepaid);

  const addRecent = useRecentVesselsStore((s) => s.addRecent);
  const setNotification = useRecentVesselsStore((s) => s.setNotification);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setData(null);
    setIsHeaderLoading(true);

    const load = async () => {
      try {
        const result = await getVesselDetail(vesselImo);
        if (signal.aborted) return;
        setData(result);
        setPrepaidEnabled(result.prepaidEnabled ?? false);
        setBetaVersionEnabled(result.betaVersionEnabled ?? false);
        addRecent({ imo: result.imo, name: result.name });
        setNotification(result.imo, false);
      } catch {
        // 헤더 로드 실패는 조용히 처리
      } finally {
        if (!signal.aborted) setIsHeaderLoading(false);
      }
    };
    if (vesselImo) load();

    return () => { abortRef.current?.abort(); };
  }, [vesselImo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteVessel = async () => {
    if (!data) return;
    try {
      setIsDeleting(true);
      if (await deleteVessel([data.imo])) {
        mutate("vesselsLite");
        setIsDeleteAlertOpen(false);
        router.push("/vessels");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrepaidToggle = () => {
    if (!data || prepaidLoading) return;
    if (!prepaidEnabled) { setPendingToggle("prepaid"); return; }
    executePrepaidToggle(false);
  };

  const executePrepaidToggle = async (next: boolean) => {
    setPrepaidEnabled(next);
    setPrepaidLoading(true);
    try {
      await updatePrepayEnabled(data!.imo, next);
      updateVesselPrepaid(data!.imo, next);
    } catch {
      setPrepaidEnabled(!next);
    } finally {
      setPrepaidLoading(false);
    }
  };

  const handleBetaVersion = () => {
    if (!data || betaVersionLoading) return;
    if (!betaVersionEnabled) { setPendingToggle("beta"); return; }
    executeBetaToggle(false);
  };

  const executeBetaToggle = async (next: boolean) => {
    setBetaVersionEnabled(next);
    setBetaVersionLoading(true);
    try { await patchBetaVersion(data!.imo, next); }
    catch { setBetaVersionEnabled(!next); }
    finally { setBetaVersionLoading(false); }
  };

  const handleConfirmToggle = () => {
    if (pendingToggle === "prepaid") executePrepaidToggle(true);
    if (pendingToggle === "beta") executeBetaToggle(true);
  };

  const handleOpenTerminal = async (type: 'core' | 'firewall') => {
    try {
      const result = await getAuth();
      if (!result) {
        setErrorModal({ isOpen: true, message: "Failed to retrieve authentication information." });
        return;
      }
      const ALLOWED_USERS = ["henry.jeong", "synersatadmin", "ronnie.yoon", "testUser", "charles.im", "justin.cho"];
      if (!ALLOWED_USERS.includes(result.userId)) {
        setErrorModal({ isOpen: true, message: "Access denied. You do not have permission to use the terminal." });
        return;
      }
      if (onOpenTerminal && data) {
        onOpenTerminal(data.vpn_ip, type);
      }
    } catch {
      setErrorModal({ isOpen: true, message: "The authentication request failed. Please try again." });
    }
  };

  const lastConnectedText = (() => {
    const raw = data?.status?.lastConnectedAt;
    if (!raw) return null;
    const date = new Date(raw.endsWith("Z") ? raw : raw + "Z");
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 0) return null;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  })();

  // 상태 뱃지 계산
  const statusBadge = (() => {
    if (!data) return null;
    const available = data.status?.available;
    const discard = data.status?.discard;
    const displayName = data.status?.antennaServiceDisplayName ?? null;
    const isInactive = !available && discard === true;
    const isOffline = !available && !isInactive;
    const label = isInactive ? "Inactive" : isOffline ? "Offline" : (displayName ?? "N/A");
    const cls = isInactive
      ? "bg-orange-100 text-orange-600 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20"
      : isOffline
        ? "bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
        : getServiceBadgeStyles(displayName);
    return (
      <span className={`rounded-full px-3 py-1 text-[12px] font-black tracking-wider uppercase ${cls}`}>
        {label}
      </span>
    );
  })();

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-(--color-surface-1) dark:border-white/5">
        {/* ── 최근 선박 탭 ── */}
        <Suspense fallback={null}>
          <RecentVesselTabs />
        </Suspense>
        {/* ── 상단 정보 행 ── */}
        <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 pb-4">
          {/* 왼쪽: 로고 + 선박명 + 상태 + 설명 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {isHeaderLoading ? (
                <div className="h-7 w-7 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
              ) : (
                <>
                  {data?.logo === "sktelink" && <SktelinkIcon className="h-6 w-auto" />}
                  {data?.logo === "synersat" && (
                    <>
                      <Image src="/images/logo/logo_black.png" alt="Synersat" width={28} height={28} className="h-[27px] w-auto dark:hidden" />
                      <Image src="/images/logo/logo_intro.png" alt="Synersat" width={28} height={28} className="hidden h-[27px] w-auto dark:block" />
                    </>
                  )}
                </>
              )}
              {isHeaderLoading ? (
                <div className="h-7 w-40 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
              ) : (
                <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                  {data?.name ?? "—"}
                </h2>
              )}
              {isHeaderLoading ? (
                <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
              ) : statusBadge}
              {isHeaderLoading ? (
                <div className="h-3.5 w-16 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
              ) : (lastConnectedText && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{lastConnectedText}</span>
              ))}
            </div>
            {data?.description && (
              <p className="text-sm text-gray-500">{data.description}</p>
            )}
          </div>

          {/* 오른쪽: 토글 + 그라파나 + 정보 확장 */}
          <div className="flex items-center gap-3">
            {/* Prepaid 토글 */}
            <button
              type="button"
              role="switch"
              aria-checked={prepaidEnabled}
              onClick={handlePrepaidToggle}
              disabled={prepaidLoading}
              className={`relative flex h-[26px] w-[82px] shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${prepaidEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                } ${prepaidLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${prepaidEnabled ? "translate-x-[58px]" : "translate-x-0.5"}`} />
              <span className={`w-full text-center text-[10px] font-bold tracking-wide text-white uppercase transition-all duration-300 ${prepaidEnabled ? "pr-5" : "pl-5"}`}>
                Prepaid
              </span>
            </button>

            {/* Beta 토글 */}
            <button
              type="button"
              role="switch"
              aria-checked={betaVersionEnabled}
              onClick={handleBetaVersion}
              disabled={betaVersionLoading}
              className={`relative flex h-[26px] w-[82px] shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${betaVersionEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                } ${betaVersionLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${betaVersionEnabled ? "translate-x-[58px]" : "translate-x-0.5"}`} />
              <span className={`w-full text-center text-[10px] font-bold tracking-wide text-white uppercase transition-all duration-300 ${betaVersionEnabled ? "pr-5" : "pl-5"}`}>
                Beta
              </span>
            </button>

            {/* Grafana */}
            <button
              onClick={() => setShowGrafana(true)}
              title="Grafana Dashboard"
              className="flex items-center justify-center transition-all hover:scale-110"
            >
              <GrafanaDashIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
            </button>

            {/* Vessel Info 확장 토글 */}
            <button
              onClick={() => setIsInfoExpanded((v) => !v)}
              title="Vessel Info"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500 dark:border-white/10 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-300 ${isInfoExpanded ? "rotate-180" : "rotate-0"}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Vessel Info 아코디언 ── */}
        <div className={`grid transition-all duration-300 ease-in-out ${isInfoExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden">
            <div className="mx-6 mt-1 border-t border-gray-100 pt-4 pb-4 dark:border-white/5">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                  Vessel Info
                </span>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition-all hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                >
                  Edit Info
                </button>
                <button
                  onClick={() => setIsDeleteAlertOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 transition-all hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
              {data && (
                <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-3">
                  <DetailItem label="Account" value={data.acct} />
                  <DetailItem label="IMO" value={data.imo} />
                  <DetailItem label="MMSI" value={data.mmsi} />
                  <DetailItem label="Call Sign" value={data.callsign} />
                  <DetailItem label="FW ID" value={data.fireWallId} />
                  <DetailItem label="S/N" value={data.serialNumber} />
                  <DetailItem label="VPN IP" value={data.vpn_ip} />
                  <DetailItem label="Mail" value={data.mailAddress} />
                  <DetailItem label="FW PW" value={data.fireWallPassword} />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2 mt-4">
                <Button size="xs" onClick={async () => { if (!data) return; await vesselSmartboxUpdate(data.imo); }}>
                  Run Update.sh
                </Button>
                <Button size="xs" onClick={async () => { if (!data) return; await antennaUpdate(data.imo); }}>
                  Mapping Update
                </Button>
                <Button size="xs" onClick={async () => { if (!data) return; await resetCore(data.imo); }}>
                  Reset Core
                </Button>
                {mainTab === "detail" && (
                  <>
                    <Button size="xs" onClick={() => handleOpenTerminal('core')}>
                      <Terminal size={16} />
                      Core
                    </Button>
                    <Button size="xs" onClick={() => handleOpenTerminal('firewall')}>
                      <Terminal size={16} />
                      Firewall
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 탭 바 ── */}
        <div className="flex flex-wrap items-center gap-y-1  px-2 py-1 ">
          <div className="flex shrink-0 items-center">
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onMainTabChange(tab.id)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors max-[368px]:px-2 max-[368px]:py-2 max-[368px]:text-xs ${mainTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {tabRightSlot && (
            <div className="ml-auto flex items-center gap-x-4 px-2 py-1 max-[983px]:w-full max-[983px]:flex-wrap max-[983px]:justify-end max-[983px]:gap-y-1">
              {tabRightSlot}
            </div>
          )}
        </div>
      </div>

      {/* ── 모달 / 얼럿 ── */}
      {data && isEditModalOpen && (
        <VesselFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mode="edit"
          vesselData={data}
        />
      )}
      {data && (
        <VesselDeleteAlert
          isOpen={isDeleteAlertOpen}
          isDeleting={isDeleting}
          targetVesselName={data.name}
          onClose={() => setIsDeleteAlertOpen(false)}
          onConfirm={handleDeleteVessel}
        />
      )}
      {data && showGrafana && (
        <GrafanaDashModal
          vessel={{
            id: data.id,
            name: data.name,
            callsign: data.callsign,
            imo: data.imo,
            mmsi: data.mmsi,
            vpnIp: data.vpn_ip,
            enabled: true,
            acct: data.acct,
            fireWallPassword: data.fireWallPassword,
            serialNumber: data.serialNumber,
          }}
          onClose={() => setShowGrafana(false)}
        />
      )}
      <ErrorAlertModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: "" })}
      />
      <ConfirmModal
        isOpen={pendingToggle === "prepaid"}
        onClose={() => setPendingToggle(null)}
        onConfirm={handleConfirmToggle}
        title="Apply Prepaid Option"
        message="Would you like to apply the prepaid option?"
        confirmLabel="Yes, Apply"
        cancelLabel="No"
        variant="default"
      />
      <ConfirmModal
        isOpen={pendingToggle === "beta"}
        onClose={() => setPendingToggle(null)}
        onConfirm={handleConfirmToggle}
        title="Apply Beta Version Update"
        message="Are you sure you want to apply the beta version update?"
        cautionText="Unintended updates may be applied. Please proceed only if you are certain."
        confirmLabel="Yes, Apply"
        cancelLabel="No"
        variant="warning"
      />
    </>
  );
}

const DetailItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex flex-col gap-0.5 border-b border-gray-100 pb-2 dark:border-white/5">
    <span className="text-[10px] font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
      {label}
    </span>
    <span className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
      {value || "-"}
    </span>
  </div>
);
