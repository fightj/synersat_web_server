"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import PortForwardTable from "./PortForwardTable";
import DeleteConfirmAlert from "./DeleteConfirmAlert";
import PortForwardEditModal from "@/components/port-forward/PortForwardEditModal";
import PortForwardAddModal from "@/components/port-forward/PortForwardAddModal";
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
    isLoading,
    isUpdating,
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
  } = usePortForward(ruleType);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={pageTitle} />

      <DeleteConfirmAlert
        isOpen={isDeleteAlertOpen}
        onCancel={() => setIsDeleteAlertOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        {/* 헤더 */}
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-500/10">
              <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                {selectedVessel ? selectedVessel.name : "No vessel selected"}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-blue-600 font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add New Rule
          </Button>
        </div>

        {/* 테이블 */}
        <PortForwardTable
          rules={filteredRules}
          isLoading={isLoading}
          isUpdating={isUpdating}
          getInterfaceLabel={getInterfaceLabel}
          onEditClick={handleEditClick}
          onToggleStatus={handleToggleStatus}
          onDeleteRequest={handleDeleteRequest}
        />
      </div>

      <PortForwardEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        rule={selectedRule}
        ruleId={selectedIdx}
        imo={imo}
        interfaces={interfaces}
        onSuccess={fetchAllData}
        currentRuleCount={filteredRules.length}
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
