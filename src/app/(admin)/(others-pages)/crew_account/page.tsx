import type { Metadata } from "next";
import CrewComponentCard from "@/components/crew/CrewComponentCard";

export const metadata: Metadata = {
  title: "SynerSAT Fleet Manager",
};

export default function ManageCrewAccountPage() {
  return <CrewComponentCard />;
}
