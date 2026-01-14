import type { Metadata } from "next";
import React from "react";
// import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
// import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
// import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
// import StatisticsChart from "@/components/ecommerce/StatisticsChart";
// import RecentOrders from "@/components/ecommerce/RecentOrders";
// import DemographicCard from "@/components/ecommerce/DemographicCard";
import WorldMap from "@/components/map/WorldMap";
import DashboardInfo from "@/components/ecommerce/DashboardInfo";

export const metadata: Metadata = {
  title: "Synersat",
};

export default function Dashboard() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 h-[420px] space-y-6 md:h-[550px] xl:col-span-5">
        <DashboardInfo />
      </div>

      <div className="col-span-12 h-[420px] space-y-6 md:h-[550px] xl:col-span-7">
        <WorldMap />
      </div>

      {/* <div className="col-span-12">
        <StatisticsChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <DemographicCard />
      </div>

      <div className="col-span-12 xl:col-span-7">
        <RecentOrders />
      </div> */}
    </div>
  );
}
