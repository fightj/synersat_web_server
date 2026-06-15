"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useVesselStore } from "@/store/vessel.store";
import { useCommandEventStore, CREW_COMMAND_TYPES } from "@/store/command-event.store";
import type { CrewEntry } from "@/types/crew_account";
import { getCrewData, deleteCrewData } from "@/api/crew-account";
import DeleteConfirmAlert from "@/components/common/DeleteConfirmAlert";
import CrewToolbar from "./CrewToolbar";
import CrewTable from "./CrewTable";
import SuspensionSetupModal from "./SuspensionSetupModal";
import AddCrewModal from "./AddCrewModal";
import ModifyCrewModal from "./ModifyCrewModal";
import CheckPwModal from "./CheckPwModal";
import CheckUsageModal from "./CheckUsageModal";
import TopUpModal from "./TopUpModal";
import UsageHistoryModal from "./UsageHistoryModal";
import RefreshBanner from "@/components/common/RefreshBanner";

type ActionType = "RESET_PW" | "RESET_DATA" | "CHECK_PW" | "DELETE" | "CHECK_USAGE";

interface CrewComponentCardProps {
  mode?: string;
  imo?: number;
}

export default function CrewComponentCard({ mode: modeProp, imo: imoProp }: CrewComponentCardProps = {}) {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const imo = imoProp ?? selectedVessel?.imo ?? null;
  const fetchIdRef = useRef(0);
  const searchParams = useSearchParams();
  const searchParamsMode = searchParams.get("mode") ?? "normal";
  const mode = modeProp ?? searchParamsMode;
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
  const [checkUsageOpen, setCheckUsageOpen] = useState(false);
  const [usageHistoryTarget, setUsageHistoryTarget] = useState<CrewEntry | null>(null);
  const [refreshBanner, setRefreshBanner] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const processRaw = useCallback((result: any): CrewEntry[] => {
    const rawList: any[] = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
    const mapped: (CrewEntry | null)[] = rawList.map((row: any) => {
      const u = row.updateType === "CREATE" ? row.next : row.current;
      if (!u) return null;
      return {
        userId: u.userName,
        password: u.password ?? "",
        description: u.description ?? null,
        terminalType: u.terminalType ?? null,
        halfTimePeriod: u.halfTimePeriod ?? null,
        maxTotalOctets: u.maxTotalOctets,
        maxTotalOctetsTimeRange: u.maxTotalOctetsTimeRange,
        currentOctetUsage: u.currentOctetUsage,
        updateType: row.updateType ?? null,
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

  const fetchCrewData = useCallback(async (preserveOnError = false) => {
    if (!imo) return;
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setFetchError(null);
    try {
      const result = await getCrewData(imo);
      if (fetchId !== fetchIdRef.current) return;
      setCrew(processRaw(result));
    } catch (error) {
      if (fetchId !== fetchIdRef.current) return;
      console.error("Crew Fetch Error:", error);
      if (!preserveOnError) {
        setFetchError("The vessel network is unstable. Please try again later.");
      }
    } finally {
      if (fetchId === fetchIdRef.current) setIsLoading(false);
    }
  }, [imo, processRaw]);

  // 로딩 없이 조용히 데이터 갱신
  const silentRefetch = useCallback(async () => {
    if (!imo) return;
    const fetchId = ++fetchIdRef.current;
    try {
      const result = await getCrewData(imo);
      if (fetchId !== fetchIdRef.current) return;
      setCrew(processRaw(result));
      setRefreshBanner(true);
    } catch (error) {
      if (fetchId !== fetchIdRef.current) return;
      console.error("Crew Silent Refetch Error:", error);
    }
  }, [imo, processRaw]);

  useEffect(() => {
    setCrew([]);
    setFetchError(null);
    setSelected(new Set());
    if (imo) {
      setIsLoading(true);
      fetchCrewData();
    }
  }, [imo, fetchCrewData]);

  // SSE 이벤트 감지 → 자동 갱신
  useEffect(() => {
    if (!lastEvent) return;
    if (!CREW_COMMAND_TYPES.includes(lastEvent.commandType)) return;
    if (Number(lastEvent.imo) !== Number(imo)) return;
    if (searchParams.get("tab") !== "crew") return;

    silentRefetch();
    clearLastEvent();
  }, [lastEvent, imo, searchParams, silentRefetch, clearLastEvent]);

  const filteredCrew = useMemo(
    () =>
      (mode === "prepay"
        ? crew.filter((u) => u.userId.startsWith("crewpay-"))
        : crew.filter((u) => !u.userId.startsWith("crewpay-"))
      ).filter((u) => u.userId !== "synersat"),
    [crew, mode],
  );

  // 탭 전환 시 선택 초기화
  useEffect(() => { setSelected(new Set()); }, [mode]);

  const allIds = useMemo(() => filteredCrew.filter((u) => u.updateType == null).map((u) => u.userId), [filteredCrew]);
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
    const selectedUsers = filteredCrew.filter((u) => selected.has(u.userId));
    if (action === "CHECK_PW") {
      setCheckPwEntries(selectedUsers.map((u) => ({ username: u.userId, password: u.password })));
      setCheckPwOpen(true);
      return;
    }
    if (action === "CHECK_USAGE") {
      setCheckUsageOpen(true);
      return;
    }
    if (action === "DELETE") {
      setIsDeleteAlertOpen(true);
      return;
    }
    if (confirm(`${action} action for ${selected.size} users. Are you sure?`)) {
      console.log(`Executing ${action} for:`, selectedUsers.map((u) => u.userId));
      alert(`${action} has been requested.`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!imo) return;
    setIsDeleteAlertOpen(false);
    try {
      await deleteCrewData(imo, Array.from(selected));
      setSelected(new Set());
      await fetchCrewData(true);
    } catch (error) {
      console.error("Error deleting crew:", error);
    }
  };

  const handleExportCSV = () => {
    if (filteredCrew.length === 0) return;
    const headers = ["ID", "Description", "Type", "Update Period", "Usage (MB)"];
    const rows = filteredCrew.map((u) => [
      u.userId,
      u.description ?? "",
      u.terminalType || "Auto",
      u.halfTimePeriod === "half"
        ? `Half-${u.maxTotalOctetsTimeRange}`
        : u.maxTotalOctetsTimeRange,
      `${u.currentOctetUsage ?? "0"} / ${u.maxTotalOctets ?? "0"}`,
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

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/3">
        <CrewToolbar
          vesselName={selectedVessel?.name}
          noneSelected={noneSelected}
          isLoading={isLoading}
          isError={!!fetchError}
          crewCount={filteredCrew.length}
          mode={mode}
          onAction={onAction}
          onExportCSV={handleExportCSV}
          onAddVoucher={() => setAddCrewOpen(true)}
          onModifyVoucher={() => setModifyCrewOpen(true)}
        />
        <div className="overflow-x-auto">
          <CrewTable
            crew={filteredCrew}
            isLoading={isLoading}
            hasVessel={!!imo}
            fetchError={fetchError}
            selected={selected}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
            onOpenSuspension={(userId) => setSuspensionModal({ open: true, userId })}
            onOpenTopUp={(u) => setTopUpTarget(u)}
            onOpenUsageHistory={(u) => setUsageHistoryTarget(u)}
            onRetry={() => fetchCrewData()}
            formatUserId={mode === "prepay" ? (id) => id.replace(/^crewpay-/, "") : undefined}
          />
        </div>
      </div>

      {imo && topUpTarget && (
        <TopUpModal
          isOpen={!!topUpTarget}
          onClose={() => setTopUpTarget(null)}
          onSaved={() => { setTopUpTarget(null); fetchCrewData(true); }}
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

      {imo && (
        <CheckUsageModal
          isOpen={checkUsageOpen}
          onClose={() => setCheckUsageOpen(false)}
          selectedCrew={filteredCrew.filter((u) => selected.has(u.userId))}
          imo={imo}
          vesselName={selectedVessel?.name ?? "vessel"}
        />
      )}

      {imo && (
        <UsageHistoryModal
          isOpen={!!usageHistoryTarget}
          onClose={() => setUsageHistoryTarget(null)}
          crew={usageHistoryTarget}
          imo={imo}
        />
      )}

      <DeleteConfirmAlert
        isOpen={isDeleteAlertOpen}
        onCancel={() => setIsDeleteAlertOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Crew"
        message={`Are you sure you want to delete ${selected.size} crew member${selected.size > 1 ? "s" : ""}? This action cannot be undone.`}
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
          onSaved={() => { setModifyCrewOpen(false); fetchCrewData(true); }}
          selectedCrew={filteredCrew.filter((u) => selected.has(u.userId))}
          imo={imo}
        />
      )}

      {imo && (
        <AddCrewModal
          isOpen={addCrewOpen}
          onClose={() => setAddCrewOpen(false)}
          onSaved={() => { setAddCrewOpen(false); fetchCrewData(true); }}
          imo={imo}
          defaultPrepay={mode === "prepay"}
        />
      )}
    </div>
  );
}
