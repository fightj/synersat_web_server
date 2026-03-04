"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { ChevronDownIcon } from "@/icons";

interface PortForwardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: any;
  ruleId: number;
  imo: number | undefined; // 부모의 imo를 받음
  interfaces: any[]; // 부모의 interfaces 객체 배열을 받음
  onSuccess: () => void;
  currentRuleCount: number;
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

export default function PortForwardEditModal({
  isOpen,
  onClose,
  rule,
  ruleId,
  imo,
  interfaces,
  onSuccess,
  currentRuleCount,
}: PortForwardEditModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [ruleType, setRuleType] = useState("[User Rule]");
  const [pureDescr, setPureDescr] = useState("");

  const [srcAddrMode, setSrcAddrMode] = useState("any");
  const [srcPortMode, setSrcPortMode] = useState("any");
  const [dstPortMode, setDstPortMode] = useState("any");
  const [loading, setLoading] = useState(false);

  // 다크모드 대응 스타일
  const inputStyle =
    "dark:bg-gray-200 dark:text-gray-900 dark:border-gray-300 font-medium placeholder:text-gray-500";
  const labelStyle =
    "dark:text-white text-gray-800 font-bold mb-1.5 block text-sm";
  const sectionCardStyle =
    "bg-gray-50/50 dark:bg-white/[0.03] p-4 rounded-xl border border-gray-100 dark:border-white/[0.05]";

  // 부모에서 받은 interfaces 배열을 Select용 옵션으로 변환
  const interfaceOptions = useMemo(() => {
    return interfaces.map((iface) => ({
      value: iface.interfaceName,
      label: iface.description || iface.interfaceName,
    }));
  }, [interfaces]);

  useEffect(() => {
    if (rule && isOpen) {
      // 1. Description 파싱 (부모 리스트의 필드명 description 기준)
      const fullDescr = rule.description || "";
      if (fullDescr.startsWith("[System Rule]")) {
        setRuleType("[System Rule]");
        setPureDescr(fullDescr.replace("[System Rule]", "").trim());
      } else if (fullDescr.startsWith("[User Rule]")) {
        setRuleType("[User Rule]");
        setPureDescr(fullDescr.replace("[User Rule]", "").trim());
      } else {
        setRuleType("[User Rule]");
        setPureDescr(fullDescr);
      }

      // 2. 부모 리스트의 데이터 구조(DeviceNat 타입)를 formData 형식으로 로드
      const srcAddr = rule.sourceIp || "any";
      const srcPort = rule.sourcePort || "any";
      const dstPort = rule.destinationPort || "any";

      setFormData({
        interface: rule.interfaceName,
        protocol: rule.protocol?.toLowerCase() || "tcp",
        src: srcAddr === "any" ? "" : srcAddr,
        srcport: srcPort === "any" ? "" : srcPort,
        dst: rule.destinationIp || "(self)",
        dstport: dstPort === "any" ? "" : dstPort,
        target: rule.targetIp,
        "local-port": rule.targetPort,
      });

      setSrcAddrMode(srcAddr === "any" ? "any" : "other");
      setSrcPortMode(srcPort === "any" ? "any" : "other");
      setDstPortMode(dstPort === "any" ? "any" : "other");
    }
  }, [rule, isOpen]);

  const handleSubmit = async () => {
    setLoading(true);

    const finalDescr = `${ruleType} ${pureDescr}`.trim();

    // 기존 요구사항대로 vpnIp 자리에 부모의 imo를 넣어서 전송
    const payload = {
      vpnIp: imo,
      id: ruleId,
      ...formData,
      descr: finalDescr,
      src: srcAddrMode === "any" ? "any" : formData.src,
      srcport: srcPortMode === "any" ? "any" : formData.srcport,
      dstport: dstPortMode === "any" ? "any" : formData.dstport,
      apply: true,
    };

    try {
      const res = await fetch("/api/port_forward", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update Failed");
      onSuccess();
      onClose();
    } catch (err) {
      alert("수정 실패");
    } finally {
      setLoading(false);
    }
  };

  const RenderSelect = ({ options, defaultValue, onChange }: any) => (
    <div className="relative">
      <Select
        options={options}
        defaultValue={defaultValue}
        onChange={onChange}
        className={inputStyle}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 dark:text-gray-700">
        <ChevronDownIcon />
      </span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[750px] border p-8 shadow-2xl dark:border-white/10 dark:bg-[#121212]"
    >
      <div className="flex flex-col gap-6">
        <div className="border-b pb-4 dark:border-white/10">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Edit Rule #{ruleId}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 1. Interface & Protocol 섹션 */}
          <div className={`${sectionCardStyle} flex flex-col gap-4`}>
            <div className="space-y-1">
              <label className={labelStyle}>Interface</label>
              <RenderSelect
                options={interfaceOptions}
                defaultValue={formData.interface}
                onChange={(v: string) =>
                  setFormData({ ...formData, interface: v })
                }
              />
            </div>
            <div className="space-y-1">
              <label className={labelStyle}>Protocol</label>
              <RenderSelect
                options={PROTOCOL_OPTIONS}
                defaultValue={formData.protocol}
                onChange={(v: string) =>
                  setFormData({ ...formData, protocol: v })
                }
              />
            </div>
          </div>

          {/* 2. Source Info 섹션 */}
          <div className={`${sectionCardStyle} flex flex-col gap-4`}>
            <div className="space-y-1">
              <label className={labelStyle}>Source Address</label>
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
                    className={inputStyle}
                    value={formData.src ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, src: e.target.value })
                    }
                    placeholder="IP Address"
                  />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelStyle}>Source Port</label>
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
                    className={inputStyle}
                    value={formData.srcport ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, srcport: e.target.value })
                    }
                    placeholder="Port"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 3. External Dest 섹션 */}
          <div className={`${sectionCardStyle} space-y-4`}>
            <div className="space-y-1">
              <label className={labelStyle}>Destination IP</label>
              <Input
                className={`${inputStyle} opacity-60`}
                value={formData.dst ?? ""}
                disabled
              />
            </div>
            <div className="space-y-1">
              <label className={labelStyle}>Dest. Port</label>
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
                    className={inputStyle}
                    value={formData.dstport ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, dstport: e.target.value })
                    }
                    placeholder="Port"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 4. NAT Target 섹션 */}
          <div className={`${sectionCardStyle} space-y-4`}>
            <div className="space-y-1">
              <label className={labelStyle}>NAT IP</label>
              <Input
                className={inputStyle}
                value={formData.target ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, target: e.target.value })
                }
                placeholder="Internal IP"
              />
            </div>
            <div className="space-y-1">
              <label className={labelStyle}>NAT Port</label>
              <Input
                className={inputStyle}
                value={formData["local-port"] ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, "local-port": e.target.value })
                }
                placeholder="Internal Port"
              />
            </div>
          </div>
        </div>

        {/* 5. Description 섹션 */}
        <div className={`${sectionCardStyle}`}>
          <label className={labelStyle}>Description</label>
          <div className="flex gap-2">
            <div className="w-[160px] shrink-0">
              <RenderSelect
                options={RULE_TYPE_OPTIONS}
                defaultValue={ruleType}
                onChange={setRuleType}
              />
            </div>
            <Input
              className={inputStyle}
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
            onClick={onClose}
            className="px-6 dark:border-white/10 dark:text-gray-300 hover:dark:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 px-8 text-white shadow-lg hover:bg-blue-700 dark:bg-blue-500"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
