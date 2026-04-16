"use client";

import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useVesselStore } from "@/store/vessel.store";
import type { CrewEntry } from "@/types/crew_account";
import { getCrewData } from "@/api/crew-account";
import CrewToolbar from "./CrewToolbar";
import CrewTable from "./CrewTable";
import SuspensionSetupModal from "./SuspensionSetupModal";
import AddCrewModal from "./AddCrewModal";
import ModifyCrewModal from "./ModifyCrewModal";
import CheckPwModal from "./CheckPwModal";
import TopUpModal from "./TopUpModal";

type ActionType = "RESET_PW" | "RESET_DATA" | "CHECK_PW" | "DELETE";

export default function CrewComponentCard() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const imo = selectedVessel?.imo ?? null;

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

  const fetchCrewData = async () => {
    if (!imo) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const result = await getCrewData(imo);
      const rawList: any[] = Array.isArray(result) ? result : Array.isArray((result as any).data) ? (result as any).data : [];
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
      const processedData: CrewEntry[] = (mapped.filter(Boolean) as CrewEntry[]).sort((a, b) => {
        const aIsSpecial = a.userId.startsWith("startlinkuser");
        const bIsSpecial = b.userId.startsWith("startlinkuser");
        if (aIsSpecial && !bIsSpecial) return -1;
        if (!aIsSpecial && bIsSpecial) return 1;
        return a.userId.localeCompare(b.userId);
      });
      setCrew(processedData);
    } catch (error) {
      console.error("Crew Fetch Error:", error);
      setFetchError("The vessel network is unstable. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (imo) fetchCrewData();
    else { setCrew([]); setFetchError(null); }
    setSelected(new Set());
  }, [imo]);

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
