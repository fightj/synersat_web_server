"use client";

import { PlusIcon } from "@heroicons/react/24/solid";
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
  imo?: number;
}

export default function PortForwardPageTemplate({
  ruleType,
  pageTitle,
  imo: imoProp,
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
  } = usePortForward(ruleType, imoProp);

  return (
    <div className="space-y-6">
      <RefreshBanner visible={refreshBanner} onClose={() => setRefreshBanner(false)} />

      <DeleteConfirmAlert
        isOpen={isDeleteAlertOpen}
        onCancel={() => setIsDeleteAlertOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      <div className="rounded-2xl border border-gray-200 bg-(--color-surface-1) shadow-sm dark:border-white/5">
        {/* ✅ 헤더 - overflow 영향 없이 고정 */}
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
          <div></div>

          <div className="relative">
            <Button
              size="compact"
              variant="blue"
              disabled={!selectedVessel}
              onClick={() => {
                if (!selectedVessel) return;
                setIsAddModalOpen(true);
              }}
            >
              <PlusIcon className="h-4 w-4" />
              Add New Rule
            </Button>
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
