"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import SelectWithIcon from "@/components/form/SelectWithIcon";
import {
  PROTOCOL_OPTIONS,
  ANY_OTHER_OPTIONS,
  RULE_TYPE_OPTIONS,
} from "./Constants";
import { portForwardModalStyles } from "./Styles";
import { updateDeviceNat } from "@/api/firewall";
import { DeviceNatRow } from "@/types/firewall";

interface PortForwardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: DeviceNatRow | null;
  ruleId: number;
  imo: number | undefined;
  interfaces: any[];
  onSuccess: () => void;
  currentRuleCount: number;
}

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

  const interfaceOptions = useMemo(() => {
    return interfaces.map((iface) => ({
      value: iface.interfaceName,
      label: iface.description || iface.interfaceName,
    }));
  }, [interfaces]);

  useEffect(() => {
    if (!rule || !isOpen) return;

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

    const srcAddr = rule.sourceIp || "any";
    const srcPort = rule.sourcePort || "any";
    const dstPort = rule.destinationPort || "any";

    setFormData({
      interface: rule.interfaceName,
      protocol: rule.protocol?.toLowerCase() || "tcp",
      src: srcAddr === "any" || srcAddr === "" ? "" : srcAddr,
      srcport: srcPort === "any" || srcPort === "" ? "" : srcPort,
      dst: rule.destinationIp || "(self)",
      dstport: dstPort === "any" || dstPort === "" ? "" : dstPort,
      target: rule.targetIp,
      "local-port": rule.targetPort,
    });

    setSrcAddrMode(srcAddr === "any" || srcAddr === "" ? "any" : "other");
    setSrcPortMode(srcPort === "any" || srcPort === "" ? "any" : "other");
    setDstPortMode(dstPort === "any" || dstPort === "" ? "any" : "other");
  }, [rule, isOpen]);

  const handleSubmit = async () => {
    if (!imo) return;
    setLoading(true);

    const finalDescr = `${ruleType} ${pureDescr}`.trim();

    try {
      const commandId = await updateDeviceNat({
        index: ruleId,
        currentRuleCount,
        imo: Number(imo),
        apply: true,
        description: finalDescr,
        disabled: rule?.disabled ?? false,
        destinationIp: formData.dst ?? "",
        destinationPort: dstPortMode === "any" ? "" : (formData.dstport ?? ""),
        targetIp: formData.target ?? "",
        targetPort: formData["local-port"] ?? "",
        sourceIp: srcAddrMode === "any" ? "" : (formData.src ?? ""),
        sourcePort: srcPortMode === "any" ? "1-65535" : formData.srcport,
        interfaceName: formData.interface ?? "",
        protocol: formData.protocol ?? "tcp",
        top: false,
      });
      console.log("Update queued, command id:", commandId);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || "수정 실패");
    } finally {
      setLoading(false);
    }
  };

  const RenderSelect = ({ options, defaultValue, onChange }: any) => (
    <SelectWithIcon
      options={options}
      defaultValue={defaultValue}
      onChange={onChange}
      className={portForwardModalStyles.input}
    />
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      // ✅ VesselFormModal과 동일한 구조
      className="relative max-h-[97vh] w-[95vw] max-w-[750px] overflow-hidden p-8 shadow-2xl dark:border-white/10 dark:bg-[#121212]"
    >
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-white/50 backdrop-blur-sm dark:bg-black/40">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Saving...
            </span>
          </div>
        </div>
      )}

      {/* ✅ flex-col + max-h로 내부 스크롤 처리 */}
      <div
        className={`flex max-h-[90vh] flex-col gap-6 ${loading ? "blur-sm" : ""}`}
      >
        {/* 헤더 - 고정 */}
        <div className="border-b pb-4 dark:border-white/10">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Edit Rule #{ruleId}
          </h3>
        </div>

        {/* ✅ 스크롤 영역 */}
        <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
          <div className="flex flex-col gap-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 1. Interface & Protocol */}
              <div
                className={`${portForwardModalStyles.sectionCard} flex flex-col gap-4`}
              >
                <div className="space-y-1">
                  <label className={portForwardModalStyles.label}>
                    Interface
                  </label>
                  <RenderSelect
                    options={interfaceOptions}
                    defaultValue={formData.interface}
                    onChange={(v: string) =>
                      setFormData({ ...formData, interface: v })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className={portForwardModalStyles.label}>
                    Protocol
                  </label>
                  <RenderSelect
                    options={PROTOCOL_OPTIONS}
                    defaultValue={formData.protocol}
                    onChange={(v: string) =>
                      setFormData({ ...formData, protocol: v })
                    }
                  />
                </div>
              </div>

              {/* 2. Source */}
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
                        className={portForwardModalStyles.input}
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

              {/* 3. Destination */}
              <div
                className={`${portForwardModalStyles.sectionCard} space-y-4`}
              >
                <div className="space-y-1">
                  <label className={portForwardModalStyles.label}>
                    Destination IP
                  </label>
                  <Input
                    className={`${portForwardModalStyles.input} opacity-60`}
                    value={formData.dst ?? ""}
                    disabled
                  />
                </div>
                <div className="space-y-1">
                  <label className={portForwardModalStyles.label}>
                    Dest. Port
                  </label>
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

              {/* 4. NAT Target */}
              <div
                className={`${portForwardModalStyles.sectionCard} space-y-4`}
              >
                <div className="space-y-1">
                  <label className={portForwardModalStyles.label}>NAT IP</label>
                  <Input
                    className={portForwardModalStyles.input}
                    value={formData.target ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, target: e.target.value })
                    }
                    placeholder="Internal IP"
                  />
                </div>
                <div className="space-y-1">
                  <label className={portForwardModalStyles.label}>
                    NAT Port
                  </label>
                  <Input
                    className={portForwardModalStyles.input}
                    value={formData["local-port"] ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, "local-port": e.target.value })
                    }
                    placeholder="Internal Port"
                  />
                </div>
              </div>
            </div>

            {/* 5. Description */}
            <div className={portForwardModalStyles.sectionCard}>
              <label className={portForwardModalStyles.label}>
                Description
              </label>
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
          </div>
        </div>

        {/* 하단 버튼 - 고정 */}
        <div className="mt-2 flex justify-end gap-3 border-t pt-6 dark:border-white/10">
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
