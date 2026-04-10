"use client";

import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useVesselStore } from "@/store/vessel.store";
import type { CrewUser } from "@/types/crew_user";
import CrewToolbar from "./CrewToolbar";
import CrewTable from "./CrewTable";
import SuspensionSetupModal from "./SuspensionSetupModal";

type ActionType = "RESET_PW" | "RESET_DATA" | "CHECK_PW" | "DELETE";

export default function CrewComponentCard() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const vpnIp = selectedVessel?.vpnIp || "";

  const [crew, setCrew] = useState<CrewUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suspensionModal, setSuspensionModal] = useState<{ open: boolean; username: string }>({
    open: false,
    username: "",
  });

  const fetchCrewData = async () => {
    if (!vpnIp) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpnIp }),
      });
      const result = await response.json();
      const crewList = Array.isArray(result.data) ? result.data : [];
      const processedData: CrewUser[] = crewList
        .filter((u: any) => u.varusersusername !== "synersat")
        .map((u: any) => ({
          ...u,
          description: u.description || "-",
          duty: u.duty || "-",
          varusersterminaltype: u.varusersterminaltype || "Auto",
          varusersusage: u.varusersusage || "0",
          varusershalftimeperiod: u.varusershalftimeperiod || "",
        }))
        .sort((a: CrewUser, b: CrewUser) => {
          const aIsSpecial = a.varusersusername.startsWith("startlinkuser");
          const bIsSpecial = b.varusersusername.startsWith("startlinkuser");
          if (aIsSpecial && !bIsSpecial) return -1;
          if (!aIsSpecial && bIsSpecial) return 1;
          return a.varusersusername.localeCompare(b.varusersusername);
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
    if (vpnIp) fetchCrewData();
    else { setCrew([]); setFetchError(null); }
    setSelected(new Set());
  }, [vpnIp]);

  const allIds = useMemo(() => crew.map((u) => u.varusersusername), [crew]);
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
    const selectedUsers = crew.filter((u) => selected.has(u.varusersusername));
    if (action === "CHECK_PW") {
      const lines =
        selectedUsers.length === 0
          ? ["No users selected"]
          : selectedUsers.map((u) => `${u.varusersusername} → PW: ${u.varuserspassword}`);
      alert(lines.join("\n"));
      return;
    }
    if (confirm(`${action} action for ${selected.size} users. Are you sure?`)) {
      console.log(`Executing ${action} for:`, selectedUsers.map((u) => u.varusersusername));
      alert(`${action} has been requested.`);
    }
  };

  const handleExportCSV = () => {
    if (crew.length === 0) return;
    const headers = ["ID", "Description", "Duty", "Type", "Update Period", "Usage Limit (MB)"];
    const rows = crew.map((u) => [
      u.varusersusername,
      u.description,
      u.duty,
      u.varusersterminaltype,
      u.varusershalftimeperiod === "half"
        ? `Half-${u.varusersmaxtotaloctetstimerange}`
        : u.varusersmaxtotaloctetstimerange,
      u.varusersmaxtotaloctets,
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
        />
        <CrewTable
          crew={crew}
          isLoading={isLoading}
          hasVessel={!!vpnIp}
          fetchError={fetchError}
          selected={selected}
          allSelected={allSelected}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          onOpenSuspension={(username) => setSuspensionModal({ open: true, username })}
        />
      </div>

      <SuspensionSetupModal
        isOpen={suspensionModal.open}
        onClose={() => setSuspensionModal({ open: false, username: "" })}
        username={suspensionModal.username}
      />
    </div>
  );
}
