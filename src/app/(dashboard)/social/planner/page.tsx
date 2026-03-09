import { Header } from "@/components/layout/Header";
import { ContentPlanner } from "@/components/social/ContentPlanner";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";

export default function ContentPlannerPage() {
  return (
    <>
      <Header
        title="AI Content Planner"
        subtitle="Competitor-informed, data-driven monthly content calendar"
        actions={<Button variant="secondary" size="sm" leftIcon={<Download size={13}/>}>Export Calendar</Button>}
      />
      <div className="mt-6">
        <ContentPlanner />
      </div>
    </>
  );
}
