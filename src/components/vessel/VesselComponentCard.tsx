"use client";
import React, { useState, useEffect, useRef } from "react";
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
} from "@/api/vessel";

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

  // S/N 중복확인 상태
  const [serialNumber, setSerialNumber] = useState("");
  const lastCheckedSnRef = useRef<string>("");
  const [snChecking, setSnChecking] = useState(false);
  const [snDuplicated, setSnDuplicated] = useState<boolean | null>(null);

  // VPN IP 중복확인 상태 (✅ 추가)
  const [vpnIp, setVpnIp] = useState("");
  const lastCheckedVpnRef = useRef<string>("");
  const [vpnChecking, setVpnChecking] = useState(false);
  const [vpnDuplicated, setVpnDuplicated] = useState<boolean | null>(null);

  // Vessel Id 중복확인 상태
  const [vesselId, setVesselId] = useState("");
  const lastCheckedVesselIdRef = useRef<string>("");
  const [vesselIdChecking, setVesselIdChecking] = useState(false);
  const [vesselIdDuplicated, setVesselIdDuplicated] = useState<boolean | null>(
    null,
  );

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

  const handleSelectChange = (value: string) => {
    console.log("Selected value:", value);
  };

  // S/N blur 중복확인
  const handleSerialNumberBlur = async () => {
    const sn = serialNumber.trim();
    if (!sn) return;

    // ✅ 같은 값 재검사 방지(선택)
    if (lastCheckedSnRef.current === sn) return;
    lastCheckedSnRef.current = sn;

    try {
      setSnChecking(true);
      setSnDuplicated(null);

      const duplicated = await serialNumberDuplicate(sn);
      setSnDuplicated(duplicated);
      console.log("S/N 중복 여부:", duplicated);
    } catch (error) {
      console.log("s/n 중복확인 api 연동 실패", error);
      setSnDuplicated(null);
      // 실패했으니 다음 blur에서 다시 검사 가능하도록
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
      // 입력값이 바뀌면 lastChecked는 초기화(선택)
      lastCheckedSnRef.current = "";
    }
  };

  // VPN IP blur 중복확인 (✅ 추가)
  const handleVpnIpBlur = async () => {
    const ip = vpnIp.trim();
    if (!ip) return;

    // ✅ 같은 값 재검사 방지(선택)
    if (lastCheckedVpnRef.current === ip) return;
    lastCheckedVpnRef.current = ip;

    try {
      setVpnChecking(true);
      setVpnDuplicated(null);

      // vpnIpDuplicate가 boolean을 return한다고 가정 (true=중복, false=사용가능)
      const duplicated = await vpnIpDuplicate(ip);
      setVpnDuplicated(duplicated);

      console.log("VPN IP 중복 여부:", duplicated);
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

    // ✅ 길이 제한은 필요시 조절
    if (value.length <= 50) {
      setVpnIp(value);
      setVpnDuplicated(null);
      lastCheckedVpnRef.current = "";
    }
  };

  // Vessel ID blur 중복확인 (✅ 추가)
  const handleVesselIdBlur = async () => {
    const id = vesselId.trim();
    if (!id) return;

    // 같은 값 재검사 방지
    if (lastCheckedVesselIdRef.current === id) return;
    lastCheckedVesselIdRef.current = id;

    try {
      setVesselIdChecking(true);
      setVesselIdDuplicated(null);

      const duplicated = await VesselDuplicate(id); // ✅ api 호출
      setVesselIdDuplicated(duplicated);

      console.log("Vessel ID 중복 여부:", duplicated);
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

    // 길이 제한 필요하면 조절
    if (value.length <= 30) {
      setVesselId(value);
      setVesselIdDuplicated(null);
      lastCheckedVesselIdRef.current = "";
    }
  };

  const handleAddVesselEvent = () => {};

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
        className="max-w-[700px] p-6 lg:p-10"
      >
        <div className="custom-scrollbar flex flex-col overflow-y-auto px-2">
          <div>
            <p className="text-xl font-bold dark:text-gray-200">Add Vessel</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter the details for the new vessel.
            </p>
          </div>

          <div className="mt-8">
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

              {/* ---------------------------
                  S/N 입력 + 중복확인 UI
                 --------------------------- */}
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

              {/* ---------------------------
                  VPN IP 입력 + 중복확인 UI (✅ 추가)
                 --------------------------- */}
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
                <Input type="text" />
              </div>

              <div className="mb-4">
                <Label>Name</Label>
                <Input type="text" />
              </div>

              <div className="mb-4">
                <Label>Callsign</Label>
                <Input type="text" />
              </div>

              <div className="mb-4">
                <Label>MMSI</Label>
                <Input type="text" />
              </div>
            </form>
          </div>

          <div className="modal-footer mt-6 flex items-center gap-3 sm:justify-end">
            <button
              onClick={handleAddVesselEvent}
              type="button"
              className="btn btn-success btn-update-event bg-brand-500 hover:bg-brand-600 flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white sm:w-auto"
              disabled={snChecking || vpnChecking || vesselIdChecking}
            >
              Add Vessel
            </button>
            <button
              onClick={closeModal}
              type="button"
              className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
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
