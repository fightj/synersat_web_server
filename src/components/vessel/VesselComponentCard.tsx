"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "../form/Select";
import {
  getAccounts,
  serialNumberDuplicate,
  vpnIpDuplicate,
  VesselDuplicate,
  addVessel,
} from "@/api/vessel";
import type { VesselAddInfo } from "@/types/vessel";
import Alert from "../ui/alert/Alert";

interface VesselComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  vesselAddBtn?: string;
}

type SelectOption = { value: string; label: string };

const VesselComponentCard: React.FC<VesselComponentCardProps> = ({
  title,
  children,
  className = "",
  vesselAddBtn,
}) => {
  const { isOpen, openModal, closeModal } = useModal();
  const [options, setOptions] = useState<SelectOption[]>([]);

  // ✅ Account (Select 값 저장)
  const [account, setAccount] = useState("");

  // ✅ 입력 필드들
  const [vesselId, setVesselId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [vpnIp, setVpnIp] = useState("");
  const [imo, setImo] = useState("");
  const [name, setName] = useState("");
  const [callsign, setCallsign] = useState("");
  const [mmsi, setMmsi] = useState("");

  // ✅ 중복확인 상태들
  const lastCheckedSnRef = useRef<string>("");
  const [snChecking, setSnChecking] = useState(false);
  const [snDuplicated, setSnDuplicated] = useState<boolean | null>(null);

  const lastCheckedVpnRef = useRef<string>("");
  const [vpnChecking, setVpnChecking] = useState(false);
  const [vpnDuplicated, setVpnDuplicated] = useState<boolean | null>(null);

  const lastCheckedVesselIdRef = useRef<string>("");
  const [vesselIdChecking, setVesselIdChecking] = useState(false);
  const [vesselIdDuplicated, setVesselIdDuplicated] = useState<boolean | null>(
    null,
  );

  // ✅ Add 요청 중 상태(선택)
  const [adding, setAdding] = useState(false);

  // 선박 추가 성공 or 실패 alert
  const [alertState, setAlertState] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const haddleVesselAddClick = () => openModal();

  useEffect(() => {
    getAccounts()
      .then((data) => {
        const mapped: SelectOption[] = data.map((acct) => ({
          value: acct,
          label: acct,
        }));
        setOptions(mapped);
      })
      .catch((err) => {
        console.error("Error fetching accounts:", err);
      });
  }, []);

  // ✅ Select에서 선택된 account 저장
  const handleSelectChange = (value: string) => {
    setAccount(value);
  };

  // ---------------------------
  // S/N blur 중복확인
  // ---------------------------
  const handleSerialNumberBlur = async () => {
    const sn = serialNumber.trim();
    if (!sn) return;

    if (lastCheckedSnRef.current === sn) return;
    lastCheckedSnRef.current = sn;

    try {
      setSnChecking(true);
      setSnDuplicated(null);

      const duplicated = await serialNumberDuplicate(sn);
      setSnDuplicated(duplicated);
    } catch (error) {
      console.log("s/n 중복확인 api 연동 실패", error);
      setSnDuplicated(null);
      lastCheckedSnRef.current = "";
    } finally {
      setSnChecking(false);
    }
  };

  const handleSerialNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 30) {
      setSerialNumber(value);
      setSnDuplicated(null);
      lastCheckedSnRef.current = "";
    }
  };

  // ---------------------------
  // VPN IP blur 중복확인
  // ---------------------------
  const handleVpnIpBlur = async () => {
    const ip = vpnIp.trim();
    if (!ip) return;

    if (lastCheckedVpnRef.current === ip) return;
    lastCheckedVpnRef.current = ip;

    try {
      setVpnChecking(true);
      setVpnDuplicated(null);

      const duplicated = await vpnIpDuplicate(ip);
      setVpnDuplicated(duplicated);
    } catch (error) {
      console.log("vpn ip 중복확인 api 연동 실패", error);
      setVpnDuplicated(null);
      lastCheckedVpnRef.current = "";
    } finally {
      setVpnChecking(false);
    }
  };

  const handleVpnIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 50) {
      setVpnIp(value);
      setVpnDuplicated(null);
      lastCheckedVpnRef.current = "";
    }
  };

  // ---------------------------
  // Vessel ID blur 중복확인
  // ---------------------------
  const handleVesselIdBlur = async () => {
    const id = vesselId.trim();
    if (!id) return;

    if (lastCheckedVesselIdRef.current === id) return;
    lastCheckedVesselIdRef.current = id;

    try {
      setVesselIdChecking(true);
      setVesselIdDuplicated(null);

      const duplicated = await VesselDuplicate(id);
      setVesselIdDuplicated(duplicated);
    } catch (error) {
      console.log("vessel id 중복확인 api 연동 실패", error);
      setVesselIdDuplicated(null);
      lastCheckedVesselIdRef.current = "";
    } finally {
      setVesselIdChecking(false);
    }
  };

  const handleVesselIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 30) {
      setVesselId(value);
      setVesselIdDuplicated(null);
      lastCheckedVesselIdRef.current = "";
    }
  };

  // ✅ Add 가능 여부 (선택)
  const canSubmit = useMemo(() => {
    // 필수 입력 체크(원하는 필드만 필수로 잡아도 됨)
    const requiredFilled =
      account.trim() &&
      vesselId.trim() &&
      serialNumber.trim() &&
      vpnIp.trim() &&
      imo.trim() &&
      name.trim() &&
      callsign.trim() &&
      mmsi.trim();

    // 중복검사 통과 체크(= false가 “사용 가능”)
    const duplicateOk =
      vesselIdDuplicated === false &&
      snDuplicated === false &&
      vpnDuplicated === false;

    // 검사중이면 막기
    const notChecking = !vesselIdChecking && !snChecking && !vpnChecking;

    return Boolean(requiredFilled && duplicateOk && notChecking && !adding);
  }, [
    account,
    vesselId,
    serialNumber,
    vpnIp,
    imo,
    name,
    callsign,
    mmsi,
    vesselIdDuplicated,
    snDuplicated,
    vpnDuplicated,
    vesselIdChecking,
    snChecking,
    vpnChecking,
    adding,
  ]);

  // ✅ Add Vessel 클릭
  const handleAddVesselEvent = async () => {
    const payload: VesselAddInfo = {
      acct: account.trim(),
      id: vesselId.trim(),
      serialnumber: serialNumber.trim(),
      imo: imo.trim(),
      vpnip: vpnIp.trim(),
      name: name.trim(),
      mmsi: mmsi.trim(),
      callsign: callsign.trim(),
    };

    // ✅ API 호출 전에 콘솔 출력
    console.log("[AddVessel] payload:", payload);

    // ✅ 필수값 체크 (원하면 더 추가 가능)
    if (
      !payload.acct ||
      !payload.id ||
      !payload.serialnumber ||
      !payload.vpnip
    ) {
      setAlertState({
        variant: "error",
        title: "Error Message",
        message: "필수 값이 누락되었습니다. 입력값을 확인해주세요.",
      });
      return;
    }

    try {
      setAdding(true);

      const result = await addVessel(payload);
      console.log("[AddVessel] response:", result);

      // 응답이 boolean | boolean[] 일 수 있으니 방어
      const isSuccess = Array.isArray(result)
        ? Boolean(result[0])
        : Boolean(result);

      if (isSuccess) {
        setAlertState({
          variant: "success",
          title: "Success Message",
          message: "선박이 성공적으로 추가되었습니다.",
        });
        // 2초 후 자동 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 2000);

        return;
      } else {
        setAlertState({
          variant: "error",
          title: "Error Message",
          message: "선박 추가에 실패했습니다. 잠시 후 다시 시도해주세요.",
        });
      }
    } catch (e) {
      // ✅ 네트워크/예외 실패
      setAlertState({
        variant: "error",
        title: "Error Message",
        message:
          "요청 중 오류가 발생했습니다. 네트워크/서버 상태를 확인해주세요.",
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      <div className="flex justify-between px-6 py-5">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
          {title}
        </h3>

        {vesselAddBtn && (
          <Button size="sm" variant="outline" onClick={haddleVesselAddClick}>
            {vesselAddBtn}
          </Button>
        )}
      </div>

      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800">
        <div className="space-y-6">{children}</div>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-h-[90vh] w-[95vw] max-w-[700px] overflow-hidden p-4 sm:p-6 lg:p-8"
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="px-2">
            <p className="text-xl font-bold dark:text-gray-200">Add Vessel</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter the details for the new vessel.
            </p>
            {/* ✅ Alert 표시 영역 */}
            {alertState && (
              <div className="mt-4">
                <Alert
                  variant={alertState.variant}
                  title={alertState.title}
                  message={alertState.message}
                />
              </div>
            )}
          </div>

          <div className="custom-scrollbar mt-6 flex-1 overflow-y-auto px-2">
            <form>
              <div className="mb-4">
                <Label>Account</Label>
                <Select
                  options={options}
                  placeholder="Select Option"
                  onChange={handleSelectChange}
                  className="dark:bg-dark-900"
                />
              </div>

              <div className="mb-4">
                <Label>Vessel ID</Label>
                <Input
                  type="text"
                  value={vesselId}
                  onChange={handleVesselIdChange}
                  onBlur={handleVesselIdBlur}
                  maxLength={30}
                />
                <div className="mt-2 text-xs">
                  {vesselIdChecking && (
                    <p className="text-gray-500">중복 확인 중...</p>
                  )}
                  {vesselIdDuplicated === true && (
                    <p className="text-red-500">
                      이미 사용 중인 Vessel ID 입니다.
                    </p>
                  )}
                  {vesselIdDuplicated === false && (
                    <p className="text-green-600">
                      사용 가능한 Vessel ID 입니다.
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <Label>S/N</Label>
                <Input
                  type="text"
                  value={serialNumber}
                  onChange={handleSerialNumberChange}
                  onBlur={handleSerialNumberBlur}
                  maxLength={30}
                />
                <div className="mt-2 text-xs">
                  {snChecking && (
                    <p className="text-gray-500">중복 확인 중...</p>
                  )}
                  {snDuplicated === true && (
                    <p className="text-red-500">이미 사용 중인 S/N 입니다.</p>
                  )}
                  {snDuplicated === false && (
                    <p className="text-green-600">사용 가능한 S/N 입니다.</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <Label>VPN IP</Label>
                <Input
                  type="text"
                  value={vpnIp}
                  onChange={handleVpnIpChange}
                  onBlur={handleVpnIpBlur}
                />
                <div className="mt-2 text-xs">
                  {vpnChecking && (
                    <p className="text-gray-500">중복 확인 중...</p>
                  )}
                  {vpnDuplicated === true && (
                    <p className="text-red-500">이미 사용중인 VPN IP 입니다.</p>
                  )}
                  {vpnDuplicated === false && (
                    <p className="text-green-600">사용 가능한 VPN IP 입니다.</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <Label>IMO</Label>
                <Input
                  type="text"
                  value={imo}
                  onChange={(e) => setImo(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <Label>Name</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <Label>Callsign</Label>
                <Input
                  type="text"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <Label>MMSI</Label>
                <Input
                  type="text"
                  value={mmsi}
                  onChange={(e) => setMmsi(e.target.value)}
                />
              </div>
            </form>
          </div>

          <div className="mt-4 flex items-center gap-3 px-2 sm:justify-end">
            <button
              onClick={handleAddVesselEvent}
              type="button"
              className="btn btn-success btn-update-event bg-brand-500 hover:bg-brand-600 flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white sm:w-auto"
              disabled={!canSubmit}
            >
              {adding ? "Adding..." : "Add Vessel"}
            </button>
            <button
              onClick={closeModal}
              type="button"
              className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              disabled={adding}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VesselComponentCard;
