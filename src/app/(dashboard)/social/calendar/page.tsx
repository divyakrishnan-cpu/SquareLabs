import { Header } from "@/components/layout/Header";
import { CalendarTable } from "@/components/social/CalendarTable";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

export default function CalendarPage() {
  return (
    <>
      <Header
        title="Content Calendar & Publishing"
        subtitle="Track, schedule, and publish all content across platforms"
        actions={<Button variant="brand" size="sm" leftIcon={<Plus size={13}/>}>Add Content</Button>}
      />
      <div className="mt-6">
        <CalendarTable />
      </div>
    </>
  );
}
