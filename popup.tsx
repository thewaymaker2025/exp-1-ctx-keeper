import { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"

import { useSegments } from "~hooks/useSegments"

import "./style.css"

const storage = new Storage()

function IndexPopup() {
  const [data, setData] = useState("")
  const [selectedContextId, setSelectedContextId] = useState<string | null>(
    null
  )
  const [userId, setUserId] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [receivedData, setReceivedData] = useState(null)
  const [currentUrl, setCurrentUrl] = useState("")

  // Use the custom hook to fetch segments
  const { segments, loading, error, metadata, refetch } = useSegments(sessionId)

  const toggleContext = (id: string) => {
    setSelectedContextId((prev) => (prev === id ? null : id))
  }

  // Load data from Plasmo storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [conversations, url, userIdFromStorage, sessionIdFromStorage] =
          await Promise.all([
            storage.get("ctx_keeper_chat_conversations"),
            storage.get("ctx_keeper_chat_session_url"),
            storage.get("ctx_keeper_user_id"),
            storage.get("ctx_keeper_session_id")
          ])

        if (conversations) {
          setReceivedData(conversations)
        }
        if (url) {
          setCurrentUrl(url)
        }
        if (userIdFromStorage) {
          setUserId(userIdFromStorage)
        }
        if (sessionIdFromStorage) {
          setSessionId(sessionIdFromStorage)
        }

        console.log("Loaded data:", {
          conversations,
          url,
          userIdFromStorage,
          sessionIdFromStorage
        })
      } catch (error) {
        console.error("Error loading data from storage:", error)
      }
    }

    loadData()

    // Listen for real-time messages from content script
    if (typeof chrome !== "undefined" && chrome.runtime) {
      const messageListener = (message, sender, sendResponse) => {
        if (message.type === "CONVERSATIONS_WITH_HASHES") {
          setReceivedData(message.data)
          setCurrentUrl(message.url)
          setUserId(message.userId)
          setSessionId(message.sessionId)
          console.log("Received real-time data:", message)
        }
      }

      chrome.runtime.onMessage.addListener(messageListener)

      return () => {
        chrome.runtime.onMessage.removeListener(messageListener)
      }
    }
  }, [])

  console.log(window.location.href)

  return (
    <div className="min-w-[500px] h-[140rem] flex flex-col bg-white relative">
      {/* Header */}
      <div className="w-full sticky top-0 left-0 bg-white-100 flex items-center border-b border-gray-300 px-3 py-3">
        <input
          type="text"
          placeholder="Search context to inject"
          className="flex-1 h-[40px] px-4 outline-none border-none text-gray-600"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
        <button className="px-4 py-2 text-white border-[1px] border-gray-300">
          Filter
        </button>
      </div>

      {/* Content */}
      <div className="h-auto flex-1 p-4 overflow-y-auto">
        {/* All contexts section */}
        <div>
          <h3 className="text-gray-500 text-sm mb-3">All contexts</h3>

          {loading && (
            <div className="text-center py-4 text-gray-500">
              Loading segments...
            </div>
          )}

          {error && (
            <div className="text-center py-4 text-red-500">
              Error: {error}
              <button
                onClick={refetch}
                className="ml-2 text-blue-500 underline">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && segments.length === 0 && sessionId && (
            <div className="text-center py-4 text-gray-500">
              No segments found for this session
            </div>
          )}

          {!loading && !error && !sessionId && (
            <div className="text-center py-4 text-gray-500">
              Please navigate to a ChatGPT conversation to load segments
            </div>
          )}

          {segments.map((segment) => (
            <div key={segment.id} className="border border-gray-200 mb-2">
              <div
                className="p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleContext(segment.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm">
                      Inject: <strong>{segment.theme}</strong>
                    </span>
                    <span className="bg-blue-100 text-white-100 text-xs px-2 py-1">
                      {segment.threads_count}
                    </span>
                  </div>
                  <span className="text-gray-400">
                    {selectedContextId === segment.id ? "▲" : "▼"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Created {new Date(segment.created_at).toLocaleDateString()} •{" "}
                  {segment.threads_count} thread
                  {segment.threads_count !== 1 ? "s" : ""} in this segment
                </p>
              </div>

              {selectedContextId === segment.id && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {segment.threads.map((thread) => (
                    <div
                      key={thread.id}
                      className="flex items-start gap-2 p-3 pl-8 border-l-2 border-gray-300 ml-4">
                      <input type="checkbox" className="w-4 h-4 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-black">
                          {thread.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {thread.summary?.slice(0, 100)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Inject button */}
        {/* BUTTON NOT NEEDED YET, DO NOT MODIFY THIS */}
        {/* <div className="mt-6">
          <button className="w-full bg-gray-200 text-gray-600 py-3 hover:bg-gray-300">
            Inject into conversation
          </button>
        </div> */}
      </div>
    </div>
  )
}

export default IndexPopup
