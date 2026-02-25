import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import VesselDetailView from "@/components/vessel/VesselDetailView";
import WorldMap from "@/components/map/WorldMap";

interface VesselDetailPageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ imo?: string }>; // ✅ 쿼리 파라미터 타입 정의
}

export default async function VesselDetailPage({
  params,
  searchParams,
}: VesselDetailPageProps) {
  const { name } = await params;
  const { imo } = await searchParams;

  return (
    <div className="p-6">
      <PageBreadcrumb
        pageTitle={"Details"}
        prePage="Vessels"
        prePageLink="/vessels"
      />

      {imo ? (
        /* 1. items-start를 추가하여 자식들이 높이에 따라 늘어나지 않게 설정 */
        <div className="mt-6 flex flex-col items-start gap-6 lg:flex-row">
          {/* 좌측: VesselDetailView (50%) */}
          <div className="w-full lg:w-1/2">
            <VesselDetailView vesselImo={imo} />
          </div>

          {/* 우측: WorldMap (50%) */}
          {/* 2. h-fit을 추가하여 내용물만큼만 높이를 차지하게 함 */}
          <div className="h-fit w-full lg:w-1/2">
            {/* 지도 자체에 고정 높이가 있다면 그 높이만큼만 렌더링됩니다. */}
            <WorldMap />
          </div>
        </div>
      ) : (
        <div className="p-10 text-center text-red-500">
          Invalid Access: Vessel IMO is missing.
        </div>
      )}
    </div>
  );
}
