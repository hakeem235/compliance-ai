import { Input } from "@/components/ui/input";

export default function AssistantPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <h1 className="mb-4 text-2xl font-semibold">AI Legal Assistant</h1>
      <div className="flex-1 overflow-y-auto rounded-lg border p-4 text-sm text-muted-foreground">
        Ask about a clause, a compliance obligation, or request a document summary. Responses are
        RAG-grounded and will cite their source — chat pipeline pending backend integration.
      </div>
      <form className="mt-4 flex gap-2">
        <Input placeholder="Ask ComplianceAI..." disabled />
      </form>
      <p className="mt-2 text-xs text-muted-foreground">
        ComplianceAI provides AI-assisted guidance and does not constitute legal advice. Consult a licensed
        attorney for legal decisions.
      </p>
    </div>
  );
}
