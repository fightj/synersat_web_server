"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useVesselStore } from "@/store/vessel.store";
import { useCommandEventStore, CREW_COMMAND_TYPES } from "@/store/command-event.store";
import type { CrewEntry } from "@/types/crew_account";
import { getCrewData, deleteCrewData, getRecentResetTime } from "@/api/crew-account";
import DeleteConfirmAlert from "@/components/common/DeleteConfirmAlert";
import CrewToolbar from "./CrewToolbar";
import CrewTable, { getBadgeProps } from "./CrewTable";
import SuspensionSetupModal from "./SuspensionSetupModal";
import AddCrewModal from "./AddCrewModal";
import ModifyCrewModal from "./ModifyCrewModal";
import CheckPwModal from "./CheckPwModal";
import CheckUsageModal from "./CheckUsageModal";
import TopUpModal from "./TopUpModal";
import UsageHistoryModal from "./UsageHistoryModal";
import RefreshBanner from "@/components/common/RefreshBanner";

type ActionType = "CHECK_PW" | "DELETE" | "CHECK_USAGE";

interface CrewComponentCardProps {
  mode?: string;
  imo?: number;
}

export default function CrewComponentCard({ mode: modeProp, imo: imoProp }: CrewComponentCardProps = {}) {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const imo = imoProp ?? selectedVessel?.imo ?? null;
  const fetchIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const sseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [resetMap, setResetMap] = useState<Record<string, string>>({});

  const processRaw = useCallback((result: any): CrewEntry[] => {
    const rawList: any[] = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
    const mapped: (CrewEntry | null)[] = rawList.map((row: any, idx: number) => {
      const u = row.updateType === "CREATE" ? row.next : row.current;
      if (!u) return null;
      return {
        // CREATE pending 항목은 userName이 null — 임시 식별자 부여
        userId: u.userName ?? `__pending_${idx}`,
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

  // silent: 스피너 없이 조용히 갱신 (SSE 등) / preserveOnError: 실패해도 기존 목록 유지
  const fetchCrewData = useCallback(async (
    opts?: { silent?: boolean; preserveOnError?: boolean },
  ) => {
    if (!imo) return;
    const { silent = false, preserveOnError = false } = opts ?? {};

    // 진행 중이던 이전 요청은 취소 — 느린 선박 회선에서 불필요한 왕복 제거
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchId = ++fetchIdRef.current;
    if (!silent) {
      setIsLoading(true);
      setFetchError(null);
    }
    try {
      const result = await getCrewData(imo, controller.signal);
      if (fetchId !== fetchIdRef.current) return;
      setCrew(processRaw(result));
      if (silent) setRefreshBanner(true);
    } catch (error) {
      // 새 요청·언마운트로 취소된 경우는 정상 동작이므로 로깅/에러표시 없이 종료
      if ((error as Error)?.name === "AbortError") return;
      // 뒤늦게 도착한(=이미 대체된) 응답은 무시
      if (fetchId !== fetchIdRef.current) return;
      console.error("Crew Fetch Error:", error);
      if (!silent && !preserveOnError) {
        setFetchError("The vessel network is unstable. Please try again later.");
      }
    } finally {
      // silent 여부와 무관하게 "최신 요청"이 로딩 상태를 책임지고 해제
      if (fetchId === fetchIdRef.current) setIsLoading(false);
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

    clearLastEvent();
    // 짧은 간격으로 여러 이벤트가 와도 갱신은 한 번만
    if (sseTimerRef.current) clearTimeout(sseTimerRef.current);
    sseTimerRef.current = setTimeout(() => fetchCrewData({ silent: true }), 400);
  }, [lastEvent, imo, searchParams, fetchCrewData, clearLastEvent]);

  // 언마운트 시 진행 중인 요청·예약된 갱신 정리
  useEffect(() => () => {
    abortRef.current?.abort();
    if (sseTimerRef.current) clearTimeout(sseTimerRef.current);
  }, []);

  const filteredCrew = useMemo(
    () =>
      (mode === "prepay"
        ? crew.filter((u) => u.userId.startsWith("crewpay-"))
        : crew.filter((u) => !u.userId.startsWith("crewpay-"))
      ).filter((u) => u.userId !== "synersat"),
    [crew, mode],
  );

  // 크루 탭 진입 시 유저별 최근 리셋 시각 조회
  useEffect(() => {
    if (!imo) return;
    getRecentResetTime(imo)
      .then((data) => {
        const map: Record<string, string> = {};
        data.forEach(({ userId, recentUsageResetTimeStamp }) => {
          map[userId] = recentUsageResetTimeStamp;
        });
        setResetMap(map);
      })
      .catch(() => setResetMap({}));
  }, [imo]);

  // 탭 전환 시 선택 초기화
  useEffect(() => { setSelected(new Set()); }, [mode]);

  const allIds = useMemo(() => filteredCrew.filter((u) => u.updateType == null).map((u) => u.userId), [filteredCrew]);

  // 유저명에서 끝 숫자를 뗀 접두사(안테나 구분)로 묶어 상위 2개 그룹만 노출
  const quickGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    filteredCrew.forEach((u) => {
      if (u.updateType != null) return; // pending 항목은 선택 불가
      const prefix = u.userId.replace(/^crewpay-/, "").replace(/\d+$/, "");
      if (!prefix) return;
      const ids = groups.get(prefix);
      if (ids) ids.push(u.userId);
      else groups.set(prefix, [u.userId]);
    });
    return [...groups.entries()]
      .map(([prefix, ids]) => ({ prefix, ids }))
      .sort((a, b) => b.ids.length - a.ids.length || a.prefix.localeCompare(b.prefix))
      .slice(0, 2);
  }, [filteredCrew]);

  // 테이블에 보이는 유저들의 사용량을 터미널 타입별로 집계 (단위: MB)
  const usageByType = useMemo(() => {
    const totals = new Map<string, number>();
    filteredCrew.forEach((u) => {
      const { label } = getBadgeProps(u.terminalType);
      const usedMb = parseFloat(u.currentOctetUsage ?? "0") || 0;
      totals.set(label, (totals.get(label) ?? 0) + usedMb);
    });
    return [...totals.entries()]
      .map(([label, usedMb]) => ({ label, usedMb }))
      .sort((a, b) => b.usedMb - a.usedMb || a.label.localeCompare(b.label));
  }, [filteredCrew]);

  // 정확히 한 그룹만 선택된 상태면 그 그룹을 활성 표시
  const activeGroup = useMemo(() => {
    const matched = quickGroups.find(
      (g) => g.ids.length === selected.size && g.ids.every((id) => selected.has(id)),
    );
    return matched?.prefix ?? null;
  }, [quickGroups, selected]);

  const handleQuickSelect = useCallback((prefix: string) => {
    const group = quickGroups.find((g) => g.prefix === prefix);
    if (!group) return;
    setSelected((prev) => {
      const isActive = prev.size === group.ids.length && group.ids.every((id) => prev.has(id));
      return isActive ? new Set() : new Set(group.ids);
    });
  }, [quickGroups]);

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

  const onAction = (action: ActionType) => {
    if (action === "CHECK_PW") {
      const selectedUsers = filteredCrew.filter((u) => selected.has(u.userId));
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
    }
  };

  const handleDeleteConfirm = async () => {
    if (!imo) return;
    setIsDeleteAlertOpen(false);
    try {
      await deleteCrewData(imo, Array.from(selected));
      setSelected(new Set());
      await fetchCrewData({ preserveOnError: true });
    } catch (error) {
      console.error("Error deleting crew:", error);
    }
  };

  const handleExportCSV = () => {
    if (filteredCrew.length === 0) return;
    const safe = (s: string) => s.replace(/[/\\?%*:|"<>]/g, "_");
    const vesselFileName = safe(selectedVessel?.name ?? "vessel");

    const sheetData = [
      ["ID", "Description", "Type", "Update Period", "Usage (MB)", "Limit (MB)"],
      ...filteredCrew.map((u) => [
        u.userId,
        u.description ?? "",
        u.terminalType || "Auto",
        u.halfTimePeriod === "half"
          ? `Half-${u.maxTotalOctetsTimeRange}`
          : u.maxTotalOctetsTimeRange,
        u.currentOctetUsage ?? "0",
        u.maxTotalOctets ?? "0",
      ]),
    ];

    const csv = sheetData
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${vesselFileName}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <RefreshBanner visible={refreshBanner} onClose={() => setRefreshBanner(false)} />

      <div className="rounded-2xl border border-gray-200 bg-(--color-surface-1) shadow-sm dark:border-white/5">
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
          quickGroups={quickGroups}
          activeGroup={activeGroup}
          onQuickSelect={handleQuickSelect}
          usageByType={usageByType}
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
          onSaved={() => { setTopUpTarget(null); fetchCrewData({ preserveOnError: true }); }}
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
        vesselName={selectedVessel?.name ?? "vessel"}
      />

      {imo && (
        <CheckUsageModal
          isOpen={checkUsageOpen}
          onClose={() => setCheckUsageOpen(false)}
          selectedCrew={filteredCrew.filter((u) => selected.has(u.userId))}
          allCrew={filteredCrew.filter((u) => u.updateType == null)}
          imo={imo}
          vesselName={selectedVessel?.name ?? "vessel"}
          resetMap={resetMap}
        />
      )}

      {imo && (
        <UsageHistoryModal
          isOpen={!!usageHistoryTarget}
          onClose={() => setUsageHistoryTarget(null)}
          crew={usageHistoryTarget}
          imo={imo}
          resetMap={resetMap}
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
          onSaved={() => { setModifyCrewOpen(false); setSelected(new Set()); fetchCrewData({ preserveOnError: true }); }}
          selectedCrew={filteredCrew.filter((u) => selected.has(u.userId))}
          imo={imo}
        />
      )}

      {imo && (
        <AddCrewModal
          isOpen={addCrewOpen}
          onClose={() => setAddCrewOpen(false)}
          onSaved={() => { setAddCrewOpen(false); fetchCrewData({ preserveOnError: true }); }}
          imo={imo}
        />
      )}
    </div>
  );
}
