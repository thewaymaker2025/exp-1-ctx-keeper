import type { PlasmoCSConfig } from "plasmo"
import { generate } from "short-uuid"

import { Storage } from "@plasmohq/storage"

import {
  extractPreloadedConversations,
  getConversationMetadata
} from "~helpers/ai-page-extractors/chatgpt-extractor"
import { sendSmartSync } from "~helpers/api-requests"
import { conversationsWithHashes } from "~helpers/conversations"

const storage = new Storage()

export const config: PlasmoCSConfig = {
  matches: ["https://chatgpt.com/c/*"],
  all_frames: true
}

let currentUrl = location.href
let extractionTimeout: NodeJS.Timeout | null = null

// Generate or retrieve user ID
async function getOrCreateUserId(): Promise<string> {
  const existingUserId = await storage.get("ctx_keeper_user_id")

  if (existingUserId) {
    console.log("Retrieved existing user ID:", existingUserId)
    return existingUserId
  }

  const newUserId = generate()
  await storage.set("ctx_keeper_user_id", newUserId)
  console.log("Generated new user ID:", newUserId)
  return newUserId
}

// Extract session ID from URL
function getSessionId(): string | null {
  const match = location.href.match(
    /\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  )
  return match ? match[1] : null
}

// Check if current URL contains a valid UUID as the last parameter
function isValidChatSessionUrl(): boolean {
  const url = location.href
  const uuidRegex =
    /\/c\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(url)
}

async function extractAndLogConversation() {
  try {
    // Always get and store user ID and session ID, regardless of URL validity
    const userId = await getOrCreateUserId()
    const sessionId = getSessionId()

    console.log("Current URL:", location.href)
    console.log("User ID:", userId)
    console.log("Session ID:", sessionId)
    console.log("Is valid chat URL:", isValidChatSessionUrl())

    // Always store these basic values
    await storage.set("ctx_keeper_user_id", userId)
    await storage.set("ctx_keeper_session_id", sessionId)
    await storage.set("ctx_keeper_chat_session_url", location.href)

    if (!isValidChatSessionUrl()) {
      console.log(
        "⏭️ Skipping conversation extraction - not a valid chat session URL with UUID:",
        location.href
      )

      //   // Send basic data to popup even without conversations
      //   chrome.runtime
      //     .sendMessage({
      //       type: "CONVERSATIONS_WITH_HASHES",
      //       data: null,
      //       url: location.href,
      //       userId: userId,
      //       sessionId: sessionId
      //     })
      //     .catch(() => {
      //       // Popup might not be open, that's fine
      //     })

      return []
    }

    console.log("Extracting preloaded conversations from:", location.href)

    const metadata = getConversationMetadata()
    console.log("Conversation metadata:", metadata)

    // Extract preloaded conversations
    const conversationTurns = await extractPreloadedConversations()
    console.log("Extracted Preloaded Conversations:", conversationTurns)

    const _conversationsWithHashes = conversationsWithHashes(conversationTurns)
    console.log(`Extracted Conversations W Hashes: `, _conversationsWithHashes)

    // Send to backend API
    if (
      userId &&
      sessionId &&
      _conversationsWithHashes &&
      _conversationsWithHashes.length > 0
    ) {
      console.log("Sending data to backend...")
      await sendSmartSync(userId, sessionId, _conversationsWithHashes)
    }

    return conversationTurns
  } catch (error) {
    console.error("Failed to extract preloaded conversations:", error)
    return []
  }
}

// Debounced extraction to avoid too many calls
function scheduleExtraction() {
  if (extractionTimeout) {
    clearTimeout(extractionTimeout)
  }
  extractionTimeout = setTimeout(extractAndLogConversation, 1000) // Wait 1 second after changes stop
}

// Monitor URL changes for navigation between chat sessions
function monitorUrlChanges() {
  const observer = new MutationObserver(() => {
    if (location.href !== currentUrl) {
      console.log("URL changed from", currentUrl, "to", location.href)
      currentUrl = location.href
      scheduleExtraction()
    }
  })

  observer.observe(document, {
    subtree: true,
    childList: true
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

  // Initialize user ID on load
  await getOrCreateUserId()

  // Set up monitoring for navigation between chat sessions
  monitorUrlChanges()
  monitorHistoryChanges()

  // Initial extraction of preloaded conversations
  scheduleExtraction()
})
