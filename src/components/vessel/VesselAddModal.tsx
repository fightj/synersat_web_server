"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "../form/Select";
import Alert from "../ui/alert/Alert";
import { ChevronDownIcon } from "@/icons";
import {
  getAccounts,
  serialNumberDuplicate,
  vpnIpDuplicate,
  VesselDuplicate,
  addVessel,
  imoDuplicate,
} from "@/api/vessel";

interface VesselAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SelectOption = { value: string; label: string };

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <Label className="mb-1.5 block text-sm font-bold dark:text-white">
    {children} <span className="ml-1 text-red-500">*</span>
  </Label>
);

const VesselAddModal: React.FC<VesselAddModalProps> = ({ isOpen, onClose }) => {
  // --- 상태 관리 ---
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

  // 중복 확인 상태 및 Refs
  const lastCheckedImoRef = useRef<string>("");
  const [imoChecking, setImoChecking] = useState(false);
  const [imoDuplicated, setImoDuplicated] = useState<boolean | null>(null);

  const lastCheckedVesselIdRef = useRef<string>("");
  const [vesselIdChecking, setVesselIdChecking] = useState(false);
  const [vesselIdDuplicated, setVesselIdDuplicated] = useState<boolean | null>(
    null,
  );

  const lastCheckedVpnRef = useRef<string>("");
  const [vpnChecking, setVpnChecking] = useState(false);
  const [vpnDuplicated, setVpnDuplicated] = useState<boolean | null>(null);

  const lastCheckedSnRef = useRef<string>("");
  const [snChecking, setSnChecking] = useState(false);
  const [snDuplicated, setSnDuplicated] = useState<boolean | null>(null);

  const [adding, setAdding] = useState(false);
  const [alertState, setAlertState] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const logoOptions = [
    { value: "synersat", label: "Synersat" },
    { value: "sktelink", label: "SK Telink" },
  ];

  const managerOptions = [
    { value: "synersat", label: "Synersat" },
    { value: "sktelink", label: "SK Telink" },
    { value: "null", label: "None" },
  ];

  useEffect(() => {
    if (isOpen) {
      getAccounts()
        .then((data) => {
          setOptions(data.map((acct) => ({ value: acct, label: acct })));
        })
        .catch((err) => console.error(err));
    } else {
      // 초기화
      setAccount("");
      setImo("");
      setVesselId("");
      setVpnIpPart3("");
      setVpnIpPart4("");
      setName("");
      setSerialNumber("");
      setMmsi("");
      setCallsign("");
      setMailAddress("");
      setManager("");
      setLogo("");
      setImoDuplicated(null);
      setVesselIdDuplicated(null);
      setVpnDuplicated(null);
      setSnDuplicated(null);
      setAlertState(null);
      lastCheckedImoRef.current = "";
      lastCheckedVesselIdRef.current = "";
      lastCheckedVpnRef.current = "";
      lastCheckedSnRef.current = "";
    }
  }, [isOpen]);

  // --- 비즈니스 로직 (중복 체크) ---
  const handleImoBlur = async () => {
    const val = imo.trim();
    if (val.length < 7 || lastCheckedImoRef.current === val) return;
    lastCheckedImoRef.current = val;
    try {
      setImoChecking(true);
      setImoDuplicated(await imoDuplicate(val));
    } catch {
      setImoDuplicated(null);
    } finally {
      setImoChecking(false);
    }
  };

  const handleVesselIdBlur = async () => {
    const id = vesselId.trim();
    if (!id || lastCheckedVesselIdRef.current === id) return;
    lastCheckedVesselIdRef.current = id;
    try {
      setVesselIdChecking(true);
      setVesselIdDuplicated(await VesselDuplicate(id));
    } catch {
      setVesselIdDuplicated(null);
    } finally {
      setVesselIdChecking(false);
    }
  };

  const handleVpnIpBlur = async () => {
    if (!vpnIpPart3 || !vpnIpPart4) return;
    const fullIp = `10.8.${vpnIpPart3}.${vpnIpPart4}`;
    if (lastCheckedVpnRef.current === fullIp) return;
    lastCheckedVpnRef.current = fullIp;
    try {
      setVpnChecking(true);
      setVpnDuplicated(await vpnIpDuplicate(fullIp));
    } catch {
      setVpnDuplicated(null);
    } finally {
      setVpnChecking(false);
    }
  };

  const handleSerialNumberBlur = async () => {
    const sn = serialNumber.trim();
    if (!sn || lastCheckedSnRef.current === sn) return;
    lastCheckedSnRef.current = sn;
    try {
      setSnChecking(true);
      setSnDuplicated(await serialNumberDuplicate(sn));
    } catch {
      setSnDuplicated(null);
    } finally {
      setSnChecking(false);
    }
  };

  // --- 제출 조건 (IMO, Vessel ID, VPN IP 필수) ---
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
    const notChecking = !imoChecking && !vesselIdChecking && !vpnChecking;
    return Boolean(requiredFilled && duplicateOk && notChecking && !adding);
  }, [
    imo,
    vesselId,
    vpnIpPart3,
    vpnIpPart4,
    imoDuplicated,
    vesselIdDuplicated,
    vpnDuplicated,
    imoChecking,
    vesselIdChecking,
    vpnChecking,
    adding,
  ]);

  const handleAddVesselEvent = async () => {
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
      setAdding(true);
      const isSuccess = await addVessel(payload);
      if (isSuccess) {
        setAlertState({
          variant: "success",
          title: "Success",
          message: "선박이 추가되었습니다.",
        });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setAlertState({
          variant: "error",
          title: "Error",
          message: "추가에 실패했습니다.",
        });
      }
    } catch (e) {
      setAlertState({
        variant: "error",
        title: "Error",
        message: "네트워크 오류가 발생했습니다.",
      });
    } finally {
      setAdding(false);
    }
  };

  // --- 스타일 및 렌더링 헬퍼 ---
  const inputBaseStyle =
    "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm font-medium outline-none focus:border-brand-500 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500";
  const labelStyle =
    "dark:text-white text-gray-800 font-bold mb-1.5 block text-sm";

  const RenderSelect = ({ options, placeholder, onChange }: any) => (
    <div className="relative">
      <Select
        options={options}
        placeholder={placeholder}
        onChange={onChange}
        className={inputBaseStyle}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 dark:text-gray-400">
        <ChevronDownIcon />
      </span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-h-[95vh] w-[95vw] max-w-[750px] overflow-hidden p-8 shadow-2xl dark:border-white/10 dark:bg-[#121212]"
    >
      <div className="flex max-h-[90vh] flex-col gap-6">
        <div className="border-b pb-4 dark:border-white/10">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Add New Vessel
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Fill in the vessel details below (IMO, ID, VPN IP are required).
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
            {/* Account */}
            <div>
              <Label className={labelStyle}>Account</Label>
              <RenderSelect
                options={options}
                placeholder="Select Account"
                onChange={setAccount}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* IMO */}
              <div>
                <RequiredLabel>IMO</RequiredLabel>
                <Input
                  type="text"
                  className={inputBaseStyle}
                  value={imo}
                  placeholder="7-9 digits"
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    if (val.length <= 9) {
                      setImo(val);
                      setImoDuplicated(null);
                      lastCheckedImoRef.current = "";
                    }
                  }}
                  onBlur={handleImoBlur}
                />
                <div className="mt-1 h-4 text-xs">
                  {imoChecking && (
                    <span className="text-gray-500">Checking...</span>
                  )}
                  {imoDuplicated === true && (
                    <span className="font-medium text-red-500">
                      Already in use.
                    </span>
                  )}
                  {imoDuplicated === false && (
                    <span className="font-medium text-green-600">
                      Available.
                    </span>
                  )}
                </div>
              </div>
              {/* Vessel ID */}
              <div>
                <RequiredLabel>Vessel ID</RequiredLabel>
                <Input
                  type="text"
                  className={inputBaseStyle}
                  value={vesselId}
                  placeholder="Enter ID"
                  onChange={(e) => {
                    setVesselId(e.target.value);
                    setVesselIdDuplicated(null);
                    lastCheckedVesselIdRef.current = "";
                  }}
                  onBlur={handleVesselIdBlur}
                />
                <div className="mt-1 h-4 text-xs">
                  {vesselIdChecking && (
                    <span className="text-gray-500">Checking...</span>
                  )}
                  {vesselIdDuplicated === true && (
                    <span className="font-medium text-red-500">
                      Already in use.
                    </span>
                  )}
                  {vesselIdDuplicated === false && (
                    <span className="font-medium text-green-600">
                      Available.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* VPN IP (비율 1/2 고정 영역 적용) */}
            <div>
              <RequiredLabel>VPN IP</RequiredLabel>
              <div className="flex items-center gap-2">
                <div className="flex h-11 basis-1/2 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-3 text-sm font-bold text-gray-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-gray-400">
                  10.8.
                </div>
                <input
                  type="text"
                  className={inputBaseStyle}
                  placeholder="0-255"
                  value={vpnIpPart3}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    if (Number(val) <= 255) {
                      setVpnIpPart3(val);
                      setVpnDuplicated(null);
                      lastCheckedVpnRef.current = "";
                    }
                  }}
                  onBlur={handleVpnIpBlur}
                />
                <span className="text-gray-400">.</span>
                <input
                  type="text"
                  className={inputBaseStyle}
                  placeholder="0-255"
                  value={vpnIpPart4}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    if (Number(val) <= 255) {
                      setVpnIpPart4(val);
                      setVpnDuplicated(null);
                      lastCheckedVpnRef.current = "";
                    }
                  }}
                  onBlur={handleVpnIpBlur}
                />
              </div>
              <div className="mt-1 h-4 text-xs">
                {vpnChecking && (
                  <span className="text-gray-500">Checking...</span>
                )}
                {vpnDuplicated === true && (
                  <span className="font-medium text-red-500">
                    Already in use.
                  </span>
                )}
                {vpnDuplicated === false && (
                  <span className="font-medium text-green-600">Available.</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={labelStyle}>Name</Label>
                <Input
                  className={inputBaseStyle}
                  type="text"
                  value={name}
                  placeholder="Vessel Name"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label className={labelStyle}>S/N</Label>
                <Input
                  className={inputBaseStyle}
                  type="text"
                  value={serialNumber}
                  placeholder="Serial Number"
                  onChange={(e) => {
                    setSerialNumber(e.target.value);
                    setSnDuplicated(null);
                    lastCheckedSnRef.current = "";
                  }}
                  onBlur={handleSerialNumberBlur}
                />
                <div className="mt-1 h-4 text-xs">
                  {snChecking && (
                    <span className="text-gray-500">Checking...</span>
                  )}
                  {snDuplicated === true && (
                    <span className="font-medium text-red-500">
                      Already in use.
                    </span>
                  )}
                  {snDuplicated === false && (
                    <span className="font-medium text-green-600">
                      Available.
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label className={labelStyle}>MMSI</Label>
                <Input
                  className={inputBaseStyle}
                  type="text"
                  placeholder="Digits only"
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
                  type="text"
                  placeholder="Callsign"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className={labelStyle}>Mail Address</Label>
                <Input
                  className={inputBaseStyle}
                  type="email"
                  placeholder="example@mail.com"
                  value={mailAddress}
                  onChange={(e) => setMailAddress(e.target.value)}
                />
              </div>
              <div>
                <Label className={labelStyle}>Manager</Label>
                <RenderSelect
                  options={managerOptions}
                  placeholder="Select Manager"
                  onChange={setManager}
                />
              </div>
              <div>
                <Label className={labelStyle}>Logo</Label>
                <RenderSelect
                  options={logoOptions}
                  placeholder="Select Logo"
                  onChange={setLogo}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Actions */}
        <div className="mt-2 flex justify-end gap-3 border-t pt-6 dark:border-white/10">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium transition-all hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleAddVesselEvent}
            disabled={!canSubmit}
            className="bg-brand-500 hover:bg-brand-600 rounded-lg px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all disabled:bg-gray-400"
          >
            {adding ? "Creating..." : "Create Vessel"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VesselAddModal;
