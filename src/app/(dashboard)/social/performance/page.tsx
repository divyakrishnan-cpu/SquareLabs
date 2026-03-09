import { Header } from "@/components/layout/Header";
import { PerformanceDashboard } from "@/components/social/PerformanceDashboard";

export default function SocialPerformancePage() {
  return (
    <>
      <Header
        title="Social Media Performance"
        subtitle="Analytics across all verticals and platforms"
      />
      <div className="mt-6">
        <PerformanceDashboard />
      </div>
    </>
  );
}
