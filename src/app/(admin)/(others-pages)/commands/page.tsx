"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getCommands } from "@/api/command";
import type {
  CommandApiResponse,
  CommandContent,
  GetCommandsParams,
  CommandType,
  CommandStatus,
} from "@/types/command";

// 하위 컴포넌트들 (생성 예정)
import CommandFilterContainer from "@/components/commands/CommandFilterContainer";
import CommandTable from "@/components/commands/CommandTable";
import Pagination from "@/components/common/Pagenation";

export default function CommandsPage() {
  // 1. 데이터 및 로딩 상태 관리
  const [data, setData] = useState<CommandApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 2. 검색 필터 및 페이지네이션 상태 관리
  const [params, setParams] = useState<GetCommandsParams>({
    pageIndex: 1,
    pageSize: 20,
    commandType: undefined,
    commandStatus: undefined,
    imo: undefined,
  });

  // 3. API 호출 함수
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

  // 4. 파라미터가 변경될 때마다 API 재호출
  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  // 5. 필터 변경 핸들러 (FilterContainer에서 사용)
  const handleFilterChange = (newFilters: Partial<GetCommandsParams>) => {
    setParams((prev) => ({
      ...prev,
      ...newFilters,
      pageIndex: 1, // 필터 변경 시 첫 페이지로 리셋
    }));
  };

  // 6. 페이지 변경 핸들러 (Pagination에서 사용)
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
        {/* 상단: 필터 영역 */}
        <CommandFilterContainer
          onFilterChange={handleFilterChange}
          currentFilters={params}
        />

        {/* 중앙: 테이블 영역 */}
        <CommandTable commands={data?.contents || []} isLoading={isLoading} />

        {/* 하단: 페이지네이션 영역 */}
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
