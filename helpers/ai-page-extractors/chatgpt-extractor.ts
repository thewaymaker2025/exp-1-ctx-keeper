import retry from "async-retry"

import { CHATGPT_PAGE_SELECTOR_PATH } from "~constant/page-extractor"

/**
 * Wait for the conversation container to be ready
 */
async function waitForConversationContainer(): Promise<Element> {
  return await retry(
    async () => {
      const container = document.querySelector(
        CHATGPT_PAGE_SELECTOR_PATH.conversation_container
      )

      if (!container) {
        throw new Error("Conversation container not found")
      }

      // Check if there are any conversation turns loaded
      const turns = container.querySelectorAll(
        CHATGPT_PAGE_SELECTOR_PATH.all_messages
      )

      if (turns.length === 0) {
        throw new Error("No conversation turns found yet")
      }

      return container
    },
    {
      retries: 10,
      minTimeout: 500,
      maxTimeout: 2000,
      onRetry: (err, attempt) => {
        console.log(
          `Waiting for ChatGPT conversation to load... (attempt ${attempt})`
        )
      }
    }
  )
}

/**
 * Get all conversation turns from the page
 */
function getAllConversationTurns(): Element[] {
  return Array.from(
    document.querySelectorAll(CHATGPT_PAGE_SELECTOR_PATH.all_messages)
  )
}

/**
 * Extract all preloaded conversations from the current ChatGPT session
 * Only processes completed conversations (with action buttons present)
 */
export async function extractPreloadedConversations(): Promise<
  Array<{
    user: string
    assistant: string | null
  }>
> {
  try {
    // Wait for the conversation container to be ready
    await waitForConversationContainer()

    const turns = getAllConversationTurns()
    const conversation = []

    console.log(`📄 Processing ${turns.length} conversation turns...`)

    for (const turn of turns) {
      const userMessage = turn.querySelector(
        '[data-message-author-role="user"]'
      )
      const assistantMessage = turn.querySelector(
        '[data-message-author-role="assistant"]'
      )

      if (userMessage) {
        // Extract user content
        const userContentElement = userMessage.querySelector(
          ".whitespace-pre-wrap"
        )
        const userContent =
          (userContentElement as HTMLElement)?.innerText?.trim() || ""

        conversation.push({
          user: userContent,
          assistant: null // Will be filled by the next article if it's an assistant response
        })
      } else if (assistantMessage) {
        // Only process assistant messages that have action buttons (completed responses)
        const hasActionButtons = turn.querySelector(
          '[data-testid*="turn-action-button"]'
        )

        if (!hasActionButtons) {
          console.log(
            "⚠️ Skipping assistant message without action buttons (incomplete)"
          )
          continue
        }

        // Extract assistant content
        const assistantContentElement =
          assistantMessage.querySelector(".markdown.prose")
        const assistantContent =
          (assistantContentElement as HTMLElement)?.innerText?.trim() || ""

        // Update the last conversation entry with the assistant response
        if (
          conversation.length > 0 &&
          conversation[conversation.length - 1].assistant === null
        ) {
          conversation[conversation.length - 1].assistant = assistantContent
        } else {
          // Edge case: assistant message without preceding user message
          conversation.push({
            user: "",
            assistant: assistantContent
          })
        }
      }
    }

    console.log(
      `✅ Successfully extracted ${conversation.length} conversation pairs`
    )
    return conversation
  } catch (error) {
    console.error("❌ Failed to extract preloaded conversations:", error)
    throw error
  }
}

/**
 * Get conversation metadata (useful for debugging/logging)
 */
export function getConversationMetadata() {
  const turns = getAllConversationTurns()
  const userTurns = turns.filter((turn) =>
    turn.querySelector('[data-message-author-role="user"]')
  )
  const assistantTurns = turns.filter((turn) =>
    turn.querySelector('[data-message-author-role="assistant"]')
  )
  const completedAssistantTurns = assistantTurns.filter((turn) =>
    turn.querySelector('[data-testid*="turn-action-button"]')
  )

  return {
    totalTurns: turns.length,
    userTurns: userTurns.length,
    assistantTurns: assistantTurns.length,
    completedAssistantTurns: completedAssistantTurns.length,
    url: location.href
  }
}
