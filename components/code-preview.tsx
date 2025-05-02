"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Download, Copy, Check, Save } from "lucide-react"

// Define a simple formatter function in case the imported one fails
const simpleFormatCode = (code: string): string => {
  return code || ""
}

// Custom style for the highlighter to match the container
const customStyle = {
  margin: 0,
  padding: "1rem", // Add padding inside the code block
  height: "100%",
  overflow: "auto",
  backgroundColor: "#1a202c", // Match bg-gray-900
  fontSize: "0.875rem", // text-sm
  fontFamily: "monospace",
}

interface CodePreviewProps {
  html: string
  css: string
  js: string
  websiteTitle?: string
  onCodeUpdate?: (html: string, css: string, js: string) => void
  readOnly?: boolean
}

export function CodePreview({
  html,
  css,
  js,
  websiteTitle = "generated-website",
  onCodeUpdate,
  readOnly = false,
}: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState("html")
  const [isLoaded, setIsLoaded] = useState(false)
  const [editableHtml, setEditableHtml] = useState(html || "")
  const [editableCss, setEditableCss] = useState(css || "")
  const [editableJs, setEditableJs] = useState(js || "")
  const [copied, setCopied] = useState<"html" | "css" | "js" | null>(null)
  const [SyntaxHighlighter, setSyntaxHighlighter] = useState<any>(null)
  const [highlighterStyle, setHighlighterStyle] = useState<any>(null)
  const [loadError, setLoadError] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Set isLoaded to true after component mounts and try to load the syntax highlighter
  useEffect(() => {
    setIsLoaded(true)

    // Try to load the syntax highlighter
    const loadSyntaxHighlighter = async () => {
      try {
        const highlighterModule = await import("react-syntax-highlighter").then((mod) => mod.Prism)
        const styleModule = await import("react-syntax-highlighter/dist/esm/styles/prism").then(
          (mod) => mod.vscDarkPlus,
        )

        setSyntaxHighlighter(() => highlighterModule)
        setHighlighterStyle(styleModule)
      } catch (error) {
        console.error("Failed to load syntax highlighter:", error)
        setLoadError(true)
      }
    }

    loadSyntaxHighlighter()
  }, [])

  // Update editable code when props change
  useEffect(() => {
    if (html !== editableHtml && !hasUnsavedChanges) setEditableHtml(html || "")
    if (css !== editableCss && !hasUnsavedChanges) setEditableCss(css || "")
    if (js !== editableJs && !hasUnsavedChanges) setEditableJs(js || "")
  }, [html, css, js])

  // Format code when it changes
  useEffect(() => {
    try {
      // Try to import the formatters
      import("@/lib/code-formatter")
        .then((formatters) => {
          // Format HTML
          if (!isEditing) {
            setEditableHtml(formatters.formatHtml(html || ""))
            // Format CSS
            setEditableCss(formatters.formatCss(css || ""))
            // Format JS
            setEditableJs(formatters.formatJs(js || ""))
          }
        })
        .catch((err) => {
          console.error("Error loading formatters:", err)
          // Use simple formatter as fallback
          if (!isEditing) {
            setEditableHtml(simpleFormatCode(html))
            setEditableCss(simpleFormatCode(css))
            setEditableJs(simpleFormatCode(js))
          }
        })
    } catch (error) {
      console.error("Error formatting code:", error)
      // Use simple formatter as fallback
      if (!isEditing) {
        setEditableHtml(simpleFormatCode(html))
        setEditableCss(simpleFormatCode(css))
        setEditableJs(simpleFormatCode(js))
      }
    }
  }, [html, css, js, isEditing])

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = editableHtml !== html || editableCss !== css || editableJs !== js

    setHasUnsavedChanges(hasChanges)
  }, [editableHtml, editableCss, editableJs, html, css, js])

  // Handle saving code changes
  const handleSaveChanges = () => {
    if (onCodeUpdate) {
      onCodeUpdate(editableHtml, editableCss, editableJs)
      setHasUnsavedChanges(false)
    }
  }

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing)
  }

  // Fallback rendering when SyntaxHighlighter is not loaded yet
  const renderFallbackCode = (code: string) => (
    <pre className="p-4 bg-gray-900 text-gray-300 overflow-auto h-full text-sm font-mono whitespace-pre-wrap">
      {code || "// No code generated"}
    </pre>
  )

  // Render editable textarea
  const renderEditableCode = (
    code: string,
    setCode: React.Dispatch<React.SetStateAction<string>>,
    language: string,
  ) => (
    <textarea
      value={code}
      onChange={(e) => setCode(e.target.value)}
      className="w-full h-full p-4 bg-gray-900 text-gray-300 font-mono text-sm border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 resize-none"
      spellCheck="false"
      placeholder={`// Enter your ${language} code here`}
    />
  )

  // Function to create a downloadable file
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Function to download all files as a single HTML file
  const downloadAllFiles = () => {
    // Create a simple HTML file that includes the CSS and JS
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>${websiteTitle}</title>
 <style>
${editableCss || "/* No CSS */"}
 </style>
</head>
<body>
${editableHtml || "<!-- No HTML -->"}
<script>
${editableJs || "// No JavaScript"}
</script>
</body>
</html>`

    downloadFile(fullHtml, `${websiteTitle}.html`)
  }

  // Function to copy code to clipboard
  const copyToClipboard = async (code: string, type: "html" | "css" | "js") => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  // Get the current code based on active tab
  const getCurrentCode = () => {
    switch (activeTab) {
      case "html":
        return editableHtml
      case "css":
        return editableCss
      case "js":
        return editableJs
      default:
        return ""
    }
  }

  return (
    <div className="h-[600px] overflow-hidden flex flex-col bg-gray-900 text-white">
      <Tabs defaultValue="html" onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="bg-gray-900 border-b border-gray-800 w-full justify-start rounded-none p-0 flex-shrink-0">
          <TabsTrigger
            value="html"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400 rounded-none px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            HTML
          </TabsTrigger>
          <TabsTrigger
            value="css"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400 rounded-none px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            CSS
          </TabsTrigger>
          <TabsTrigger
            value="js"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400 rounded-none px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            JavaScript
          </TabsTrigger>
        </TabsList>

        {/* Export buttons */}
        <div className="bg-gray-800 p-2 border-b border-gray-700 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-gray-700 hover:bg-gray-600 text-xs"
            onClick={() => downloadFile(editableHtml || "", `${websiteTitle}.html`)}
          >
            HTML <Download className="ml-1 h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-gray-700 hover:bg-gray-600 text-xs"
            onClick={() => downloadFile(editableCss || "", `${websiteTitle}.css`)}
          >
            CSS <Download className="ml-1 h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-gray-700 hover:bg-gray-600 text-xs"
            onClick={() => downloadFile(editableJs || "", `${websiteTitle}.js`)}
          >
            JS <Download className="ml-1 h-3 w-3" />
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs ml-auto" onClick={downloadAllFiles}>
            Download All
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-gray-700 hover:bg-gray-600 text-xs"
            onClick={() => copyToClipboard(getCurrentCode(), activeTab as any)}
          >
            {copied === activeTab ? (
              <>
                Copied! <Check className="ml-1 h-3 w-3" />
              </>
            ) : (
              <>
                Copy <Copy className="ml-1 h-3 w-3" />
              </>
            )}
          </Button>

          {/* Only show edit/save buttons if onCodeUpdate is provided */}
          {onCodeUpdate && !readOnly && (
            <>
              <Button
                size="sm"
                variant="outline"
                className={`${isEditing ? "bg-emerald-600 text-white" : "bg-gray-700"} hover:bg-emerald-700 text-xs`}
                onClick={toggleEditMode}
              >
                {isEditing ? "Editing" : "Edit"}
              </Button>

              {hasUnsavedChanges && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={handleSaveChanges}>
                  <Save className="mr-1 h-3 w-3" />
                  Save Changes
                </Button>
              )}
            </>
          )}
        </div>

        {/* Use min-h-0 on content parent for flexbox growth */}
        <div className="flex-grow min-h-0">
          <TabsContent value="html" className="h-full p-0 m-0 overflow-auto focus:outline-none">
            {isEditing ? (
              renderEditableCode(editableHtml, setEditableHtml, "HTML")
            ) : isLoaded && SyntaxHighlighter && !loadError ? (
              <SyntaxHighlighter
                language="html"
                style={highlighterStyle}
                customStyle={customStyle}
                wrapLines={true}
                showLineNumbers={true}
                wrapLongLines={false}
              >
                {editableHtml || "<!-- No HTML generated -->"}
              </SyntaxHighlighter>
            ) : (
              renderFallbackCode(editableHtml || html || "<!-- No HTML generated -->")
            )}
          </TabsContent>

          <TabsContent value="css" className="h-full p-0 m-0 overflow-auto focus:outline-none">
            {isEditing ? (
              renderEditableCode(editableCss, setEditableCss, "CSS")
            ) : isLoaded && SyntaxHighlighter && !loadError ? (
              <SyntaxHighlighter
                language="css"
                style={highlighterStyle}
                customStyle={customStyle}
                wrapLines={true}
                showLineNumbers={true}
                wrapLongLines={false}
              >
                {editableCss || "/* No CSS generated */"}
              </SyntaxHighlighter>
            ) : (
              renderFallbackCode(editableCss || css || "/* No CSS generated */")
            )}
          </TabsContent>

          <TabsContent value="js" className="h-full p-0 m-0 overflow-auto focus:outline-none">
            {isEditing ? (
              renderEditableCode(editableJs, setEditableJs, "JavaScript")
            ) : isLoaded && SyntaxHighlighter && !loadError ? (
              <SyntaxHighlighter
                language="javascript"
                style={highlighterStyle}
                customStyle={customStyle}
                wrapLines={true}
                showLineNumbers={true}
                wrapLongLines={false}
              >
                {editableJs || "// No JavaScript generated"}
              </SyntaxHighlighter>
            ) : (
              renderFallbackCode(editableJs || js || "// No JavaScript generated")
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default CodePreview
