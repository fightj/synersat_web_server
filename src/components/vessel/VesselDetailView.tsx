"use client";

import React, { useEffect, useState } from "react";
import Loading from "../common/Loading";
import Badge from "../ui/badge/Badge";
import type { VesselDetail } from "@/types/vessel";

interface VesselDetailViewProps {
  vesselImo: string;
  vesselName: string;
}

const VesselDetailView: React.FC<VesselDetailViewProps> = ({
  vesselImo,
  vesselName,
}) => {
  const [data, setData] = useState<VesselDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // VesselDetailView.tsx 내부의 useEffect 로직
  useEffect(() => {
    const fetchVesselDetail = async () => {
      try {
        setLoading(true);

        // ✅ 클라이언트는 우리 Next.js 서버(Route Handler)에 IMO를 쿼리로 넘깁니다.
        const response = await fetch(`/api/vessels?vesselImo=${vesselImo}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "데이터 호출 실패");
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (vesselImo) {
      fetchVesselDetail();
    }
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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            {/* 선박 로고 (이미지가 없을 경우 대비) */}
            {/* <div className="h-16 w-16 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              {data.logo ? (
                <img
                  src={data.logo}
                  alt={data.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                  No Logo
                </div>
              )}
            </div> */}
            <div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                {data.name}
              </h3>
              <p className="text-sm text-gray-500">{data.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge color={data.status.available ? "success" : "error"}>
              {data.status.available ? "Online" : "Offline"}
            </Badge>
            <span className="text-sm text-gray-400">
              Last Connected:{" "}
              {new Date(data.status.lastConnectedAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 상세 정보 그리드 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 기본 사양 섹션 */}
        <DetailCard title="General Specifications">
          <DetailItem label="IMO Number" value={data.imo} />
          <DetailItem label="MMSI" value={data.mmsi} />
          <DetailItem label="Call Sign" value={data.callsign} />
          <DetailItem label="Vessel ID" value={data.id} />
        </DetailCard>

        {/* 네트워크 정보 섹션 */}
        <DetailCard title="Network Status">
          <DetailItem label="VPN IP" value={data.vpn_ip} />
          <DetailItem label="Current Route" value={data.status.currentRoute} />
          <DetailItem label="Manager" value={data.manager} />
          <DetailItem label="Mail" value={data.mailAddress} />
        </DetailCard>

        {/* 안테나/서비스 섹션 */}
        <DetailCard title="Service Info">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Service Name
            </span>
            <span
              className="rounded px-2 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: data.status.antennaServiceColor }}
            >
              {data.status.antennaServiceName}
            </span>
          </div>
          <DetailItem
            label="Antenna Status"
            value={data.status.available ? "Active" : "Inactive"}
          />
        </DetailCard>
      </div>
    </div>
  );
};

/* --- 보조 컴포넌트들 --- */

const DetailCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
    <h4 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
      {title}
    </h4>
    <div className="space-y-3">{children}</div>
  </div>
);

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
