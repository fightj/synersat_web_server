"use client";
import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "../form/Select";
import { getAccounts, serialNumberDuplicate } from "@/api/vessel";

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
  const [serialNumber, setSerialNumber] = useState("");

  // ✅ 중복 호출 방지용
  const lastCheckedRef = useRef<string>("");

  // ✅ 상태(선택)
  const [snChecking, setSnChecking] = useState(false);
  const [snDuplicated, setSnDuplicated] = useState<boolean | null>(null);

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

  const handleSerialNumberBlur = async () => {
    const sn = serialNumber.trim();
    if (!sn) return;

    try {
      setSnChecking(true);
      setSnDuplicated(null);

      const duplicated = await serialNumberDuplicate(sn);
      setSnDuplicated(duplicated);

      console.log("중복 여부:", duplicated);
    } catch (error) {
      console.log("s/n 중복확인 api 연동 실패", error);
      setSnDuplicated(null);
    } finally {
      setSnChecking(false);
    }
  };

  const handleSerialNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 30) {
      setSerialNumber(value);
      // ✅ 입력 바뀌면 중복 결과 초기화
      setSnDuplicated(null);
      // ✅ lastCheckedRef는 유지해도 되지만, 바뀌면 어차피 blur에서 다른 값으로 호출됨
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
                <Input type="text" />
              </div>

              <div className="mb-4">
                <Label>S/N</Label>
                <Input
                  type="text"
                  value={serialNumber}
                  onChange={handleSerialNumberChange}
                  onBlur={handleSerialNumberBlur} // ✅ 이제 동작함
                  maxLength={30}
                />
                {/* ✅ 확인용 UI (선택) */}
                <div className="mt-2 text-xs">
                  {snChecking && (
                    <p className="mt-2 text-xs text-gray-500">
                      중복 확인 중...
                    </p>
                  )}
                  {snDuplicated === true && (
                    <p className="mt-2 text-xs text-red-500">
                      이미 사용 중인 S/N 입니다.
                    </p>
                  )}
                  {snDuplicated === false && (
                    <p className="mt-2 text-xs text-green-600">
                      사용 가능한 S/N 입니다.
                    </p>
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
              disabled={snChecking}
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
