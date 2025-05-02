"use client"

import type React from "react"

import { useMemo, useRef, useEffect, useState } from "react"
import { Loader2, Maximize2, Grid, Layers, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TextEditorModal } from "./text-editor-modal"

interface WebsitePreviewAdvancedProps {
  html: string
  css: string
  js: string
  interactiveElements?: string[]
  plan?: any
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

export function WebsitePreviewAdvanced({
  html,
  css,
  js,
  interactiveElements = [],
  plan,
  onEditImageRequest,
  onReplaceImageRequest,
  onTextEdit,
  onApplyTheme,
  iframeRef: externalIframeRef,
}: WebsitePreviewAdvancedProps) {
  const internalIframeRef = useRef<HTMLIFrameElement>(null)
  const iframeRef = externalIframeRef || internalIframeRef
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [iframeHeight, setIframeHeight] = useState(600)
  const [viewportSize, setViewportSize] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [activePage, setActivePage] = useState<string | null>(null)
  const [hasMultiplePages, setHasMultiplePages] = useState(false)

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
            wrapper.classList.add('wcai-edit-btn-wrapper'); // Ad  // Important for positioning
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
    
    // Also report height after any DOM changes
    const heightObserver = new MutationObserver(reportHeight);
    heightObserver.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Report active page to parent
    function reportActivePage() {
      // Check for data-page attribute on body or a .page-active class
      const activePage = document.querySelector('.page-active') || document.querySelector('[data-page-active="true"]');
      if (activePage && activePage.id) {
        window.parent.postMessage({
          type: 'ACTIVE_PAGE',
          pageId: activePage.id
        }, '*');
      }
    }

    // Check for active page on load and DOM changes
    window.addEventListener('load', reportActivePage);
    const pageObserver = new MutationObserver(reportActivePage);
    pageObserver.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true
    });

    // Check if the website has multiple pages
    function checkMultiplePages() {
      // Look for navigation links, page containers, or tabs
      const hasNavLinks = document.querySelectorAll('nav a, [data-page], .page, [role="tablist"]').length > 0;
      window.parent.postMessage({
        type: 'HAS_MULTIPLE_PAGES',
        hasMultiplePages: hasNavLinks
      }, '*');
    }

    // Check for multiple pages on load
    window.addEventListener('load', checkMultiplePages);
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
        
        // Send message to parent window
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

    // Add polyfills and enhanced features for better preview
    const enhancedFeatures = `
      // Polyfill for Intersection Observer if needed
      if (!('IntersectionObserver' in window)) {
        console.log('IntersectionObserver polyfill would be loaded here in production');
      }
      
      // Add support for external libraries referenced in the code
      function loadScript(src) {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      // Load common libraries if referenced in the code
      document.addEventListener('DOMContentLoaded', function() {
        const jsCode = ${JSON.stringify(js)};
        
        if (jsCode.includes('gsap') || jsCode.includes('ScrollTrigger')) {
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js');
        }
        
        if (jsCode.includes('swiper')) {
          loadScript('https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js');
          
          // Also load Swiper CSS
          const swiperCss = document.createElement('link');
          swiperCss.rel = 'stylesheet';
          swiperCss.href = 'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css';
          document.head.appendChild(swiperCss);
        }
        
        if (jsCode.includes('aos')) {
          loadScript('https://unpkg.com/aos@next/dist/aos.js');
          
          // Also load AOS CSS
          const aosCss = document.createElement('link');
          aosCss.rel = 'stylesheet';
          aosCss.href = 'https://unpkg.com/aos@next/dist/aos.css';
          document.head.appendChild(aosCss);
        }
      });

      // Add support for expandable content viewers
      document.addEventListener('DOMContentLoaded', function() {
        // Find all content viewers/cards with expandable class or data attribute
        const contentViewers = document.querySelectorAll('.expandable, [data-expandable="true"], .card, .content-card, .grid-item');
        
        contentViewers.forEach(viewer => {
          // Add click handler to open modal
          viewer.addEventListener('click', function(e) {
            // Don't open modal if clicking on a button or link
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || 
                e.target.closest('button') || e.target.closest('a')) {
              return;
            }
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'wcai-modal';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = '9999';
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s ease';
            
            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.className = 'wcai-modal-content';
            modalContent.style.backgroundColor = 'white';
            modalContent.style.borderRadius = '8px';
            modalContent.style.padding = '20px';
            modalContent.style.maxWidth = '90%';
            modalContent.style.maxHeight = '90%';
            modalContent.style.overflow = 'auto';
            modalContent.style.transform = 'scale(0.9)';
            modalContent.style.transition = 'transform 0.3s ease';
            
            // Clone the content
            const content = viewer.cloneNode(true);
            content.style.cursor = 'auto';
            content.style.transform = 'none';
            content.style.boxShadow = 'none';
            
            // Create close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '10px';
            closeBtn.style.right = '10px';
            closeBtn.style.backgroundColor = '#f44336';
            closeBtn.style.color = 'white';
            closeBtn.style.border = 'none';
            closeBtn.style.borderRadius = '50%';
            closeBtn.style.width = '30px';
            closeBtn.style.height = '30px';
            closeBtn.style.fontSize = '20px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.display = 'flex';
            closeBtn.style.alignItems = 'center';
            closeBtn.style.justifyContent = 'center';
            
            // Add close functionality
            closeBtn.addEventListener('click', function() {
              modalContent.style.transform = 'scale(0.9)';
              modal.style.opacity = '0';
              setTimeout(() => {
                document.body.removeChild(modal);
              }, 300);
            });
            
            // Add content and close button to modal
            modalContent.appendChild(content);
            modalContent.appendChild(closeBtn);
            modal.appendChild(modalContent);
            
            // Add modal to body
            document.body.appendChild(modal);
            
            // Trigger reflow and add active class
            setTimeout(() => {
              modal.style.opacity = '1';
              modalContent.style.transform = 'scale(1)';
            }, 10);
          });
          
          // Add visual cue that this is expandable
          viewer.style.cursor = 'pointer';
          viewer.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
          
          // Add hover effect
          viewer.addEventListener('mouseenter', function() {
            viewer.style.transform = 'translateY(-5px)';
            viewer.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
          });
          
          viewer.addEventListener('mouseleave', function() {
            viewer.style.transform = 'translateY(0)';
            viewer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          });
        });
      });
    `

    // Add Google Fonts if specified in the plan
    let googleFontsLink = ""
    if (plan && plan.typography) {
      const fonts = []
      if (plan.typography.headingFont && !plan.typography.headingFont.includes("system-ui")) {
        fonts.push(plan.typography.headingFont.replace(/\s+/g, "+"))
      }
      if (
        plan.typography.bodyFont &&
        !plan.typography.bodyFont.includes("system-ui") &&
        plan.typography.bodyFont !== plan.typography.headingFont
      ) {
        fonts.push(plan.typography.bodyFont.replace(/\s+/g, "+"))
      }

      if (fonts.length > 0) {
        googleFontsLink = `
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=${fonts.join("&family=")}&display=swap" rel="stylesheet">
        `
      }
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Website Preview</title>
          ${googleFontsLink}
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
          <script>${enhancedFeatures}</script>
          <script>${js}</script>
          ${onEditImageRequest ? `<script>${imageEditingScript}</script>` : ""}
          ${onTextEdit ? `<script>${textEditingScript}</script>` : ""}
        </body>
      </html>
    `
    return fullHtml
  }, [html, css, js, onEditImageRequest, onTextEdit, plan, interactiveElements])

  // Handle messages from the iframe
  useEffect(() => {
    if (!iframeRef.current) return

    const handleMessage = (event: MessageEvent) => {
      // Handle image edit requests
      if (event.data && event.data.type === "EDIT_IMAGE_REQUEST" && onEditImageRequest) {
        console.log("Received EDIT_IMAGE_REQUEST from iframe:", event.data)
        if (event.data.imageId && event.data.imageUrl) {
          onEditImageRequest(event.data.imageId, event.data.imageUrl)
        } else {
          console.error("Missing imageId or imageUrl in EDIT_IMAGE_REQUEST")
        }
      }

      // Handle replace image requests
      if (event.data && event.data.type === "REPLACE_IMAGE_REQUEST" && onReplaceImageRequest) {
        console.log("Received REPLACE_IMAGE_REQUEST from iframe:", event.data)
        if (event.data.imageId && event.data.imageUrl) {
          onReplaceImageRequest(event.data.imageId, event.data.imageUrl, event.data.alt || "")
        } else {
          console.error("Missing imageId or imageUrl in REPLACE_IMAGE_REQUEST")
        }
      }

      // Handle text edit requests
      if (event.data && event.data.type === "EDIT_TEXT_REQUEST" && onTextEdit) {
        console.log("Received EDIT_TEXT_REQUEST from iframe:", event.data)
        if (event.data.elementId && event.data.text) {
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
          setIframeHeight(event.data.height)
        }
      }

      // Handle active page updates
      if (event.data && event.data.type === "ACTIVE_PAGE") {
        if (event.data.pageId) {
          setActivePage(event.data.pageId)
        }
      }

      // Handle multiple pages detection
      if (event.data && event.data.type === "HAS_MULTIPLE_PAGES") {
        setHasMultiplePages(event.data.hasMultiplePages)
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

  // Get viewport width based on selected size
  const getViewportWidth = () => {
    switch (viewportSize) {
      case "mobile":
        return "375px"
      case "tablet":
        return "768px"
      case "desktop":
      default:
        return "100%"
    }
  }

  // Navigate to a specific page in the iframe
  const navigateToPage = (pageId: string) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return

    // Send a message to the iframe to navigate to the page
    iframeRef.current.contentWindow.postMessage(
      {
        type: "NAVIGATE_TO_PAGE",
        pageId,
      },
      "*",
    )

    // Also try to click on any navigation links that might lead to that page
    const iframeDocument = iframeRef.current.contentDocument
    if (iframeDocument) {
      // Try different selectors that might be used for navigation
      const navLink =
        iframeDocument.querySelector(`a[href="#${pageId}"]`) ||
        iframeDocument.querySelector(`[data-page="${pageId}"]`) ||
        iframeDocument.querySelector(`#${pageId}-tab`) ||
        iframeDocument.querySelector(`[data-target="#${pageId}"]`)

      if (navLink && navLink instanceof HTMLElement) {
        navLink.click()
      }
    }
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
    <div className="flex flex-col w-full">
      {/* Viewport size selector and refresh button */}
      <div className="flex justify-between mb-2 gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewportSize("mobile")}
            className={`px-3 py-1 text-xs rounded ${
              viewportSize === "mobile"
                ? "bg-emerald-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Mobile
          </button>
          <button
            onClick={() => setViewportSize("tablet")}
            className={`px-3 py-1 text-xs rounded ${
              viewportSize === "tablet"
                ? "bg-emerald-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Tablet
          </button>
          <button
            onClick={() => setViewportSize("desktop")}
            className={`px-3 py-1 text-xs rounded ${
              viewportSize === "desktop"
                ? "bg-emerald-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Desktop
          </button>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Page navigation if we have multiple pages */}
      {hasMultiplePages && plan && plan.pages && (
        <div className="flex mb-2 gap-2 overflow-x-auto pb-2">
          {plan.pages.map((page: any) => (
            <button
              key={page.id}
              onClick={() => navigateToPage(page.id)}
              className={`px-3 py-1 text-sm rounded whitespace-nowrap ${
                activePage === page.id
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {page.name}
            </button>
          ))}
        </div>
      )}

      {/* Preview container */}
      <div
        className="w-full bg-white border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden transition-all duration-300 relative"
        style={{
          height: `${iframeHeight + 20}px`, // Add a little extra space
          maxHeight: "80vh",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {(isLoading || isRefreshing || isUpdating) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        )}

        <iframe
          ref={iframeRef}
          title="Website Preview"
          className="border-0 transition-all duration-300"
          style={{
            width: getViewportWidth(),
            height: "100%",
            maxHeight: "100%",
          }}
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
          onLoad={handleIframeLoad}
        />

        {/* Edit count badge */}
        {/* Remove this section:
        {hasUnappliedEdits && (
          <div className="absolute bottom-2 right-2 z-10 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full">
            {storedTextEdits.length} edit{storedTextEdits.length !== 1 ? "s" : ""} pending
          </div>
        )}
        */}
      </div>

      {/* Text Editor Modal */}
      <TextEditorModal
        isOpen={textEditorOpen}
        onClose={() => setTextEditorOpen(false)}
        onSave={handleTextEditSave}
        initialText={selectedText}
        elementType={selectedElementType}
      />

      {/* Interactive elements list */}
      {interactiveElements && interactiveElements.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
          <h3 className="text-sm font-medium mb-2 text-emerald-400 flex items-center">
            <Maximize2 className="h-4 w-4 mr-2" />
            Interactive Elements:
          </h3>
          <ul className="list-disc pl-5 text-xs text-gray-300 space-y-1">
            {interactiveElements.map((element, index) => (
              <li key={index}>{element}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Multi-page structure info */}
      {hasMultiplePages && plan && plan.pages && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
          <h3 className="text-sm font-medium mb-2 text-emerald-400 flex items-center">
            <Layers className="h-4 w-4 mr-2" />
            Multi-Page Structure:
          </h3>
          <ul className="list-disc pl-5 text-xs text-gray-300 space-y-1">
            {plan.pages.map((page: any) => (
              <li key={page.id}>
                <strong>{page.name}</strong>: {page.sections?.length || 0} sections
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid layout info */}
      {plan && plan.layout === "grid" && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
          <h3 className="text-sm font-medium mb-2 text-emerald-400 flex items-center">
            <Grid className="h-4 w-4 mr-2" />
            Grid Layout:
          </h3>
          <p className="text-xs text-gray-300">
            This website uses a grid layout for content display. Click on grid items to expand them into full-sized
            popups.
          </p>
        </div>
      )}
    </div>
  )
}
