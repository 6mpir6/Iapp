"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"

interface StreamingCodeViewProps {
  html: string
  css: string
  js: string
  json?: string
  isGenerating: boolean
}

export function StreamingCodeView({ html, css, js, json, isGenerating }: StreamingCodeViewProps) {
  const [activeTab, setActiveTab] = useState("html")
  const htmlRef = useRef<HTMLPreElement>(null)
  const cssRef = useRef<HTMLPreElement>(null)
  const jsRef = useRef<HTMLPreElement>(null)
  const jsonRef = useRef<HTMLPreElement>(null)

  // Auto-scroll to bottom when code updates
  useEffect(() => {
    if (html && htmlRef.current) {
      htmlRef.current.scrollTop = htmlRef.current.scrollHeight
    }
    if (css && cssRef.current) {
      cssRef.current.scrollTop = cssRef.current.scrollHeight
    }
    if (js && jsRef.current) {
      jsRef.current.scrollTop = jsRef.current.scrollHeight
    }
    if (json && jsonRef.current) {
      jsonRef.current.scrollTop = jsonRef.current.scrollHeight
    }
  }, [html, css, js, json])

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-md overflow-hidden h-64">
      <Tabs defaultValue="html" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="bg-gray-900 border-b border-gray-700 w-full justify-start rounded-none p-0">
          <TabsTrigger
            value="html"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400 rounded-none px-4 py-2"
          >
            HTML
          </TabsTrigger>
          <TabsTrigger
            value="css"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400 rounded-none px-4 py-2"
          >
            CSS
          </TabsTrigger>
          <TabsTrigger
            value="js"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400 rounded-none px-4 py-2"
          >
            JavaScript
          </TabsTrigger>
          {json && (
            <TabsTrigger
              value="json"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400 rounded-none px-4 py-2"
            >
              JSON
            </TabsTrigger>
          )}
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="html" className="h-full p-0 m-0 overflow-auto">
            {isGenerating && !html ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : (
              <pre
                ref={htmlRef}
                className="p-4 text-gray-300 text-sm font-mono whitespace-pre-wrap h-full overflow-auto"
              >
                {html || "<!-- HTML will appear here as it's generated -->"}
              </pre>
            )}
          </TabsContent>

          <TabsContent value="css" className="h-full p-0 m-0 overflow-auto">
            {isGenerating && !css ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : (
              <pre
                ref={cssRef}
                className="p-4 text-gray-300 text-sm font-mono whitespace-pre-wrap h-full overflow-auto"
              >
                {css || "/* CSS will appear here as it's generated */"}
              </pre>
            )}
          </TabsContent>

          <TabsContent value="js" className="h-full p-0 m-0 overflow-auto">
            {isGenerating && !js ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : (
              <pre ref={jsRef} className="p-4 text-gray-300 text-sm font-mono whitespace-pre-wrap h-full overflow-auto">
                {js || "// JavaScript will appear here as it's generated"}
              </pre>
            )}
          </TabsContent>

          {json && (
            <TabsContent value="json" className="h-full p-0 m-0 overflow-auto">
              {isGenerating && !json ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : (
                <pre
                  ref={jsonRef}
                  className="p-4 text-gray-300 text-sm font-mono whitespace-pre-wrap h-full overflow-auto"
                >
                  {json || "// JSON will appear here as it's generated"}
                </pre>
              )}
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}
