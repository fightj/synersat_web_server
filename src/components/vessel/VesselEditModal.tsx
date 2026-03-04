"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "../form/Select";
import Alert from "../ui/alert/Alert";
import { EnvelopeIcon } from "@/icons";
import {
  getAccounts,
  serialNumberDuplicate,
  vpnIpDuplicate,
  VesselDuplicate,
  imoDuplicate,
  // updateVessel API가 있다면 추가
} from "@/api/vessel";

// 상세 뷰에서 전달받는 데이터 타입 (기존 VesselDetail 타입 기준)
interface VesselEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  vesselData: any; // VesselDetail 데이터
}

type SelectOption = { value: string; label: string };

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <Label className="mb-1.5 block text-sm font-bold dark:text-white">
    {children} <span className="ml-1 text-red-500">*</span>
  </Label>
);

const VesselEditModal: React.FC<VesselEditModalProps> = ({
  isOpen,
  onClose,
  vesselData,
}) => {
  // --- 상태 관리 (vesselData로 초기화) ---
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [account, setAccount] = useState("");
  const [imo, setImo] = useState("");
  const [vesselId, setVesselId] = useState("");
  const [vpnIpPart3, setVpnIpPart3] = useState("");
  const [vpnIpPart4, setVpnIpPart4] = useState("");
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [mmsi, setMmsi] = useState("");
  const [callsign, setCallsign] = useState("");
  const [mailAddress, setMailAddress] = useState("");
  const [manager, setManager] = useState("");
  const [logo, setLogo] = useState("");

  const [saving, setSaving] = useState(false);

  // 중복 확인 상태 (수정 시에는 본인의 기존 데이터면 중복이 아닌 것으로 간주)
  const [imoChecking, setImoChecking] = useState(false);
  const [imoDuplicated, setImoDuplicated] = useState<boolean | null>(null);

  const [vesselIdChecking, setVesselIdChecking] = useState(false);
  const [vesselIdDuplicated, setVesselIdDuplicated] = useState<boolean | null>(
    null,
  );

  const [vpnChecking, setVpnChecking] = useState(false);
  const [vpnDuplicated, setVpnDuplicated] = useState<boolean | null>(null);

  const [snChecking, setSnChecking] = useState(false);
  const [snDuplicated, setSnDuplicated] = useState<boolean | null>(null);

  const [alertState, setAlertState] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const logoOptions = [
    { value: "synersat", label: "Synersat" },
    { value: "sktelink", label: "SK Telink" },
    { value: "null", label: "None" },
  ];

  const managerOptions = [
    { value: "synersat", label: "Synersat" },
    { value: "sktelink", label: "SK Telink" },
    { value: "null", label: "None" },
  ];

  // --- 데이터 초기화 ---
  useEffect(() => {
    if (isOpen && vesselData) {
      // 계정 목록 호출
      getAccounts().then((data) => {
        setOptions(data.map((acct) => ({ value: acct, label: acct })));
      });

      // 데이터 매핑
      setAccount(vesselData.acct || "");
      setImo(String(vesselData.imo || ""));
      setVesselId(vesselData.id || "");

      const ipParts = (vesselData.vpn_ip || "").split(".");
      setVpnIpPart3(ipParts[2] || "");
      setVpnIpPart4(ipParts[3] || "");

      setName(vesselData.name || "");
      setSerialNumber(vesselData.serialNumber || "");
      setMmsi(String(vesselData.mmsi || ""));
      setCallsign(vesselData.callsign || "");
      setMailAddress(vesselData.mailAddress || "");
      setManager(vesselData.manager || "");
      setLogo(vesselData.logo || "");

      // 수정이므로 초기값은 중복 아님 처리
      setImoDuplicated(false);
      setVesselIdDuplicated(false);
      setVpnDuplicated(false);
      setSnDuplicated(false);
    }
  }, [isOpen, vesselData]);

  // --- 중복 검사 로직 (기존값과 다를 때만 실행) ---
  const handleImoBlur = async () => {
    if (imo === String(vesselData?.imo)) return setImoDuplicated(false);
    if (imo.length < 7) return;
    try {
      setImoChecking(true);
      setImoDuplicated(await imoDuplicate(imo));
    } finally {
      setImoChecking(false);
    }
  };

  const handleVesselIdBlur = async () => {
    if (vesselId === vesselData?.id) return setVesselIdDuplicated(false);
    if (!vesselId.trim()) return;
    try {
      setVesselIdChecking(true);
      setVesselIdDuplicated(await VesselDuplicate(vesselId));
    } finally {
      setVesselIdChecking(false);
    }
  };

  const handleVpnIpBlur = async () => {
    const fullIp = `10.8.${vpnIpPart3}.${vpnIpPart4}`;
    if (fullIp === vesselData?.vpn_ip) return setVpnDuplicated(false);
    if (!vpnIpPart3 || !vpnIpPart4) return;
    try {
      setVpnChecking(true);
      setVpnDuplicated(await vpnIpDuplicate(fullIp));
    } finally {
      setVpnChecking(false);
    }
  };

  const handleSerialNumberBlur = async () => {
    if (serialNumber === vesselData?.serialNumber)
      return setSnDuplicated(false);
    if (!serialNumber.trim()) return;
    try {
      setSnChecking(true);
      setSnDuplicated(await serialNumberDuplicate(serialNumber));
    } finally {
      setSnChecking(false);
    }
  };

  const canSubmit = useMemo(() => {
    const requiredFilled =
      imo.length >= 7 &&
      vesselId.trim() !== "" &&
      vpnIpPart3 !== "" &&
      vpnIpPart4 !== "";
    const duplicateOk =
      imoDuplicated === false &&
      vesselIdDuplicated === false &&
      vpnDuplicated === false;
    return Boolean(requiredFilled && duplicateOk && !saving);
  }, [
    imo,
    vesselId,
    vpnIpPart3,
    vpnIpPart4,
    imoDuplicated,
    vesselIdDuplicated,
    vpnDuplicated,
    saving,
  ]);

  const handleUpdateVesselEvent = async () => {
    const payload = {
      imo: Number(imo),
      id: vesselId.trim(),
      vpnIp: `10.8.${vpnIpPart3}.${vpnIpPart4}`,
      serialNumber: serialNumber.trim(),
      logo,
      manager,
      acct: account,
      mmsi: mmsi ? Number(mmsi) : 0,
      callSign: callsign.trim(),
      name: name.trim(),
      mailAddress: mailAddress.trim(),
    };

    try {
      setSaving(true);
      // const result = await updateVessel(vesselData.imo, payload); // API 호출 예시
      // if (result) {
      setAlertState({
        variant: "success",
        title: "Success",
        message: "Updated successfully.",
      });
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
      // }
    } catch (e) {
      setAlertState({
        variant: "error",
        title: "Error",
        message: "Network Error",
      });
    } finally {
      setSaving(false);
    }
  };

  const inputBaseStyle =
    "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm font-medium outline-none focus:border-brand-500 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500";
  const labelStyle =
    "dark:text-white text-gray-800 font-bold mb-1.5 block text-sm";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="z-9999 max-h-[95vh] w-[95vw] max-w-[750px] overflow-hidden p-8 shadow-2xl dark:border-white/10 dark:bg-[#121212]"
    >
      <div className="flex max-h-[90vh] flex-col gap-6">
        <div className="border-b pb-4 dark:border-white/10">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Edit Vessel Information
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Update details for {vesselData?.name}
          </p>
        </div>

        {alertState && (
          <Alert
            variant={alertState.variant}
            title={alertState.title}
            message={alertState.message}
          />
        )}

        <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
          <form className="space-y-5 pb-4">
            <div>
              <Label className={labelStyle}>Account</Label>
              <Select
                options={options}
                value={account}
                onChange={setAccount}
                placeholder="Select Account"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <RequiredLabel>IMO</RequiredLabel>
                <Input
                  type="text"
                  className={inputBaseStyle}
                  value={imo}
                  onChange={(e) => {
                    setImo(e.target.value.replace(/[^0-9]/g, ""));
                    setImoDuplicated(null);
                  }}
                  onBlur={handleImoBlur}
                />
                <DuplicateStatus
                  loading={imoChecking}
                  duplicated={imoDuplicated}
                />
              </div>
              <div>
                <RequiredLabel>Vessel ID</RequiredLabel>
                <Input
                  type="text"
                  className={inputBaseStyle}
                  value={vesselId}
                  onChange={(e) => {
                    setVesselId(e.target.value);
                    setVesselIdDuplicated(null);
                  }}
                  onBlur={handleVesselIdBlur}
                />
                <DuplicateStatus
                  loading={vesselIdChecking}
                  duplicated={vesselIdDuplicated}
                />
              </div>
            </div>

            <div>
              <RequiredLabel>VPN IP</RequiredLabel>
              <div className="flex items-center gap-2">
                <div className="flex h-11 basis-1/4 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 font-bold text-gray-500 dark:border-white/10 dark:bg-white/5">
                  10.8.
                </div>
                <input
                  type="text"
                  className={`${inputBaseStyle} text-center`}
                  value={vpnIpPart3}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    if (Number(val) <= 255) {
                      setVpnIpPart3(val);
                      setVpnDuplicated(null);
                    }
                  }}
                  onBlur={handleVpnIpBlur}
                />
                <input
                  type="text"
                  className={`${inputBaseStyle} text-center`}
                  value={vpnIpPart4}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    if (Number(val) <= 255) {
                      setVpnIpPart4(val);
                      setVpnDuplicated(null);
                    }
                  }}
                  onBlur={handleVpnIpBlur}
                />
              </div>
              <DuplicateStatus
                loading={vpnChecking}
                duplicated={vpnDuplicated}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={labelStyle}>Name</Label>
                <Input
                  className={inputBaseStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label className={labelStyle}>S/N</Label>
                <Input
                  className={inputBaseStyle}
                  value={serialNumber}
                  onChange={(e) => {
                    setSerialNumber(e.target.value);
                    setSnDuplicated(null);
                  }}
                  onBlur={handleSerialNumberBlur}
                />
                <DuplicateStatus
                  loading={snChecking}
                  duplicated={snDuplicated}
                />
              </div>
              <div>
                <Label className={labelStyle}>MMSI</Label>
                <Input
                  className={inputBaseStyle}
                  value={mmsi}
                  onChange={(e) =>
                    setMmsi(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
              </div>
              <div>
                <Label className={labelStyle}>Callsign</Label>
                <Input
                  className={inputBaseStyle}
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className={labelStyle}>Mail Address</Label>
                <div className="relative">
                  <Input
                    type="email"
                    className="pl-[62px]"
                    value={mailAddress}
                    onChange={(e) => setMailAddress(e.target.value)}
                  />
                  <span className="absolute top-1/2 left-0 -translate-y-1/2 border-r border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <EnvelopeIcon />
                  </span>
                </div>
              </div>
              <div>
                <Label className={labelStyle}>Manager</Label>
                <Select
                  options={managerOptions}
                  value={manager}
                  onChange={setManager}
                />
              </div>
              <div>
                <Label className={labelStyle}>Logo</Label>
                <Select options={logoOptions} value={logo} onChange={setLogo} />
              </div>
            </div>
          </form>
        </div>

        <div className="mt-2 flex justify-end gap-3 border-t pt-6 dark:border-white/10">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium transition-all hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateVesselEvent}
            disabled={!canSubmit}
            className="bg-brand-500 hover:bg-brand-600 shadow-brand-500/20 rounded-lg px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all disabled:bg-gray-400 disabled:shadow-none"
          >
            {saving ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// 중복 메시지 표시용 소형 컴포넌트
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
      <span className="font-medium text-green-600">Verified.</span>
    )}
  </div>
);

export default VesselEditModal;
