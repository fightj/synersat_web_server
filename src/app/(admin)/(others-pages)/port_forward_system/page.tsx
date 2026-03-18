import PortForwardPageTemplate from "@/components/port-forward/PortForwardPageTemplate";

export default function PortForwardSystemPage() {
  return (
    <div className="space-y-6">
      <PortForwardPageTemplate
        ruleType="[System Rule]"
        pageTitle="Port Forward (System)"
      />
    </div>
  );
}
