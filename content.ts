import type { PlasmoCSConfig } from "plasmo"

import { performFastReinjectionCheck } from "~helpers/api"
import {
  extractAndLogConversation,
  monitorMessageSending
} from "~helpers/chatgpt.helper"
import { getChatPlatform, monitorProseMirrorInput } from "~helpers/page.helper"
import type { ReinjectionResponse } from "~types/index.types"
import {
  copyAndPaste,
  extractAxiosResponseData,
  formatRawString,
  getOrCreateUserId,
  getSessionId
} from "~utils"

export const config: PlasmoCSConfig = {
  matches: ["https://chatgpt.com/c/*", "https://chatgpt.com/g/*"],
  all_frames: true
}

let currentUrl = location.href
let extractionTimeout: NodeJS.Timeout | null = null

// Listen for prompt injection from popup
if (typeof chrome !== "undefined") {
  chrome.runtime.onMessage.addListener(
    async (message, sender, sendResponse) => {
      if (
        message.type === "CTX_KEEPER_INJECT_PROMPT" &&
        typeof message.prompt === "string"
      ) {
        try {
          const textarea = document.querySelector(message.selector)
          if (textarea) {
            const formatted = formatRawString(message.prompt)
            textarea.focus()
            textarea.value = ""

            closePopup()

            setTimeout(async () => {
              await copyAndPaste(formatted, textarea as HTMLElement)
            }, 500)

            // console.log("CTX_KEEPER: Injected prompt:", formatted)
          }
        } catch (e) {
          console.error("CTX_KEEPER: Failed to inject prompt", e)
        }
      }
    }
  )
}

function closePopup() {
  chrome.runtime.sendMessage({ type: "closePopup" }, (response) => {
    console.log("Popup close request sent")
  })
}

async function handleMessageSending(query: string) {
  const platform = getChatPlatform(location.href)
  // const allBatchedMessages = await extractAndLogConversation(false)
  // const lastBatch = allBatchedMessages[allBatchedMessages.length - 1]
  // const lastBatchMessage = lastBatch[lastBatch.length - 1]

  try {
    const userId = await getOrCreateUserId()
    const sessionId = getSessionId(platform as any)
    const res = await performFastReinjectionCheck({
      userId,
      sessionId,
      query
    })

    const data = extractAxiosResponseData(res, "success")
      ?.data as unknown as ReinjectionResponse

    console.log({ data })
  } catch (err: any) {
    console.log(
      `Error occurred while performing fast reinjection check: ${err.message}`,
      err
    )
  }
}

// Debounced extraction to avoid too many calls
function scheduleExtraction() {
  if (extractionTimeout) {
    clearTimeout(extractionTimeout)
  }
  extractionTimeout = setTimeout(() => extractAndLogConversation(), 1000) // Wait 1 second after changes stop
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
  monitorProseMirrorInput(async (query: string) => {
    await handleMessageSending(query)
  }, "chatgpt")

  // Initial extraction of preloaded conversations
  scheduleExtraction()
})

window.addEventListener("submit", (e) => {
  console.log("Something got submitted")
})
