import { CreatomateDiagnostics } from "@/components/creatomate-diagnostics"

export default function ApiDiagnosticsPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">API Diagnostics</h1>

      <div className="space-y-8">
        <CreatomateDiagnostics />

        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <h2 className="text-lg font-medium mb-4">Environment Variables Check</h2>
          <p className="text-sm mb-2">The following environment variables are required for Creatomate integration:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li className="text-sm">CREATOMATE_API_KEY: {process.env.CREATOMATE_API_KEY ? "✅ Set" : "❌ Not set"}</li>
            <li className="text-sm">ELEVENLABS_API_KEY: {process.env.ELEVENLABS_API_KEY ? "✅ Set" : "❌ Not set"}</li>
            <li className="text-sm">SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Not set"}</li>
            <li className="text-sm">
              SUPABASE_SERVICE_ROLE_KEY: {process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Set" : "❌ Not set"}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
