import {
  getOrCreateUserId,
  getSessionId,
  isValidChatSessionUrl,
  storage
} from "~utils"

import { sendSmartSync } from "./api"
import {
  batchMessagePairsByByteLength,
  conversationsWithHashes
} from "./conversations"
import {
  extractPreloadedConversations,
  getConversationMetadata
} from "./page-extractors/chatgpt"

export function monitorMessageSending(cb: () => void) {
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

        if (hasNewArticle) {
          console.log(
            "🚀 New conversation turn detected - checking for pending response..."
          )
          // Small delay to let the DOM settle
          setTimeout(() => {
            cb()
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

export async function extractAndLogConversation(
  shouldSendBatches: boolean = true
) {
  try {
    // Always get and store user ID and session ID, regardless of URL validity
    const userId = await getOrCreateUserId()
    const sessionId = getSessionId()

    // console.log("Current URL:", location.href)
    // console.log("User ID:", userId)
    // console.log("Session ID:", sessionId)
    // console.log("Is valid chat URL:", isValidChatSessionUrl())

    // Always store these basic values
    await storage.set("ctx_keeper_user_id", userId)
    await storage.set("ctx_keeper_session_id", sessionId)
    await storage.set("ctx_keeper_chat_session_url", location.href)

    if (!isValidChatSessionUrl()) {
      console.log(
        "⏭️ Skipping conversation extraction - not a valid chat session URL with UUID:",
        location.href
      )

      return []
    }

    // const metadata = getConversationMetadata()
    const conversationTurns = await extractPreloadedConversations()
    const _conversationsWithHashes = conversationsWithHashes(
      conversationTurns
    ).filter((conv) => !conv.assistant || conv.assistant !== null)
    const batchedMessages = batchMessagePairsByByteLength(
      _conversationsWithHashes
    )

    console.log("Batched Messages:", batchedMessages)

    // Send to backend API
    if (
      userId &&
      sessionId &&
      _conversationsWithHashes &&
      _conversationsWithHashes.length > 0
    ) {
      if (shouldSendBatches) {
        for (const batch of batchedMessages) {
          console.log("Sending data to backend...")
          await sendSmartSync(userId, sessionId, batch)
        }
      } else {
        console.log(`No batched messages sent.`)
      }
    }

    return batchedMessages
  } catch (error) {
    console.error("Failed to extract preloaded conversations:", error)
    return []
  }
}
