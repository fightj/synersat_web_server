"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useVesselStore } from "@/store/vessel.store";
import { useCommandEventStore, CREW_COMMAND_TYPES } from "@/store/command-event.store";
import type { CrewEntry } from "@/types/crew_account";
import { getCrewData } from "@/api/crew-account";
import CrewToolbar from "./CrewToolbar";
import CrewTable from "./CrewTable";
import SuspensionSetupModal from "./SuspensionSetupModal";
import AddCrewModal from "./AddCrewModal";
import ModifyCrewModal from "./ModifyCrewModal";
import CheckPwModal from "./CheckPwModal";
import TopUpModal from "./TopUpModal";
import RefreshBanner from "@/components/common/RefreshBanner";

type ActionType = "RESET_PW" | "RESET_DATA" | "CHECK_PW" | "DELETE";

export default function CrewComponentCard() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const imo = selectedVessel?.imo ?? null;
  const pathname = usePathname();
  const lastEvent = useCommandEventStore((s) => s.lastEvent);
  const clearLastEvent = useCommandEventStore((s) => s.clearLastEvent);

  const [crew, setCrew] = useState<CrewEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suspensionModal, setSuspensionModal] = useState<{ open: boolean; userId: string }>({
    open: false,
    userId: "",
  });
  const [addCrewOpen, setAddCrewOpen] = useState(false);
  const [modifyCrewOpen, setModifyCrewOpen] = useState(false);
  const [checkPwOpen, setCheckPwOpen] = useState(false);
  const [checkPwEntries, setCheckPwEntries] = useState<{ username: string; password: string | undefined }[]>([]);
  const [topUpTarget, setTopUpTarget] = useState<CrewEntry | null>(null);
  const [refreshBanner, setRefreshBanner] = useState(false);

  const processRaw = useCallback((result: any): CrewEntry[] => {
    const rawList: any[] = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
    const mapped: (CrewEntry | null)[] = rawList.map((row: any) => {
      const u = row.updateType === "CREATE" ? row.next : row.current;
      if (!u) return null;
      return {
        userId:                  u.userName,
        password:                u.password ?? "",
        description:             u.description ?? null,
        terminalType:            u.terminalType ?? null,
        halfTimePeriod:          u.halfTimePeriod ?? null,
        maxTotalOctets:          u.maxTotalOctets,
        maxTotalOctetsTimeRange: u.maxTotalOctetsTimeRange,
        currentOctetUsage:       u.currentOctetUsage,
        updateType:              row.updateType ?? null,
      };
    });
    return (mapped.filter(Boolean) as CrewEntry[]).sort((a, b) => {
      const aS = a.userId.startsWith("startlinkuser");
      const bS = b.userId.startsWith("startlinkuser");
      if (aS && !bS) return -1;
      if (!aS && bS) return 1;
      return a.userId.localeCompare(b.userId);
    });
  }, []);

  const fetchCrewData = useCallback(async () => {
    if (!imo) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const result = await getCrewData(imo);
      setCrew(processRaw(result));
    } catch (error) {
      console.error("Crew Fetch Error:", error);
      setFetchError("The vessel network is unstable. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [imo, processRaw]);

  // 로딩 없이 조용히 데이터 갱신
  const silentRefetch = useCallback(async () => {
    if (!imo) return;
    try {
      const result = await getCrewData(imo);
      setCrew(processRaw(result));
      setRefreshBanner(true);
    } catch (error) {
      console.error("Crew Silent Refetch Error:", error);
    }
  }, [imo, processRaw]);

  useEffect(() => {
    if (imo) fetchCrewData();
    else { setCrew([]); setFetchError(null); }
    setSelected(new Set());
  }, [imo]);

  // SSE 이벤트 감지 → 자동 갱신
  useEffect(() => {
    if (!lastEvent) return;
    if (!CREW_COMMAND_TYPES.includes(lastEvent.commandType)) return;
    if (Number(lastEvent.imo) !== Number(imo)) return;
    if (!pathname.startsWith("/crew_account")) return;

    silentRefetch();
    clearLastEvent();
  }, [lastEvent, imo, pathname, silentRefetch, clearLastEvent]);

  const allIds = useMemo(() => crew.filter((u) => u.updateType == null).map((u) => u.userId), [crew]);
  const allSelected = allIds.length > 0 && selected.size === allIds.length;
  const noneSelected = selected.size === 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onAction = async (action: ActionType) => {
    const selectedUsers = crew.filter((u) => selected.has(u.userId));
    if (action === "CHECK_PW") {
      setCheckPwEntries(selectedUsers.map((u) => ({ username: u.userId, password: u.password })));
      setCheckPwOpen(true);
      return;
    }
    if (confirm(`${action} action for ${selected.size} users. Are you sure?`)) {
      console.log(`Executing ${action} for:`, selectedUsers.map((u) => u.userId));
      alert(`${action} has been requested.`);
    }
  };

  const handleExportCSV = () => {
    if (crew.length === 0) return;
    const headers = ["ID", "Description", "Type", "Update Period", "Usage Limit (MB)"];
    const rows = crew.map((u) => [
      u.userId,
      u.description ?? "",
      u.terminalType ?? "",
      u.halfTimePeriod === "half"
        ? `Half-${u.maxTotalOctetsTimeRange}`
        : u.maxTotalOctetsTimeRange,
      u.maxTotalOctets,
    ]);
    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `crew_accounts_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <RefreshBanner visible={refreshBanner} onClose={() => setRefreshBanner(false)} />

      <PageBreadcrumb pageTitle="Manage Crew Account" />

      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/3">
        <CrewToolbar
          vesselName={selectedVessel?.name}
          noneSelected={noneSelected}
          isLoading={isLoading}
          crewCount={crew.length}
          onAction={onAction}
          onExportCSV={handleExportCSV}
          onAddVoucher={() => setAddCrewOpen(true)}
          onModifyVoucher={() => setModifyCrewOpen(true)}
        />
        <CrewTable
          crew={crew}
          isLoading={isLoading}
          hasVessel={!!imo}
          fetchError={fetchError}
          selected={selected}
          allSelected={allSelected}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          onOpenSuspension={(userId) => setSuspensionModal({ open: true, userId })}
          onOpenTopUp={(u) => setTopUpTarget(u)}
          onRetry={fetchCrewData}
        />
      </div>

      {imo && topUpTarget && (
        <TopUpModal
          isOpen={!!topUpTarget}
          onClose={() => setTopUpTarget(null)}
          onSaved={() => { setTopUpTarget(null); fetchCrewData(); }}
          imo={imo}
          username={topUpTarget.userId}
          currentMaxOctets={topUpTarget.maxTotalOctets}
          currentOctetUsage={topUpTarget.currentOctetUsage}
        />
      )}

      <CheckPwModal
        isOpen={checkPwOpen}
        onClose={() => setCheckPwOpen(false)}
        entries={checkPwEntries}
      />

      <SuspensionSetupModal
        isOpen={suspensionModal.open}
        onClose={() => setSuspensionModal({ open: false, userId: "" })}
        username={suspensionModal.userId}
      />

      {imo && (
        <ModifyCrewModal
          isOpen={modifyCrewOpen}
          onClose={() => setModifyCrewOpen(false)}
          onSaved={() => { setModifyCrewOpen(false); fetchCrewData(); }}
          selectedCrew={crew.filter((u) => selected.has(u.userId))}
          imo={imo}
        />
      )}

      {imo && (
        <AddCrewModal
          isOpen={addCrewOpen}
          onClose={() => setAddCrewOpen(false)}
          onSaved={() => { setAddCrewOpen(false); fetchCrewData(); }}
          imo={imo}
        />
      )}
    </div>
  );
}
