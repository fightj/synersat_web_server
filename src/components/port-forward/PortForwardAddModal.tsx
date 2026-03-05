"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { ChevronDownIcon } from "@/icons";
import { addDeviceNat } from "@/api/firewall";
import { DeviceInterface } from "@/api/interfaces";
import {
  PROTOCOL_OPTIONS,
  ANY_OTHER_OPTIONS,
  RULE_TYPE_OPTIONS,
} from "./Constants";
import { portForwardModalStyles } from "./Styles";
interface PortForwardAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  imo: number | undefined;
  interfaces: DeviceInterface[];
  onSuccess: () => void;
  isSystem: string;
}

export default function PortForwardAddModal({
  isOpen,
  onClose,
  imo,
  interfaces,
  onSuccess,
  isSystem,
}: PortForwardAddModalProps) {
  const initialForm = {
    interfaceName: "wan",
    protocol: "tcp",
    sourceIp: "",
    sourcePort: "",
    destinationIp: "(self)",
    destinationPort: "",
    targetIp: "",
    targetPort: "",
  };

  const [formData, setFormData] = useState(initialForm);
  const [ruleType, setRuleType] = useState(`${isSystem}`);
  const [pureDescr, setPureDescr] = useState("");
  const [srcAddrMode, setSrcAddrMode] = useState("any");
  const [srcPortMode, setSrcPortMode] = useState("any");
  const [dstPortMode, setDstPortMode] = useState("any");
  const [loading, setLoading] = useState(false);

  const interfaceOptions = useMemo(() => {
    return interfaces.map((iface) => ({
      value: iface.interfaceName,
      label: iface.description || iface.interfaceName,
    }));
  }, [interfaces]);

  // Edit modal과 동일한 RenderSelect 헬퍼
  const RenderSelect = ({ options, defaultValue, onChange }: any) => (
    <div className="relative">
      <Select
        options={options}
        defaultValue={defaultValue}
        onChange={onChange}
        className={portForwardModalStyles.input}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 dark:text-gray-700">
        <ChevronDownIcon />
      </span>
    </div>
  );

  const handleSubmit = async () => {
    if (!imo) return;
    setLoading(true);

    const finalDescr = `${ruleType} ${pureDescr}`.trim();

    const payload = {
      imo: Number(imo),
      ...formData,
      description: finalDescr,
      sourceIp: srcAddrMode === "any" ? "any" : formData.sourceIp,
      sourcePort: srcPortMode === "any" ? "1-65535" : formData.sourcePort,
      destinationPort: dstPortMode === "any" ? "any" : formData.destinationPort,
      disabled: false,
      nordr: false,
      nosync: false,
      top: true,
      apply: true,
    };

    try {
      await addDeviceNat(payload);
      onSuccess();
      handleClose();
    } catch (err: any) {
      alert(`규칙 생성 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPureDescr("");
    setFormData(initialForm);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-[750px] border p-8 shadow-2xl dark:border-white/10 dark:bg-[#121212]"
    >
      <div className="flex flex-col gap-6">
        {/* Header — Edit modal과 동일한 구조 */}
        <div className="border-b pb-4 dark:border-white/10">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Add New Port Forward Rule
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 1. Interface & Protocol */}
          <div
            className={`${portForwardModalStyles.sectionCard} flex flex-col gap-4`}
          >
            <div className="space-y-1">
              <label className={portForwardModalStyles.label}>Interface</label>
              <RenderSelect
                options={interfaceOptions}
                defaultValue={formData.interfaceName}
                onChange={(v: string) =>
                  setFormData({ ...formData, interfaceName: v })
                }
              />
            </div>
            <div className="space-y-1">
              <label className={portForwardModalStyles.label}>Protocol</label>
              <RenderSelect
                options={PROTOCOL_OPTIONS}
                defaultValue={formData.protocol}
                onChange={(v: string) =>
                  setFormData({ ...formData, protocol: v })
                }
              />
            </div>
          </div>

          {/* 2. Source Info */}
          <div
            className={`${portForwardModalStyles.sectionCard} flex flex-col gap-4`}
          >
            <div className="space-y-1">
              <label className={portForwardModalStyles.label}>
                Source Address
              </label>
              <div className="flex gap-2">
                <div className="w-[100px] shrink-0">
                  <RenderSelect
                    options={ANY_OTHER_OPTIONS}
                    defaultValue={srcAddrMode}
                    onChange={setSrcAddrMode}
                  />
                </div>
                {srcAddrMode === "other" && (
                  <Input
                    className={portForwardModalStyles.input}
                    value={formData.sourceIp ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, sourceIp: e.target.value })
                    }
                    placeholder="IP Address"
                  />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className={portForwardModalStyles.label}>
                Source Port
              </label>
              <div className="flex gap-2">
                <div className="w-[100px] shrink-0">
                  <RenderSelect
                    options={ANY_OTHER_OPTIONS}
                    defaultValue={srcPortMode}
                    onChange={setSrcPortMode}
                  />
                </div>
                {srcPortMode === "other" && (
                  <Input
                    className={portForwardModalStyles.label}
                    value={formData.sourcePort ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, sourcePort: e.target.value })
                    }
                    placeholder="Port"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 3. External Dest */}
          <div className={`${portForwardModalStyles.sectionCard} space-y-4`}>
            <div className="space-y-1">
              <label className={portForwardModalStyles.label}>
                Destination IP
              </label>
              <Input
                className={`${portForwardModalStyles.input} opacity-60`}
                value={formData.destinationIp ?? ""}
                disabled
              />
            </div>
            <div className="space-y-1">
              <label className={portForwardModalStyles.label}>Dest. Port</label>
              <div className="flex gap-2">
                <div className="w-[100px] shrink-0">
                  <RenderSelect
                    options={ANY_OTHER_OPTIONS}
                    defaultValue={dstPortMode}
                    onChange={setDstPortMode}
                  />
                </div>
                {dstPortMode === "other" && (
                  <Input
                    className={portForwardModalStyles.input}
                    value={formData.destinationPort ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinationPort: e.target.value,
                      })
                    }
                    placeholder="Port"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 4. NAT Target */}
          <div className={`${portForwardModalStyles.sectionCard} space-y-4`}>
            <div className="space-y-1">
              <label className={portForwardModalStyles.label}>NAT IP</label>
              <Input
                className={portForwardModalStyles.input}
                value={formData.targetIp ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, targetIp: e.target.value })
                }
                placeholder="Internal IP"
              />
            </div>
            <div className="space-y-1">
              <label className={portForwardModalStyles.label}>NAT Port</label>
              <Input
                className={portForwardModalStyles.input}
                value={formData.targetPort ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, targetPort: e.target.value })
                }
                placeholder="Internal Port"
              />
            </div>
          </div>
        </div>

        {/* 5. Description */}
        <div className={`${portForwardModalStyles.sectionCard}`}>
          <label className={portForwardModalStyles.label}>Description</label>
          <div className="flex gap-2">
            <div className="w-[160px] shrink-0">
              <RenderSelect
                options={RULE_TYPE_OPTIONS}
                defaultValue={ruleType}
                onChange={setRuleType}
              />
            </div>
            <Input
              className={portForwardModalStyles.input}
              value={pureDescr ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPureDescr(e.target.value)
              }
              placeholder="Enter rule description..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-2 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="px-6 dark:border-white/10 dark:text-gray-300 hover:dark:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 px-8 text-white shadow-lg hover:bg-blue-700 dark:bg-blue-500"
          >
            {loading ? "Creating..." : "Create Rule"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
