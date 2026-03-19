"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "../form/Select";
import Alert from "../ui/alert/Alert";
import { EnvelopeIcon } from "@/icons";
import { useVesselForm } from "./hooks/useVesselForm";
import { LOGO_OPTIONS, MANAGER_OPTIONS } from "./constants/vesselFormOptions";
import Loading from "../common/Loading";
import { useRouter } from "next/navigation";
import { useVesselStore } from "@/store/vessel.store";
import SelectWithIcon from "../form/SelectWithIcon";

type Mode = "add" | "edit";

interface VesselFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
  vesselData?: any; // edit 모드에서만 필요
}

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <Label className="mb-1.5 block text-sm font-bold dark:text-white">
    {children} <span className="ml-1 text-red-500">*</span>
  </Label>
);

const DuplicateStatus = ({
  loading,
  duplicated,
}: {
  loading: boolean;
  duplicated: boolean | null;
}) => (
  <div className="mt-1 h-4 text-xs">
    {loading && <span className="text-gray-500">Checking...</span>}
    {duplicated === true && (
      <span className="font-medium text-red-500">Already in use.</span>
    )}
    {duplicated === false && (
      <span className="font-medium text-green-600">
        {loading ? "" : "Available."}
      </span>
    )}
  </div>
);

export default function VesselFormModal({
  isOpen,
  onClose,
  mode,
  vesselData,
}: VesselFormModalProps) {
  const router = useRouter();
  const [vesselResult, setVesselResult] = useState<any>(null);
  const form = useVesselForm(mode, vesselData);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);

  const inputBaseStyle =
    "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm font-medium outline-none focus:border-brand-500 dark:border-gray-700 dark:text-gray-200";
  const labelStyle =
    "dark:text-white text-gray-800 font-bold mb-1.5 block text-sm";

  useEffect(() => {
    if (isOpen) {
      form.init();
      setVesselResult(null);
    } else {
      form.reset();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const result = await form.handleSubmit();
    if (result && mode === "add") {
      setVesselResult(result);
    } else if (result && mode === "edit") {
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="relative max-h-[95vh] w-[95vw] max-w-[750px] overflow-hidden p-8 shadow-2xl dark:border-white/10 dark:bg-[#121212]"
    >
      {form.saving && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-white/50 backdrop-blur-sm dark:bg-black/40">
          <Loading
            message={mode === "add" ? "Creating Vessel..." : "Updating..."}
            className="h-12 w-12"
          />
        </div>
      )}

      <div
        className={`flex max-h-[90vh] flex-col gap-6 ${form.saving ? "blur-sm" : ""}`}
      >
        <div className="border-b pb-4 dark:border-white/10">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            {vesselResult
              ? "Registration Successful"
              : mode === "add"
                ? "Add New Vessel"
                : "Edit Vessel Information"}
          </h3>
          {mode === "edit" && (
            <p className="mt-1 text-sm text-gray-500">
              Update details for {vesselData?.name}
            </p>
          )}
        </div>

        {form.alertState && (
          <Alert
            variant={form.alertState.variant}
            title={form.alertState.title}
            message={form.alertState.message}
          />
        )}

        <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
          {!vesselResult ? (
            <form className="space-y-5 pb-4">
              <div>
                <RequiredLabel>Account</RequiredLabel>{" "}
                {/* ✅ Label → RequiredLabel */}
                <SelectWithIcon
                  options={form.options}
                  value={form.account}
                  onChange={(v) => form.setAccount(v)}
                  placeholder="Select Account"
                />
                {/* ✅ 공란 경고 */}
                {!form.account && (
                  <p className="mt-1 text-[11px] font-medium text-red-500">
                    Account is required.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* ✅ add면 IMO 입력, edit면 읽기 전용 */}
                <div>
                  {mode === "add" ? (
                    <RequiredLabel>IMO</RequiredLabel>
                  ) : (
                    <Label className={labelStyle}>IMO</Label>
                  )}
                  <Input
                    type="text"
                    className={
                      mode === "edit"
                        ? `${inputBaseStyle} cursor-not-allowed bg-gray-100 opacity-60 dark:bg-white/5`
                        : inputBaseStyle
                    }
                    value={
                      mode === "add" ? form.imo : String(vesselData?.imo || "")
                    }
                    disabled={mode === "edit"}
                    placeholder={mode === "add" ? "7-9 digits" : undefined}
                    onChange={
                      mode === "add"
                        ? (e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            if (val.length <= 9) {
                              form.setImo(val);
                              form.setImoDuplicated(null);
                            }
                          }
                        : undefined
                    }
                    onBlur={mode === "add" ? form.handleImoBlur : undefined}
                  />
                  {mode === "add" && (
                    <DuplicateStatus
                      loading={form.imoChecking}
                      duplicated={form.imoDuplicated}
                    />
                  )}
                </div>
                <div>
                  <RequiredLabel>Vessel ID</RequiredLabel>
                  <Input
                    type="text"
                    className={
                      mode === "edit"
                        ? `${inputBaseStyle} cursor-not-allowed bg-gray-100 opacity-60 dark:bg-white/5`
                        : inputBaseStyle
                    }
                    value={
                      mode === "add"
                        ? form.vesselId
                        : String(vesselData?.id || "")
                    }
                    disabled={mode === "edit"}
                    onChange={
                      mode === "add"
                        ? (e) => {
                            form.setVesselId(e.target.value);
                            form.setVesselIdDuplicated(null);
                          }
                        : undefined
                    }
                    onBlur={
                      mode === "add" ? form.handleVesselIdBlur : undefined
                    }
                  />
                  {mode === "add" && (
                    <DuplicateStatus
                      loading={form.vesselIdChecking}
                      duplicated={form.vesselIdDuplicated}
                    />
                  )}
                </div>
              </div>

              <div>
                <RequiredLabel>VPN IP</RequiredLabel>
                <div className="flex items-center gap-1.5">
                  <div className="flex h-11 flex-[3] items-center justify-center rounded-lg border border-gray-300 bg-gray-100 font-bold text-gray-500 dark:border-white/10 dark:bg-white/5">
                    10.8.
                  </div>
                  <input
                    type="text"
                    className={`${inputBaseStyle} flex-[4] text-center`}
                    placeholder="0-255"
                    value={form.vpnIpPart3}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      if (Number(val) <= 255) {
                        form.setVpnIpPart3(val);
                        form.setVpnDuplicated(null);
                      }
                    }}
                    onBlur={form.handleVpnIpBlur}
                  />
                  <span className="font-bold text-gray-400">.</span>
                  <input
                    type="text"
                    className={`${inputBaseStyle} flex-[4] text-center`}
                    placeholder="0-255"
                    value={form.vpnIpPart4}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      if (Number(val) <= 255) {
                        form.setVpnIpPart4(val);
                        form.setVpnDuplicated(null);
                      }
                    }}
                    onBlur={form.handleVpnIpBlur}
                  />
                </div>
                <DuplicateStatus
                  loading={form.vpnChecking}
                  duplicated={form.vpnDuplicated}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <RequiredLabel>Name</RequiredLabel>{" "}
                  {/* ✅ Label → RequiredLabel */}
                  <Input
                    className={inputBaseStyle}
                    value={form.name}
                    onChange={(e) => form.setName(e.target.value)}
                    placeholder="Will be saved in uppercase"
                  />
                  {!form.name.trim() &&
                    form.name !== "" && ( // 한 번이라도 입력 후 비우면
                      <p className="mt-1 text-[11px] font-medium text-red-500">
                        Name is required.
                      </p>
                    )}
                </div>
                <div>
                  <Label className={labelStyle}>S/N</Label>
                  <Input
                    className={inputBaseStyle}
                    value={form.serialNumber}
                    onChange={(e) => {
                      form.setSerialNumber(e.target.value);
                      form.setSnDuplicated(null);
                    }}
                    onBlur={form.handleSerialNumberBlur}
                  />
                  <DuplicateStatus
                    loading={form.snChecking}
                    duplicated={form.snDuplicated}
                  />
                </div>
                <div>
                  <Label className={labelStyle}>MMSI</Label>
                  <Input
                    className={inputBaseStyle}
                    value={form.mmsi}
                    onChange={(e) =>
                      form.setMmsi(e.target.value.replace(/[^0-9]/g, ""))
                    }
                  />
                </div>
                <div>
                  <Label className={labelStyle}>Callsign</Label>
                  <Input
                    className={inputBaseStyle}
                    value={form.callsign}
                    onChange={(e) => form.setCallsign(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label className={labelStyle}>Mail Address</Label>
                  <div className="relative">
                    <Input
                      type="email"
                      className="pl-[62px]"
                      value={form.mailAddress}
                      onChange={(e) => form.setMailAddress(e.target.value)}
                    />
                    <span className="absolute top-1/2 left-0 -translate-y-1/2 border-r border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      <EnvelopeIcon />
                    </span>
                  </div>
                </div>
                <div>
                  <Label className={labelStyle}>Manager</Label>
                  <SelectWithIcon
                    options={MANAGER_OPTIONS}
                    value={form.manager}
                    onChange={form.setManager}
                  />
                </div>
                <div>
                  <Label className={labelStyle}>Logo</Label>
                  <SelectWithIcon
                    options={LOGO_OPTIONS}
                    value={form.logo}
                    onChange={form.setLogo}
                  />
                </div>
              </div>
            </form>
          ) : (
            // ✅ add 성공 결과 화면
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                {[
                  { label: "ID", value: vesselResult.id },
                  { label: "IMO", value: vesselResult.imo },
                  { label: "Name", value: vesselResult.name || "-" },
                  { label: "VPN IP", value: vesselResult.vpnIp },
                  { label: "Account", value: vesselResult.acct },
                  { label: "S/N", value: vesselResult.serialNumber || "-" },
                  { label: "Email", value: vesselResult.mailAddress || "-" },
                  {
                    label: "Password",
                    value: vesselResult.password || "-",
                    highlight: true,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col border-b border-gray-100 pb-2 dark:border-white/5"
                  >
                    <span className="text-sm font-bold tracking-tight text-gray-400 uppercase">
                      {item.label}
                    </span>
                    <span
                      className={`text-md mt-1 font-semibold ${item.highlight ? "text-brand-500" : "text-gray-700 dark:text-gray-200"}`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-3 border-t pt-6 dark:border-white/10">
          {!vesselResult ? (
            <>
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium transition-all hover:bg-gray-50 dark:border-white/10 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.canSubmit}
                className="bg-brand-500 hover:bg-brand-600 rounded-lg px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all disabled:bg-gray-400"
              >
                {form.saving
                  ? mode === "add"
                    ? "Creating..."
                    : "Updating..."
                  : mode === "add"
                    ? "Create Vessel"
                    : "Save Changes"}
              </button>
            </>
          ) : (
            <div className="flex w-full gap-3">
              <button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className="flex-1 rounded-lg bg-gray-500 py-3 text-sm font-extrabold text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedVessel({
                    id: vesselResult.id,
                    imo: vesselResult.imo,
                    name: vesselResult.name,
                    vpnIp: vesselResult.vpnIp,
                  });
                  onClose();
                  router.push("/vessels/detail");
                }}
                className="bg-brand-500 flex-1 rounded-lg py-3 text-sm font-extrabold text-white shadow-lg"
              >
                Show Details
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
