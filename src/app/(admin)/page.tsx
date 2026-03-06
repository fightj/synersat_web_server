import type { Metadata } from "next";
import React from "react";
// import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
// import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
// import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
// import StatisticsChart from "@/components/ecommerce/StatisticsChart";
// import RecentOrders from "@/components/ecommerce/RecentOrders";
// import DemographicCard from "@/components/ecommerce/DemographicCard";
// import WorldMap from "@/components/map/WorldMap";
import DashboardInfo from "@/components/dashboard/DashboardInfo";
import MainWorldMap from "@/components/map/MainWorldMap";

export const metadata: Metadata = {
  title: "SynerSAT Fleet Manager",
};

export default function Dashboard() {
  return (
    <>
      <MainWorldMap />
    </>
  );
}
