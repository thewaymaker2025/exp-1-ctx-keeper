import type { PlasmoCSConfig } from "plasmo"

import {
  extractPreloadedConversations,
  getConversationMetadata
} from "~helpers/page-extractors/chatgpt"

export const config: PlasmoCSConfig = {
  matches: ["https://chatgpt.com/*/*"],
  all_frames: true
}

let currentUrl = location.href
let extractionTimeout: NodeJS.Timeout | null = null
let isWaitingForResponse = false
let responseWatcher: NodeJS.Timeout | null = null

async function extractAndLogConversation() {
  try {
    console.log("Extracting conversation from:", location.href)

    // Get metadata first for debugging
    const metadata = getConversationMetadata()
    console.log("Conversation metadata:", metadata)

    // Extract preloaded conversations
    const conversationTurns = await extractPreloadedConversations()
    console.log("Extracted Conversation Turns:", conversationTurns)

    // Check if the last entry has a null assistant response
    const lastEntry = conversationTurns[conversationTurns.length - 1]
    if (lastEntry && lastEntry.assistant === null && !isWaitingForResponse) {
      console.log(
        "Detected user query without assistant response. Starting response watcher..."
      )
      startResponseWatcher()
    }

    return conversationTurns
  } catch (error) {
    console.error("Failed to extract conversation:", error)
    return []
  }
}

// Start watching for assistant response
function startResponseWatcher() {
  isWaitingForResponse = true

  // Primary Strategy: Watch for action buttons to appear (indicates response completion)
  const actionButtonObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        // Check if action buttons were added
        const addedNodes = Array.from(mutation.addedNodes)
        const hasActionButtons = addedNodes.some(
          (node) =>
            node instanceof Element &&
            (node.querySelector('[data-testid*="turn-action-button"]') ||
              node.matches('[data-testid*="turn-action-button"]'))
        )

        if (hasActionButtons) {
          console.log("🎯 Action buttons detected - streaming complete!")
          // Give a small delay for content to fully render after streaming stops
          setTimeout(async () => {
            console.log("📝 Extracting complete response...")
            await extractAndLogConversation()
          }, 800) // Slightly longer delay to ensure full content is rendered
        }
      }
    }
  })

  // Backup Strategy: Fallback polling with longer intervals (only as safety net)
  let pollCount = 0
  const maxPolls = 30 // Max 30 polls (2 minutes total)

  const safeguardPoll = () => {
    responseWatcher = setTimeout(async () => {
      pollCount++

      // Check if action buttons exist (streaming finished)
      const actionButtonsExist = document.querySelector(
        '[data-testid*="turn-action-button"]'
      )

      if (actionButtonsExist) {
        console.log("✅ Action buttons found via polling - response complete!")
        await extractAndLogConversation()
        stopResponseWatcher()
      } else if (pollCount >= maxPolls) {
        console.log("⏰ Max polling attempts reached - stopping watcher")
        stopResponseWatcher()
      } else {
        console.log(
          `⏳ Polling attempt ${pollCount}/${maxPolls} - waiting for streaming to complete...`
        )
        safeguardPoll() // Continue polling
      }
    }, 4000) // Poll every 4 seconds (less aggressive)
  }

  // Start both strategies
  actionButtonObserver.observe(document.body, {
    childList: true,
    subtree: true
  })

  // Start safeguard polling after a delay (give action button observer priority)
  setTimeout(safeguardPoll, 2000)

  // Store observer for cleanup
  ;(window as any).__responseObserver = actionButtonObserver

  console.log(
    "🔍 Response watcher started - waiting for action buttons to confirm streaming completion..."
  )
}

function stopResponseWatcher() {
  isWaitingForResponse = false

  if (responseWatcher) {
    clearTimeout(responseWatcher)
    responseWatcher = null
  }

  // Clean up action button observer
  const observer = (window as any).__responseObserver
  if (observer) {
    observer.disconnect()
    delete (window as any).__responseObserver
  }

  console.log("🛑 Response watcher stopped")
}

// Debounced extraction to avoid too many calls
function scheduleExtraction() {
  if (extractionTimeout) {
    clearTimeout(extractionTimeout)
  }
  extractionTimeout = setTimeout(extractAndLogConversation, 1000) // Wait 1 second after changes stop
}

// Monitor URL changes
function monitorUrlChanges() {
  const observer = new MutationObserver(() => {
    if (location.href !== currentUrl) {
      console.log("URL changed from", currentUrl, "to", location.href)
      currentUrl = location.href
      stopResponseWatcher() // Stop any existing watcher
      scheduleExtraction()
    }
  })

  observer.observe(document, {
    subtree: true,
    childList: true
  })

  return observer
}

// Monitor for new messages being sent
function monitorMessageSending() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        // Look for new article elements being added (new conversation turns)
        const addedNodes = Array.from(mutation.addedNodes)
        const hasNewArticle = addedNodes.some(
          (node) =>
            node instanceof Element &&
            (node.matches('article[data-testid*="conversation-turn"]') ||
              node.querySelector('article[data-testid*="conversation-turn"]'))
        )

        if (hasNewArticle && !isWaitingForResponse) {
          console.log(
            "🚀 New conversation turn detected - checking for pending response..."
          )
          // Small delay to let the DOM settle
          setTimeout(() => {
            scheduleExtraction()
          }, 500)
        }
      }
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  return observer
}

// Monitor pushState/replaceState for SPA navigation
function monitorHistoryChanges() {
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  history.pushState = function (...args) {
    originalPushState.apply(history, args)
    if (location.href !== currentUrl) {
      console.log("History pushState - URL changed to:", location.href)
      currentUrl = location.href
      scheduleExtraction()
    }
  }

  history.replaceState = function (...args) {
    originalReplaceState.apply(history, args)
    if (location.href !== currentUrl) {
      console.log("History replaceState - URL changed to:", location.href)
      currentUrl = location.href
      scheduleExtraction()
    }
  }
}

// Listen for popstate events (back/forward navigation)
window.addEventListener("popstate", () => {
  if (location.href !== currentUrl) {
    console.log("Popstate - URL changed to:", location.href)
    currentUrl = location.href
    scheduleExtraction()
  }
})

window.addEventListener("load", async () => {
  console.log(
    "You may find that having is not so pleasing a thing as wanting. This is not logical, but it is often true."
  )

  // Set up monitoring
  monitorUrlChanges()
  monitorHistoryChanges()
  monitorMessageSending()

  // Initial extraction
  scheduleExtraction()
})
