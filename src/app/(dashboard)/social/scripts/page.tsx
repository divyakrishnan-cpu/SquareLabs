import { Header } from "@/components/layout/Header";
import { ScriptCreator } from "@/components/social/ScriptCreator";

export default function ScriptsPage() {
  return (
    <>
      <Header
        title="Script Creator"
        subtitle="Generate reel scripts with AI-powered hooks, body, and captions"
      />
      <div className="mt-6">
        <ScriptCreator />
      </div>
    </>
  );
}
