import axios from "axios"

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

    const response = await axios.post(
      "http://localhost:4350/api/context/smart-sync",
      payload,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    )

    console.log("Smart-sync response:", response.data)
  } catch (error) {
    console.error("Failed to send smart-sync request:", error)
  }
}
