import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import VesselDetailView from "@/components/vessel/VesselDetailView";

interface VesselDetailPageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ imo?: string }>; // ✅ 쿼리 파라미터 타입 정의
}

export default async function VesselDetailPage({
  params,
  searchParams,
}: VesselDetailPageProps) {
  const { name } = await params;
  const { imo } = await searchParams; // ✅ imo 값 추출
  const decodedName = decodeURIComponent(name);

  return (
    <div className="p-6">
      <PageBreadcrumb
        pageTitle="Details"
        prePage="Vessels"
        prePageLink="/vessels"
      />

      {/* ✅ 상세 페이지 컴포넌트에 IMO 전달 */}
      {imo ? (
        <VesselDetailView vesselImo={imo} vesselName={decodedName} />
      ) : (
        <div className="p-10 text-center text-red-500">
          Invalid Access: Vessel IMO is missing.
        </div>
      )}
    </div>
  );
}
