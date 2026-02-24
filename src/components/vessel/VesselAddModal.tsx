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
  addVessel,
  imoDuplicate,
} from "@/api/vessel";
import { useRouter } from "next/navigation";

// API 응답 데이터 타입 정의
interface VesselResponse {
  imo: number;
  id: string;
  vpnIp: string;
  serialNumber: string;
  password?: string;
  logo: string;
  manager: string;
  acct: string;
  mmsi: number;
  callSign: string;
  name: string;
  mailAddress: string;
}

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

  const [adding, setAdding] = useState(false);
  const [vesselResult, setVesselResult] = useState<VesselResponse | null>(null);

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

  const [alertState, setAlertState] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const router = useRouter();

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

  useEffect(() => {
    if (isOpen) {
      getAccounts()
        .then((data) => {
          setOptions(data.map((acct) => ({ value: acct, label: acct })));
        })
        .catch((err) => console.error(err));
    } else {
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
      setVesselResult(null);
      lastCheckedImoRef.current = "";
      lastCheckedVesselIdRef.current = "";
      lastCheckedVpnRef.current = "";
      lastCheckedSnRef.current = "";
    }
  }, [isOpen]);

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
      const result = await addVessel(payload);
      if (result) {
        setVesselResult(result);
        setAlertState({
          variant: "success",
          title: "Success",
          message: "Registered successfully.",
        });
      } else {
        setAlertState({
          variant: "error",
          title: "Error",
          message: "Failed to add vessel.",
        });
      }
    } catch (e) {
      setAlertState({
        variant: "error",
        title: "Error",
        message: "Network Error",
      });
    } finally {
      setAdding(false);
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
      className="max-h-[95vh] w-[95vw] max-w-[750px] overflow-hidden p-8 shadow-2xl dark:border-white/10 dark:bg-[#121212]"
    >
      <div className="flex max-h-[90vh] flex-col gap-6">
        <div className="border-b pb-4 dark:border-white/10">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            {vesselResult ? "Registration Successful" : "Add New Vessel"}
          </h3>
        </div>

        {alertState && (
          <Alert
            variant={alertState.variant}
            title={alertState.title}
            message={alertState.message}
          />
        )}

        <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
          {!vesselResult ? (
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

              <div>
                <RequiredLabel>VPN IP</RequiredLabel>
                <div className="flex items-center gap-2">
                  <div className="flex h-11 basis-1/4 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 font-bold text-gray-500 dark:border-white/10 dark:bg-white/5">
                    10.8.
                  </div>
                  <input
                    type="text"
                    className={`${inputBaseStyle} text-center`}
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
                  <input
                    type="text"
                    className={`${inputBaseStyle} text-center`}
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
                    <span className="font-medium text-green-600">
                      Available.
                    </span>
                  )}
                </div>
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
                  <Select
                    options={logoOptions}
                    value={logo}
                    onChange={setLogo}
                  />
                </div>
              </div>
            </form>
          ) : (
            <div className="animate-fadeIn space-y-6 py-2">
              <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                <DetailItem label="ID" value={vesselResult.id} />
                <DetailItem label="IMO" value={vesselResult.imo} />
                <DetailItem label="Name" value={vesselResult.name || "-"} />
                <DetailItem label="VPN IP" value={vesselResult.vpnIp} />
                <DetailItem label="Account" value={vesselResult.acct} />
                <DetailItem
                  label="Serial Number"
                  value={vesselResult.serialNumber || "-"}
                />
                <DetailItem
                  label="Email"
                  value={vesselResult.mailAddress || "-"}
                />
                <DetailItem
                  label="Password"
                  value={vesselResult.password || "-"}
                  highlight
                />
                <DetailItem
                  label="Callsign"
                  value={vesselResult.callSign || "-"}
                />
                <DetailItem label="MMSI" value={vesselResult.mmsi || "-"} />
                <DetailItem
                  label="Manager"
                  value={vesselResult.manager || "-"}
                />
                <DetailItem label="Logo" value={vesselResult.logo || "-"} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-3 border-t pt-6 dark:border-white/10">
          {!vesselResult ? (
            <>
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium transition-all hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVesselEvent}
                disabled={!canSubmit}
                className="bg-brand-500 hover:bg-brand-600 shadow-brand-500/20 rounded-lg px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all disabled:bg-gray-400 disabled:shadow-none"
              >
                {adding ? "Creating..." : "Create Vessel"}
              </button>
            </>
          ) : (
            <div className="flex w-full items-center gap-3">
              {/* Close 버튼: flex-1을 주어 남은 공간의 절반을 차지하게 함 */}
              <button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className="flex-1 rounded-lg bg-gray-500 py-3 text-sm font-extrabold text-white transition-transform active:scale-[0.98] dark:text-white"
              >
                Close
              </button>

              {/* Show Details 버튼: 마찬가지로 flex-1을 주어 동일한 너비를 가짐 */}
              <button
                onClick={() => {
                  if (vesselResult) {
                    const encodedName = encodeURIComponent(vesselResult.name);
                    onClose(); // 이동 전 모달 닫기
                    router.push(
                      `/vessels/${encodedName}?imo=${vesselResult.imo}`,
                    );
                  }
                }}
                className="bg-brand-500 shadow-brand-500/20 flex-1 rounded-lg py-3 text-sm font-extrabold text-white shadow-lg transition-transform active:scale-[0.98]"
              >
                Show Details
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const DetailItem = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) => (
  <div className="flex flex-col border-b border-gray-100 pb-2 dark:border-white/5">
    <span className="text-sm font-bold tracking-tight text-gray-400 uppercase dark:text-gray-500">
      {label}
    </span>
    <span
      className={`text-md mt-1 font-semibold ${highlight ? "text-brand-500" : "text-gray-700 dark:text-gray-200"}`}
    >
      {value}
    </span>
  </div>
);

export default VesselAddModal;
