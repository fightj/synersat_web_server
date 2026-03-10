"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getCommands } from "@/app/api/commands/commands";
import type {
  CommandApiResponse,
  GetCommandsParams,
  CommandStatus,
} from "@/types/command";

import CommandFilterContainer from "@/components/commands/CommandFilterContainer";
import CommandTable from "@/components/commands/CommandTable";
import Pagination from "@/components/common/Pagenation";

export default function CommandsPage() {
  const [data, setData] = useState<CommandApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [params, setParams] = useState<GetCommandsParams>({
    pageIndex: 1,
    pageSize: 20,
    commandType: undefined,
    commandStatus: undefined,
    imo: undefined,
  });

  // ✅ 상태별 갯수 계산 (API 응답 데이터 기준)
  const stats = useMemo(() => {
    const initialStats: Record<CommandStatus, number> = {
      SUCCESS: 0,
      FAILED: 0,
      RUNNING: 0,
      READY: 0,
    };

    if (!data?.contents) return initialStats;

    return data.contents.reduce(
      (acc, curr) => {
        if (acc[curr.commandStatus] !== undefined) {
          acc[curr.commandStatus]++;
        }
        return acc;
      },
      { ...initialStats },
    );
  }, [data]);

  const fetchCommands = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getCommands(params);
      setData(response);
    } catch (error) {
      console.error("Failed to fetch commands:", error);
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  const handleFilterChange = (newFilters: Partial<GetCommandsParams>) => {
    setParams((prev) => ({
      ...prev,
      ...newFilters,
      pageIndex: 1,
    }));
  };

  const handlePageChange = (newPageIndex: number) => {
    setParams((prev) => ({
      ...prev,
      pageIndex: newPageIndex,
    }));
  };

  return (
    <>
      <PageBreadcrumb pageTitle="Commands" />

      <div className="mt-6 space-y-6">
        {/* 상단: 필터 및 상태 요약 영역 */}
        <CommandFilterContainer
          onFilterChange={handleFilterChange}
          currentFilters={params}
          stats={stats}
        />

        {/* 중앙: 테이블 영역 (선박명 Dot 포함) */}
        <CommandTable commands={data?.contents || []} isLoading={isLoading} />

        {/* 하단: 페이지네이션 영역 (SVG 아이콘 사용) */}
        {data && data.totalContentCount > 0 && (
          <div className="flex justify-center py-4">
            <Pagination
              currentPage={params.pageIndex}
              totalCount={data.totalContentCount}
              pageSize={params.pageSize}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </>
  );
}
