"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Check, Copy } from "lucide-react"

interface CodeExportProps {
  html: string
  css: string
  js: string
  websiteTitle?: string
}

export function CodeExport({ html, css, js, websiteTitle = "generated-website" }: CodeExportProps) {
  const [copied, setCopied] = useState<"html" | "css" | "js" | null>(null)

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

  // Function to download all files as a zip
  const downloadAllFiles = () => {
    // Create a simple HTML file that includes the CSS and JS
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${websiteTitle}</title>
  <style>
${css}
  </style>
</head>
<body>
${html}
<script>
${js}
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

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Export Code</h3>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs"
          onClick={() => downloadFile(html, `${websiteTitle}.html`)}
        >
          HTML <Download className="ml-1 h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-gray-700 hover:bg-gray-600 text-xs"
          onClick={() => downloadFile(css, `${websiteTitle}.css`)}
        >
          CSS <Download className="ml-1 h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-gray-700 hover:bg-gray-600 text-xs"
          onClick={() => downloadFile(js, `${websiteTitle}.js`)}
        >
          JS <Download className="ml-1 h-3 w-3" />
        </Button>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs ml-auto" onClick={downloadAllFiles}>
          Download All Files
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="bg-gray-700 hover:bg-gray-600 text-xs"
          onClick={() => copyToClipboard(html, "html")}
        >
          {copied === "html" ? (
            <>
              Copied! <Check className="ml-1 h-3 w-3" />
            </>
          ) : (
            <>
              Copy HTML <Copy className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-gray-700 hover:bg-gray-600 text-xs"
          onClick={() => copyToClipboard(css, "css")}
        >
          {copied === "css" ? (
            <>
              Copied! <Check className="ml-1 h-3 w-3" />
            </>
          ) : (
            <>
              Copy CSS <Copy className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-gray-700 hover:bg-gray-600 text-xs"
          onClick={() => copyToClipboard(js, "js")}
        >
          {copied === "js" ? (
            <>
              Copied! <Check className="ml-1 h-3 w-3" />
            </>
          ) : (
            <>
              Copy JS <Copy className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
