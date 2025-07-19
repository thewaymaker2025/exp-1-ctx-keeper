import axios from "axios"

export const $axios = axios.create({
  baseURL:
    process.env.NODE_ENV === "development"
      ? "http://localhost:4350/api"
      : process.env.PLASMO_PUBLIC_API_URL + "/api",
  headers: {
    "Content-Type": "application/json"
  }
})

interface SmartSyncPayload {
  userId: string
  platform_session_id: string
  platform: string
  messages: {
    final_hash: any
    user: string
    assistant: string
  }[]
}

export async function sendSmartSync(
  userId: string,
  sessionId: string,
  conversationsWithHashes: {
    final_hash: any
    user: string
    assistant: string
  }[]
): Promise<void> {
  try {
    const payload: SmartSyncPayload = {
      userId: userId,
      platform_session_id: sessionId,
      platform: "chatgpt",
      messages: conversationsWithHashes
    }

    console.log("Sending smart-sync request:", payload)

    const response = await $axios.post("/context/smart-sync", payload, {
      headers: {
        "Content-Type": "application/json"
      }
    })

    console.log("Smart-sync response:", response.data)
  } catch (error) {
    console.error("Failed to send smart-sync request:", error)
  }
}

export async function injectContext(
  selections: Array<{
    segment_id: string
    thread_ids?: string[]
  }>,
  sessionId: string
) {
  const res = await $axios.post(`/context/inject/${sessionId}`, { selections })
  return res.data
}

export async function getContextSegments(sessionId: string) {
  const res = await $axios.get(`/context/segments/${sessionId}`)
  return res.data
}
