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

    const response = await $axios.post("/context/sync-pairs", payload, {
      headers: {
        "Content-Type": "application/json"
      }
    })

    console.log("Sync Pairs response:", response.data)
  } catch (error) {
    console.error("Failed to send sync pairs request:", error)
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
  const res = await $axios.get(
    `/context/segments/${sessionId}?include_threads=true`
  )
  return res.data
}

export async function performFastReinjectionCheck(data: {
  query: string
  userId: string
  sessionId: string
}) {
  const { query, userId, sessionId } = data
  const res = await $axios.post(`/context/reinjection/${sessionId}`, {
    query,
    userId
  })
  return res.data
}
