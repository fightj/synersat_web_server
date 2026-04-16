"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import PortForwardTable from "./PortForwardTable";
import DeleteConfirmAlert from "./DeleteConfirmAlert";
import PortForwardEditModal from "@/components/port-forward/PortForwardEditModal";
import PortForwardAddModal from "@/components/port-forward/PortForwardAddModal";
import RefreshBanner from "@/components/common/RefreshBanner";
import { usePortForward, RuleType } from "./usePortForward";

interface PortForwardPageTemplateProps {
  ruleType: RuleType;
  pageTitle: string;
}

export default function PortForwardPageTemplate({
  ruleType,
  pageTitle,
}: PortForwardPageTemplateProps) {
  const {
    selectedVessel,
    imo,
    interfaces,
    filteredRules,
    rules,
    isLocked,
    statusCounts,
    isLoading,
    isUpdating,
    fetchError,
    isEditModalOpen,
    setIsEditModalOpen,
    isAddModalOpen,
    setIsAddModalOpen,
    selectedRule,
    selectedIdx,
    isDeleteAlertOpen,
    setIsDeleteAlertOpen,
    fetchAllData,
    getInterfaceLabel,
    handleToggleStatus,
    handleEditClick,
    handleDeleteRequest,
    handleDeleteConfirm,
    refreshBanner,
    setRefreshBanner,
  } = usePortForward(ruleType);

  return (
    <div className="space-y-6">
      <RefreshBanner visible={refreshBanner} onClose={() => setRefreshBanner(false)} />
      <PageBreadcrumb pageTitle={pageTitle} />

      <DeleteConfirmAlert
        isOpen={isDeleteAlertOpen}
        onCancel={() => setIsDeleteAlertOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        {/* ✅ 헤더 - overflow 영향 없이 고정 */}
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
          <div className="flex items-center gap-3">
            {selectedVessel ? (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-500/10">
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                  {selectedVessel.name}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-500/10">
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  No vessel selected
                </span>
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              size="sm"
              disabled={isLocked || !selectedVessel}
              className={`font-semibold shadow-md transition-all ${
                isLocked || !selectedVessel
                  ? "cursor-not-allowed bg-gray-200 text-gray-400 shadow-none dark:bg-white/5 dark:text-white/20"
                  : "bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              }`}
              onClick={() => {
                if (isLocked || !selectedVessel) return;
                setIsAddModalOpen(true);
              }}
            >
              + Add New Rule
            </Button>
            {isLocked && (
              <p className="absolute top-full right-0 mt-1 text-[10px] whitespace-nowrap text-red-400">
                Resolve pending CREATE/DELETE first
              </p>
            )}
          </div>
        </div>

        {/* ✅ 테이블만 가로 스크롤 */}
        <div className="overflow-x-auto">
          <PortForwardTable
            rules={filteredRules}
            isLoading={isLoading}
            isUpdating={isUpdating}
            isLocked={isLocked}
            hasVessel={!!selectedVessel}
            fetchError={fetchError}
            onRetry={fetchAllData}
            statusCounts={statusCounts}
            getInterfaceLabel={getInterfaceLabel}
            onEditClick={handleEditClick}
            onToggleStatus={handleToggleStatus}
            onDeleteRequest={handleDeleteRequest}
          />
        </div>
      </div>

      <PortForwardEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        rule={selectedRule}
        ruleId={selectedIdx}
        imo={imo}
        interfaces={interfaces}
        onSuccess={fetchAllData}
        currentRuleCount={rules.length}
      />

      <PortForwardAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        imo={imo}
        interfaces={interfaces}
        onSuccess={fetchAllData}
        isSystem={ruleType}
      />
    </div>
  );
}
