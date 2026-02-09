"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select"; // 경로에 맞춰 수정하세요
import Button from "@/components/ui/button/Button";

interface PortForwardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: any; // 현재 수정하려는 rule 데이터
  ruleId: number;
  vpnIp: string;
  interfaceOptions: { value: string; label: string }[];
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

export default function PortForwardEditModal({
  isOpen,
  onClose,
  rule,
  ruleId,
  vpnIp,
  interfaceOptions,
  onSuccess,
}: PortForwardEditModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // 모달이 열릴 때 선택된 rule 데이터를 폼에 세팅
  useEffect(() => {
    if (rule) {
      setFormData({
        interface: rule.interface,
        protocol: rule.protocol,
        src: rule.source?.address || "",
        srcport: rule.source?.port || "",
        dst: rule.destination?.network || "(self)",
        dstport: rule.destination?.port || "",
        target: rule.target,
        "local-port": rule["local-port"],
        descr: rule.descr,
      });
    }
  }, [rule]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/port_forward", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vpnIp,
          id: ruleId,
          ...formData,
        }),
      });

      if (!response.ok) throw new Error("수정에 실패했습니다.");

      onSuccess(); // 목록 새로고침 호출
      onClose(); // 모달 닫기
    } catch (error) {
      alert(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[1200px] p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-bold dark:text-white">
            Edit Port Forward Rule
          </h3>
          <p className="text-sm text-gray-500">
            수정할 규칙의 상세 정보를 입력하세요.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 1. Interface */}
          <div>
            <Label>Interface</Label>
            <Select
              options={interfaceOptions}
              value={formData.interface}
              onChange={(val) => setFormData({ ...formData, interface: val })}
            />
          </div>

          {/* 2. Protocol */}
          <div>
            <Label>Protocol</Label>
            <Select
              options={PROTOCOL_OPTIONS}
              value={formData.protocol}
              onChange={(val) => setFormData({ ...formData, protocol: val })}
            />
          </div>

          {/* 3. Source Address */}
          <div>
            <Label>Source Address</Label>
            <Input
              value={formData.src}
              onChange={(e) =>
                setFormData({ ...formData, src: e.target.value })
              }
              placeholder="any or IP address"
            />
          </div>

          {/* 4. Source Port */}
          <div>
            <Label>Source Port</Label>
            <Input
              value={formData.srcport}
              onChange={(e) =>
                setFormData({ ...formData, srcport: e.target.value })
              }
              placeholder="any or port"
            />
          </div>

          {/* 7. Destination (Read Only) */}
          <div>
            <Label>Destination (Fixed)</Label>
            <Input
              value={formData.dst}
              disabled
              className="bg-gray-100 dark:bg-gray-800"
            />
          </div>

          {/* 8. Destination Port */}
          <div>
            <Label>Destination Port</Label>
            <Input
              value={formData.dstport}
              onChange={(e) =>
                setFormData({ ...formData, dstport: e.target.value })
              }
            />
          </div>

          {/* 5. NAT IP (Target) */}
          <div>
            <Label>NAT IP (Internal IP)</Label>
            <Input
              value={formData.target}
              onChange={(e) =>
                setFormData({ ...formData, target: e.target.value })
              }
            />
          </div>

          {/* 6. NAT Port (Local-port) */}
          <div>
            <Label>NAT Port (Internal Port)</Label>
            <Input
              value={formData["local-port"]}
              onChange={(e) =>
                setFormData({ ...formData, "local-port": e.target.value })
              }
            />
          </div>
        </div>

        {/* 9. Description */}
        <div>
          <Label>Description</Label>
          <Input
            value={formData.descr}
            onChange={(e) =>
              setFormData({ ...formData, descr: e.target.value })
            }
          />
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
