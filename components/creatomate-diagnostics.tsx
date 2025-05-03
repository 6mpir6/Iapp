"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { debugCreatomateRequest } from "@/actions/creatomate-debug"
import { Loader2 } from "lucide-react"

export function CreatomateDiagnostics() {
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runDiagnostics = async () => {
    setIsLoading(true)
    try {
      const result = await debugCreatomateRequest()
      setDiagnosticResult(result)
    } catch (error) {
      setDiagnosticResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        clientError: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-4">
      <h3 className="text-lg font-medium">Creatomate API Diagnostics</h3>

      <Button onClick={runDiagnostics} disabled={isLoading} variant="outline">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running diagnostics...
          </>
        ) : (
          "Test Creatomate Connection"
        )}
      </Button>

      {diagnosticResult && (
        <div className="mt-4 p-4 rounded-md bg-gray-100 dark:bg-gray-700 overflow-auto max-h-96">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(diagnosticResult, null, 2)}</pre>
        </div>
      )}

      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>Common issues with Creatomate in production:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Missing or incorrect API key in environment variables</li>
          <li>Network restrictions or CORS issues in production environment</li>
          <li>Rate limiting or account restrictions</li>
          <li>Insufficient permissions for the API key</li>
          <li>Timeout issues with large video generation requests</li>
        </ul>
      </div>
    </div>
  )
}
