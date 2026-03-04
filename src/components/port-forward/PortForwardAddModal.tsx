"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { ChevronDownIcon } from "@/icons";
import { addDeviceNat } from "@/api/firewall";
import { DeviceInterface } from "@/api/interfaces";

interface PortForwardAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  imo: number | undefined;
  interfaces: DeviceInterface[];
  onSuccess: () => void;
}

const PROTOCOL_OPTIONS = [
  { value: "tcp", label: "TCP" },
  { value: "udp", label: "UDP" },
  { value: "tcp/udp", label: "TCP/UDP" },
  { value: "icmp", label: "ICMP" },
  { value: "esp", label: "ESP" },
  { value: "ah", label: "AH" },
  { value: "gre", label: "GRE" },
  { value: "ipv6", label: "IPV6" },
  { value: "igmp", label: "IGMP" },
  { value: "pim", label: "PIM" },
  { value: "ospf", label: "OSPF" },
];

const ANY_OTHER_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "other", label: "Other" },
];

const RULE_TYPE_OPTIONS = [
  { value: "[System Rule]", label: "[System Rule]" },
  { value: "[User Rule]", label: "[User Rule]" },
];

export default function PortForwardAddModal({
  isOpen,
  onClose,
  imo,
  interfaces,
  onSuccess,
}: PortForwardAddModalProps) {
  // 초기 상태 필드명을 API 요구사항과 일치시킴
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
  const [ruleType, setRuleType] = useState("[User Rule]");
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

  const inputStyle =
    "dark:bg-white/[0.05] dark:text-white dark:border-white/10 font-medium placeholder:text-gray-500 focus:dark:border-blue-500/50";
  const labelStyle =
    "dark:text-gray-300 text-gray-800 font-bold mb-1.5 block text-xs uppercase tracking-wider";
  const sectionCardStyle =
    "bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-white/[0.05]";

  const handleSubmit = async () => {
    if (!imo) return;
    setLoading(true);

    const finalDescr = `${ruleType} ${pureDescr}`.trim();

    const payload = {
      imo: Number(imo),
      ...formData,
      description: finalDescr,
      // 모드에 따른 실제 값 할당 로직
      sourceIp: srcAddrMode === "any" ? "any" : formData.sourceIp,
      sourcePort: srcPortMode === "any" ? "1-65535" : formData.sourcePort,
      destinationPort: dstPortMode === "any" ? "any" : formData.destinationPort,
      disabled: false, // 생성 시 기본 활성화라면 false, 비활성화라면 true
      // natreflection: null,
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
      className="max-w-[750px] overflow-hidden border-none p-0 shadow-2xl dark:bg-[#1c1c1e]"
    >
      <div className="flex flex-col">
        <div className="border-b bg-gray-50 px-8 py-6 dark:border-white/5 dark:bg-white/[0.03]">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Add New Port Forward Rule
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Configure network redirection for IMO: {imo}
          </p>
        </div>

        <div className="flex flex-col gap-6 p-8">
          <div className="grid grid-cols-2 gap-4">
            {/* 1. Interface & Protocol */}
            <div className={`${sectionCardStyle} flex flex-col gap-4`}>
              <div className="space-y-1">
                <label className={labelStyle}>Interface</label>
                <Select
                  options={interfaceOptions}
                  value={formData.interfaceName} // defaultValue 대신 value 사용 권장
                  onChange={(v: string) =>
                    setFormData({ ...formData, interfaceName: v })
                  }
                  className={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Protocol</label>
                <Select
                  options={PROTOCOL_OPTIONS}
                  value={formData.protocol}
                  onChange={(v: string) =>
                    setFormData({ ...formData, protocol: v })
                  }
                  className={inputStyle}
                />
              </div>
            </div>

            {/* 2. Source Info */}
            <div className={`${sectionCardStyle} flex flex-col gap-4`}>
              <div className="space-y-1">
                <label className={labelStyle}>Source Address</label>
                <div className="flex gap-2">
                  <Select
                    options={ANY_OTHER_OPTIONS}
                    value={srcAddrMode}
                    onChange={setSrcAddrMode}
                    className={`${inputStyle} w-[100px]`}
                  />
                  {srcAddrMode === "other" && (
                    <Input
                      className={inputStyle}
                      value={formData.sourceIp || ""} // || "" 를 붙여 undefined 방지
                      onChange={(e) =>
                        setFormData({ ...formData, sourceIp: e.target.value })
                      }
                      placeholder="IP (e.g. 1.1.1.1)"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Source Port</label>
                <div className="flex gap-2">
                  <Select
                    options={ANY_OTHER_OPTIONS}
                    value={srcPortMode}
                    onChange={setSrcPortMode}
                    className={`${inputStyle} w-[100px]`}
                  />
                  {srcPortMode === "other" && (
                    <Input
                      className={inputStyle}
                      value={formData.sourcePort || ""}
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
            <div className={`${sectionCardStyle} space-y-4`}>
              <div className="space-y-1">
                <label className={labelStyle}>Destination IP</label>
                <Input
                  className={`${inputStyle} cursor-not-allowed bg-gray-100 opacity-50`}
                  value={formData.destinationIp || ""}
                  disabled
                />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Dest. Port</label>
                <div className="flex gap-2">
                  <Select
                    options={ANY_OTHER_OPTIONS}
                    value={dstPortMode}
                    onChange={setDstPortMode}
                    className={`${inputStyle} w-[100px]`}
                  />
                  {dstPortMode === "other" && (
                    <Input
                      className={inputStyle}
                      value={formData.destinationPort || ""}
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
            <div className={`${sectionCardStyle} space-y-4`}>
              <div className="space-y-1">
                <label className={labelStyle}>NAT IP (Target)</label>
                <Input
                  className={inputStyle}
                  value={formData.targetIp || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, targetIp: e.target.value })
                  }
                  placeholder="Internal IP"
                />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>NAT Port (Local)</label>
                <Input
                  className={inputStyle}
                  value={formData.targetPort || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, targetPort: e.target.value })
                  }
                  placeholder="Internal Port"
                />
              </div>
            </div>
          </div>

          {/* 5. Description */}
          <div className={`${sectionCardStyle}`}>
            <label className={labelStyle}>Description</label>
            <div className="flex gap-2">
              <Select
                options={RULE_TYPE_OPTIONS}
                value={ruleType}
                onChange={setRuleType}
                className={`${inputStyle} w-[160px]`}
              />
              <Input
                className={inputStyle}
                value={pureDescr || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPureDescr(e.target.value)
                }
                placeholder="Enter rule description..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex justify-end gap-3 border-t pt-6 dark:border-white/5">
            <Button
              variant="outline"
              onClick={handleClose}
              className="px-6 dark:border-white/10 dark:text-gray-400 hover:dark:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 px-10 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
