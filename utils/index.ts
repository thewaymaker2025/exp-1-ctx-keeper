import { generate } from "short-uuid"

import { Storage } from "@plasmohq/storage"

export const storage = new Storage()

export type BaseResponseType<T> = {
  message: string
  data?: T
}

export const extractAxiosResponseData = <T>(
  res: any | null,
  type: "success" | "error"
) => {
  if (type === "error") {
    return res?.response?.data as BaseResponseType<T>
  }
  return res as BaseResponseType<T>
}

export function formatRawString(str: string) {
  try {
    return str
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r")
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\") // Process escaped backslashes last
  } catch (error) {
    console.error("Error formatting string:", error)
    return str
  }
}

export async function copyAndPaste(
  textToCopy: string,
  targetElement: HTMLElement
) {
  try {
    // Copy to clipboard
    await navigator.clipboard.writeText(textToCopy)

    // Immediately paste to target element
    if (
      targetElement.tagName === "INPUT" ||
      targetElement.tagName === "TEXTAREA"
    ) {
      // @ts-ignore
      targetElement.value = textToCopy
      targetElement.focus()
    } else {
      targetElement.innerHTML = textToCopy
    }

    const inputEvent = new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: textToCopy
    })
    targetElement.dispatchEvent(inputEvent)

    // Trigger events to simulate real paste
    targetElement.dispatchEvent(new Event("paste", { bubbles: true }))
    targetElement.dispatchEvent(new Event("input", { bubbles: true }))
  } catch (error) {
    console.error("Copy/paste failed:", error)
  }
}

export function getElementByXPath(path: string): Element | null {
  const result = document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  )
  return result.singleNodeValue as Element | null
}

export async function getOrCreateUserId(): Promise<string> {
  const existingUserId = await storage.get("ctx_keeper_user_id")

  if (existingUserId) {
    console.log("Retrieved existing user ID:", existingUserId)
    return existingUserId
  }

  const newUserId = generate()
  await storage.set("ctx_keeper_user_id", newUserId)
  return newUserId
}

export function getSessionId(platform: "chatgpt" = "chatgpt"): string | null {
  if (platform === "chatgpt") {
    // Handle regular chat URLs: /c/uuid
    const chatMatch = location.href.match(
      /\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
    )
    if (chatMatch) {
      return chatMatch[1]
    }

    // Handle GPT URLs: /g/g-xxxxx-xxxx
    const gptMatch = location.href.match(/\/g\/(g-.+?)(?:\/|$)/)
    if (gptMatch) {
      return gptMatch[1]
    }
    return null
  }
}

export function isValidChatSessionUrl(): boolean {
  const url = location.href

  // Check for regular chat session with UUID
  const chatRegex =
    /\/c\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (chatRegex.test(url)) return true

  // Check for GPT session
  const gptRegex = /\/g\/g-.+/i
  if (gptRegex.test(url)) return true

  return false
}
