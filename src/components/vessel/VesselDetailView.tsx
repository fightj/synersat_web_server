"use client";

import React, { useEffect, useState } from "react";
import Loading from "../common/Loading";
import type { VesselDetail } from "@/types/vessel";
import { getVesselDetail } from "@/api/vessel";

interface VesselDetailViewProps {
  vesselImo: string;
}

const VesselDetailView: React.FC<VesselDetailViewProps> = ({ vesselImo }) => {
  const [data, setData] = useState<VesselDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ 서비스별 색상을 결정하는 함수
  const getServiceBadgeStyles = (serviceName: string = "") => {
    const name = serviceName.toLowerCase();

    if (name.includes("starlink")) {
      return "bg-purple-600 text-white";
    }
    if (name.includes("vsat")) {
      return "bg-emerald-600 text-white";
    }

    // 그 외 기본: 밝은 회색
    return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  };

  useEffect(() => {
    const fetchVesselDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getVesselDetail(vesselImo);
        setData(result);
      } catch (err: any) {
        setError(err.message || "데이터 호출 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (vesselImo) fetchVesselDetail();
  }, [vesselImo]);

  if (loading)
    return (
      <div className="py-20">
        <Loading />
      </div>
    );
  if (error)
    return <div className="py-20 text-center text-red-500">{error}</div>;
  if (!data) return <div className="py-20 text-center">데이터가 없습니다.</div>;

  return (
    <div className="space-y-6">
      {/* 상단 헤더 카드 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-row items-center gap-3">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {data.name}
          </h3>

          {/* ✅ 헬퍼 함수를 적용한 서비스명 뱃지 */}
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase shadow-sm ${getServiceBadgeStyles(
              data.status?.antennaServiceName,
            )}`}
          >
            {data.status?.antennaServiceName || "N/A"}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{data.description}</p>
      </div>

      {/* 통합된 정보 카드 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
          Info
        </h4>

        <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
          <div className="space-y-4">
            <DetailItem label="IMO" value={data.imo} />
            <DetailItem label="MMSI" value={data.mmsi} />
            <DetailItem label="Call Sign" value={data.callsign} />
            <DetailItem label="Vessel ID" value={data.id} />
          </div>

          <div className="space-y-4">
            <DetailItem label="VPN IP" value={data.vpn_ip} />
            <DetailItem label="Manager" value={data.manager} />
            <DetailItem label="Mail" value={data.mailAddress} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- 보조 컴포넌트 생략 (기존과 동일) --- */
const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0 dark:border-white/[0.05]">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-sm font-medium text-gray-800 dark:text-white/90">
      {value || "-"}
    </span>
  </div>
);

export default VesselDetailView;
