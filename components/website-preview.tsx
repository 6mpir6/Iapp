"use client"

import type React from "react"

import { useMemo, useRef, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TextEditorModal } from "./text-editor-modal"

interface WebsitePreviewProps {
  html: string
  css: string
  js: string
  onEditImageRequest?: (imageId: string, imageUrl: string) => void
  onReplaceImageRequest?: (imageId: string, imageUrl: string, alt: string) => void
  onTextEdit?: (elementId: string, newText: string) => void
  onApplyTheme?: (css: string) => void
  iframeRef?: React.RefObject<HTMLIFrameElement>
}

interface StoredTextEdit {
  elementId: string
  newText: string
}

export function WebsitePreview({
  html,
  css,
  js,
  onEditImageRequest,
  onReplaceImageRequest,
  onTextEdit,
  onApplyTheme,
  iframeRef: externalIframeRef,
}: WebsitePreviewProps) {
  const internalIframeRef = useRef<HTMLIFrameElement>(null)
  const iframeRef = externalIframeRef || internalIframeRef
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Text editing state
  const [textEditorOpen, setTextEditorOpen] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  const [selectedElementId, setSelectedElementId] = useState("")
  const [selectedElementType, setSelectedElementType] = useState("Text")

  // Remove these lines:
  // const [storedTextEdits, setStoredTextEdits] = useState<StoredTextEdit[]>([])
  // const [hasUnappliedEdits, setHasUnappliedEdits] = useState(false)

  // Create a data URI containing the full HTML document
  const srcDoc = useMemo(() => {
    // Add custom script to handle image editing clicks and post message
    const imageEditingScript = onEditImageRequest
      ? `
document.addEventListener('DOMContentLoaded', function() {
  function addEditButtons() {
      // Remove existing buttons first to avoid duplicates on refresh
      document.querySelectorAll('.wcai-edit-btn-wrapper').forEach(wrapper => {
          const img = wrapper.querySelector('img');
          if (img && wrapper.parentNode) {
              wrapper.parentNode.replaceChild(img.cloneNode(true), wrapper);
          }
      });

      const images = document.querySelectorAll('img:not([data-wcai-processed])'); // Select only images not already processed
      images.forEach((img, index) => {
          if (!img.id) {
              img.id = 'wcai-img-' + (Date.now() + index); // Ensure unique ID
          }
          img.setAttribute('data-wcai-processed', 'true'); // Mark as processed

          // Ensure the image source is valid (might be base64)
          if (!img.src || (!img.src.startsWith('data:image') && !img.src.startsWith('http') && !img.src.startsWith('/'))) {
              console.warn('Skipping edit button for image with invalid src:', img.src);
              return;
          }

          // Create buttons container
          const buttonsContainer = document.createElement('div');
          buttonsContainer.style.position = 'absolute';
          buttonsContainer.style.top = '5px';
          buttonsContainer.style.right = '5px';
          buttonsContainer.style.display = 'flex';
          buttonsContainer.style.gap = '5px';
          buttonsContainer.style.zIndex = '1000';
          buttonsContainer.style.opacity = '0';
          buttonsContainer.style.transition = 'opacity 0.2s ease-in-out';

          // Create edit button
          const editBtn = document.createElement('button');
          editBtn.innerText = 'Edit';
          editBtn.style.background = 'rgba(16, 185, 129, 0.9)'; // Emerald color with opacity
          editBtn.style.color = 'white';
          editBtn.style.border = 'none';
          editBtn.style.borderRadius = '4px';
          editBtn.style.padding = '6px 12px';
          editBtn.style.fontSize = '12px';
          editBtn.style.cursor = 'pointer';
          editBtn.style.fontWeight = 'bold';
          editBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
          editBtn.setAttribute('data-wcai-edit-btn', 'true'); // Mark the button

          // Create replace button
          const replaceBtn = document.createElement('button');
          replaceBtn.innerText = 'Replace';
          replaceBtn.style.background = 'rgba(79, 70, 229, 0.9)'; // Indigo color with opacity
          replaceBtn.style.color = 'white';
          replaceBtn.style.border = 'none';
          replaceBtn.style.borderRadius = '4px';
          replaceBtn.style.padding = '6px 12px';
          replaceBtn.style.fontSize = '12px';
          replaceBtn.style.cursor = 'pointer';
          replaceBtn.style.fontWeight = 'bold';
          replaceBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
          replaceBtn.setAttribute('data-wcai-replace-btn', 'true'); // Mark the button

          // Add buttons to container
          buttonsContainer.appendChild(editBtn);
          buttonsContainer.appendChild(replaceBtn);

          // Create wrapper for positioning
          const wrapper = document.createElement('div');
          wrapper.style.position = 'relative';
          wrapper.style.display = 'inline-block'; // Important for positioning
          wrapper.classList.add('wcai-edit-btn-wrapper'); // Add class for easy removal

          // Show/hide buttons on hover
          wrapper.addEventListener('mouseenter', () => { buttonsContainer.style.opacity = '1'; });
          wrapper.addEventListener('mouseleave', () => { buttonsContainer.style.opacity = '0'; });

          // Handle edit button click
          editBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Edit button clicked for image:', img.id, img.src.substring(0, 50) + '...');
              window.parent.postMessage({
                  type: 'EDIT_IMAGE_REQUEST',
                  imageId: img.id,
                  imageUrl: img.src, // Send the current src (could be base64)
                  alt: img.alt || ''
              }, '*');
          });

          // Handle replace button click
          replaceBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Replace button clicked for image:', img.id, img.src.substring(0, 50) + '...');
              window.parent.postMessage({
                  type: 'REPLACE_IMAGE_REQUEST',
                  imageId: img.id,
                  imageUrl: img.src, // Send the current src (could be base64)
                  alt: img.alt || ''
              }, '*');
          });

          // Replace image with wrapper + image + buttons
          const parent = img.parentNode;
          if (parent && !parent.classList.contains('wcai-edit-btn-wrapper')) {
              img.insertAdjacentElement('beforebegin', wrapper);
              wrapper.appendChild(img); // Move image inside wrapper
              wrapper.appendChild(buttonsContainer);
          } else if (!parent) {
               console.warn('Image has no parent node:', img);
          } else {
               // Already wrapped, ensure buttons exist if somehow lost
               if (!wrapper.querySelector('[data-wcai-edit-btn="true"]')) {
                   wrapper.appendChild(buttonsContainer);
               }
          }
      });
  }

  // Initial run
  addEditButtons();

  // Optional: Use MutationObserver to re-apply if dynamic content is added
  const observer = new MutationObserver((mutations) => {
    let needsReapply = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
              // Check if added node is an image or contains images
              if (node.nodeName === 'IMG' || (node.querySelectorAll && node.querySelectorAll('img').length > 0)) {
                  needsReapply = true;
              }
          });
      }
    });
    if (needsReapply) {
       // Use setTimeout to debounce and avoid excessive calls
       setTimeout(addEditButtons, 100);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  
  // Report iframe height to parent for responsive container
  function reportHeight() {
    const height = document.body.scrollHeight;
    window.parent.postMessage({
      type: 'IFRAME_HEIGHT',
      height: height
    }, '*');
  }
  
  // Report height on load and on resize
  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);
});
`
      : ""

    // Add text editing functionality
    const textEditingScript = onTextEdit
      ? `
document.addEventListener('DOMContentLoaded', function() {
  // Add edit buttons to text elements
  function addTextEditButtons() {
    // Target common text elements
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div:not(.wcai-edit-btn-wrapper):not([class*="container"]):not([class*="wrapper"]), li, a, button');
    
    textElements.forEach((element, index) => {
      // Skip elements that are already processed or don't have text content
      if (element.getAttribute('data-wcai-text-processed') || !element.textContent.trim()) {
        return;
      }
      
      // Skip elements that contain other text elements (to avoid nesting issues)
      if (element.querySelector('h1, h2, h3, h4, h5, h6, p, span, li, a, button')) {
        return;
      }
      
      // Skip elements that are likely containers or have many children
      if (element.children.length > 3) {
        return;
      }
      
      // Assign an ID if it doesn't have one
      if (!element.id) {
        element.id = 'wcai-text-' + (Date.now() + index);
      }
      
      // Mark as processed
      element.setAttribute('data-wcai-text-processed', 'true');
      
      // Add edit functionality on double click
      element.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Double-clicked element:', element.id, element.textContent);
        
        // Send message to parent window with the CURRENT text content
        window.parent.postMessage({
          type: 'EDIT_TEXT_REQUEST',
          elementId: element.id,
          text: element.innerText || element.textContent,
          elementType: element.tagName.toLowerCase()
        }, '*');
      });
      
      // Add visual cue on hover
      element.addEventListener('mouseenter', () => {
        element.style.outline = '2px dashed rgba(16, 185, 129, 0.5)';
        element.style.cursor = 'pointer';
        
        // Add tooltip
        const tooltip = document.createElement('div');
        tooltip.textContent = 'Double-click to edit';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(16, 185, 129, 0.9)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '4px 8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '1000';
        tooltip.style.pointerEvents = 'none';
        tooltip.className = 'wcai-text-tooltip';
        
        // Position the tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.top = rect.top + window.scrollY - 30 + 'px';
        tooltip.style.left = rect.left + window.scrollX + 'px';
        
        document.body.appendChild(tooltip);
      });
      
      element.addEventListener('mouseleave', () => {
        element.style.outline = '';
        element.style.cursor = '';
        
        // Remove tooltip
        document.querySelectorAll('.wcai-text-tooltip').forEach(el => el.remove());
      });
    });
  }
  
  // Initial run
  addTextEditButtons();
  
  // Use MutationObserver to re-apply if dynamic content is added
  const textObserver = new MutationObserver((mutations) => {
    let needsReapply = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        needsReapply = true;
      }
    });
    if (needsReapply) {
      // Use setTimeout to debounce and avoid excessive calls
      setTimeout(addTextEditButtons, 100);
    }
  });
  
  textObserver.observe(document.body, { childList: true, subtree: true });
});
`
      : ""

    const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Website Preview</title>
        <style>
          /* Basic reset and styles */
          body { margin: 0; font-family: sans-serif; }
          /* Ensure wrappers don't break layout */
          .wcai-edit-btn-wrapper > img { display: block; max-width: 100%; height: auto; }
          /* Fix for base64 images */
          img[src^="data:"] { max-width: 100%; height: auto; display: block; }
          /* Fix for placeholder images */
          img[src^="/placeholder"] { max-width: 100%; height: auto; display: block; }
          /* Ensure all images are visible */
          img { max-width: 100%; height: auto; display: block; }
          /* Pexels images */
          .pexels-img { max-width: 100%; height: auto; display: block; }
          /* Highlight edited elements */
          .wcai-edited { outline: 2px solid rgba(16, 185, 129, 0.3); }
          ${css}
        </style>
      </head>
      <body>
        ${html}
        <script>${js}</script>
        ${onEditImageRequest ? `<script>${imageEditingScript}</script>` : ""}
        ${onTextEdit ? `<script>${textEditingScript}</script>` : ""}
      </body>
    </html>
  `
    return fullHtml
  }, [html, css, js, onEditImageRequest, onTextEdit])

  // Handle messages from the iframe requesting an image edit or replace
  useEffect(() => {
    if (!onEditImageRequest && !onReplaceImageRequest && !onTextEdit) return

    const handleMessage = (event: MessageEvent) => {
      // Handle edit image request
      if (event.data && event.data.type === "EDIT_IMAGE_REQUEST" && onEditImageRequest && iframeRef.current) {
        console.log("Received EDIT_IMAGE_REQUEST from iframe:", event.data)
        if (event.data.imageId && event.data.imageUrl) {
          onEditImageRequest(event.data.imageId, event.data.imageUrl)
        } else {
          console.error("Missing imageId or imageUrl in EDIT_IMAGE_REQUEST")
        }
      }

      // Handle replace image request
      if (event.data && event.data.type === "REPLACE_IMAGE_REQUEST" && onReplaceImageRequest && iframeRef.current) {
        console.log("Received REPLACE_IMAGE_REQUEST from iframe:", event.data)
        if (event.data.imageId && event.data.imageUrl) {
          onReplaceImageRequest(event.data.imageId, event.data.imageUrl, event.data.alt || "")
        } else {
          console.error("Missing imageId or imageUrl in REPLACE_IMAGE_REQUEST")
        }
      }

      // Handle text edit request
      if (event.data && event.data.type === "EDIT_TEXT_REQUEST" && onTextEdit && iframeRef.current) {
        console.log("Received EDIT_TEXT_REQUEST from iframe:", event.data)
        if (event.data.elementId && event.data.text !== undefined) {
          setSelectedElementId(event.data.elementId)
          setSelectedText(event.data.text)
          setSelectedElementType(event.data.elementType || "Text")
          setTextEditorOpen(true)
        } else {
          console.error("Missing elementId or text in EDIT_TEXT_REQUEST")
        }
      }

      // Handle iframe height updates
      if (event.data && event.data.type === "IFRAME_HEIGHT") {
        if (event.data.height && event.data.height > 200) {
          if (iframeRef.current) {
            iframeRef.current.style.height = `${event.data.height}px`
          }
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [onEditImageRequest, onReplaceImageRequest, onTextEdit, iframeRef])

  // Effect to update iframe content when srcDoc changes
  useEffect(() => {
    if (iframeRef.current) {
      setIsLoading(true)
      iframeRef.current.srcdoc = srcDoc
    }
  }, [srcDoc, iframeRef])

  // Handle iframe load event
  const handleIframeLoad = () => {
    setIsLoading(false)
    setIsRefreshing(false)
  }

  // Handle refresh button click
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsRefreshing(true)
      iframeRef.current.srcdoc = srcDoc

      // Reset stored edits when refreshing
      // setStoredTextEdits([])
      // setHasUnappliedEdits(false)
    }
  }

  // Handle text edit save - now applies the edit immediately
  const handleTextEditSave = (newText: string) => {
    if (selectedElementId && onTextEdit) {
      console.log(`Applying edited text for element ${selectedElementId}:`, newText)

      // Apply the edit immediately
      onTextEdit(selectedElementId, newText)

      // Show the edited text in the iframe (preview)
      if (iframeRef.current && iframeRef.current.contentDocument) {
        const element = iframeRef.current.contentDocument.getElementById(selectedElementId)
        if (element) {
          element.innerText = newText
        }
      }

      setTextEditorOpen(false)
    }
  }

  // Remove the `handleApplyEdits` function since we're applying edits immediately
  // const handleApplyEdits = () => {
  //   if (!onTextEdit || storedTextEdits.length === 0) return

  //   setIsUpdating(true)

  //   try {
  //     // Apply each stored edit
  //     storedTextEdits.forEach((edit) => {
  //       onTextEdit(edit.elementId, edit.newText)
  //     })

  //     // Clear stored edits
  //     setStoredTextEdits([])
  //     setHasUnappliedEdits(false)

  //     // Force a refresh of the preview after a short delay
  //     setTimeout(() => {
  //       if (iframeRef.current) {
  //         // First, clear the iframe
  //         iframeRef.current.srcdoc = ""

  //         // Then, after a short delay, set the updated content
  //         setTimeout(() => {
  //           if (iframeRef.current) {
  //             iframeRef.current.srcdoc = srcDoc
  //           }
  //         }, 100)
  //       }
  //     }, 100)
  //   } catch (error) {
  //     console.error("Error applying text edits:", error)
  //   } finally {
  //     setIsUpdating(false)
  //   }
  // }

  return (
    <div className="w-full h-[600px] bg-white border border-gray-300 dark:border-gray-700 rounded-md relative">
      {/* Buttons */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-1">Refresh</span>
        </Button>
      </div>

      {(isLoading || isRefreshing || isUpdating) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-900/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      <iframe
        ref={iframeRef}
        title="Website Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin" // allow-same-origin is needed for postMessage back to parent
        loading="lazy" // Defer loading
        onLoad={handleIframeLoad}
      />

      {/* Text Editor Modal */}
      <TextEditorModal
        isOpen={textEditorOpen}
        onClose={() => setTextEditorOpen(false)}
        onSave={handleTextEditSave}
        initialText={selectedText}
        elementType={selectedElementType}
      />

      {/* Remove this section:
      {hasUnappliedEdits && (
        <div className="absolute bottom-2 right-2 z-10 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full">
          {storedTextEdits.length} edit{storedTextEdits.length !== 1 ? "s" : ""} pending
        </div>
      )}
      */}
    </div>
  )
}
