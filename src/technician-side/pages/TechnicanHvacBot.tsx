import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  AlertTriangle,
  Wrench,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const SYSTEM_PROMPT: Message = {
  role: "system",
  content:
    "You are a helpful HVAC expert assistant. You have extensive knowledge about heating, ventilation, and air conditioning systems.",
};
const WELCOME_MSG: Message = {
  role: "assistant",
  content:
    "Hello! I'm your HVAC assistant. Ask me any questions about HVAC systems, troubleshooting, or best practices.",
};

export default function TechnicanHvacbot() {
  const { supabase } = useSupabase();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    SYSTEM_PROMPT,
    WELCOME_MSG,
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle mobile resize
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Auth & fetch conversations
  useEffect(() => {
    supabase?.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchConversations(user.id);
      }
    });
  }, [supabase]);

  async function fetchConversations(uid: string) {
    const { data, error } = await supabase!
      .from("hvac_conversations")
      .select("*")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });
    if (error) console.error(error);
    else setConversations(data || []);
  }

  async function fetchMessages(conversationId: string) {
    setIsLoading(true);
    const { data, error } = await supabase!
      .from("hvac_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at");
    setIsLoading(false);

    if (error) {
      console.error(error);
      setError("Failed to load conversation");
    } else if (data && data.length) {
      setMessages(
        data.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      );
    } else {
      // no history → reset to defaults
      setMessages([SYSTEM_PROMPT, WELCOME_MSG]);
    }
  }

  // Create a new conversation record, returns its ID
  async function createNewConversation(): Promise<string | null> {
    if (!supabase || !userId) return null;
    const { data, error } = await supabase
      .from("hvac_conversations")
      .insert({ user_id: userId, title: "New Chat" })
      .select()
      .single();
    if (error) {
      console.error(error);
      setError("Could not create conversation");
      return null;
    }
    setConversations((prev) => [data!, ...prev]);
    return data.id;
  }

  // Save each message to Supabase
  async function saveMessage(
    message: Message,
    conversationId: string
  ): Promise<void> {
    await supabase?.from("hvac_messages").insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
    });
  }

  // "New Chat" handler
  const handleNewChat = async () => {
    setQuestion("");
    setMessages([SYSTEM_PROMPT, WELCOME_MSG]);
    const newId = await createNewConversation();
    if (newId) setCurrentConversationId(newId);
    if (isMobile) setShowSidebar(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Send user question
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError("");

    // ensure conversation exists
    let convId = currentConversationId;
    if (!convId) {
      convId = await createNewConversation();
      if (!convId) {
        setIsLoading(false);
        return;
      }
      setCurrentConversationId(convId);
    }

    // add & save user message
    const userMsg = { role: "user" as const, content: question };
    setMessages((m) => [...m, userMsg]);
    await saveMessage(userMsg, convId);
    setQuestion("");

    // call edge function
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-hvac`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            question: question.trim(),
            conversationId: convId,
            messages,
          }),
        }
      );
      if (!res.ok) throw await res.json();
      const { result } = await res.json();

      const assistantMsg = {
        role: "assistant" as const,
        content: result || "Sorry, no response.",
      };
      setMessages((m) => [...m, assistantMsg]);
      await saveMessage(assistantMsg, convId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch reply");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete conversation
  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase?.from("hvac_conversations").delete().eq("id", id);
    setConversations((c) => c.filter((conv) => conv.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setMessages([SYSTEM_PROMPT, WELCOME_MSG]);
    }
  };

  // Update title inline
  const updateConversationTitle = async (id: string) => {
    if (!newTitle.trim()) return;
    await supabase
      ?.from("hvac_conversations")
      .update({ title: newTitle })
      .eq("id", id);
    setConversations((c) =>
      c.map((conv) =>
        conv.id === id ? { ...conv, title: newTitle } : conv
      )
    );
    setEditingTitle(null);
  };

  // Select an existing convo
  const selectConversation = (id: string) => {
    setCurrentConversationId(id);
    fetchMessages(id);
    if (isMobile) setShowSidebar(false);
  };

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4 pb-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center">
        <Link to="/tech" className="text-gray-500 hover:text-gray-700 mr-3">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold flex items-center">
          <MessageSquare className="h-6 w-6 mr-2 text-primary-600" />
          HVAC Assistant
        </h1>
        <button
          onClick={() => setShowSidebar((v) => !v)}
          className="ml-auto p-2 rounded-full text-gray-500 hover:bg-gray-100"
        >
          {showSidebar ? <X size={20} /> : <MessageSquare size={20} />}
        </button>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden relative">
        {/* Sidebar */}
        {showSidebar && (
          <div
            className={`${
              isMobile
                ? "absolute inset-y-0 left-0 z-10 w-full"
                : "w-64"
            } bg-white rounded-lg shadow p-4 flex flex-col overflow-hidden`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medium">Conversations</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="md:hidden text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No conversations yet</p>
                  <p className="text-sm mt-2">Start a new chat below</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`p-2 rounded-md flex justify-between items-center cursor-pointer mb-1 ${
                      currentConversationId === conv.id
                        ? "bg-primary-50 border border-primary-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {editingTitle === conv.id ? (
                      <div className="flex-1 flex items-center">
                        <input
                          className="input text-sm flex-1 px-2 py-1"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Save
                          size={14}
                          className="ml-1 text-success-600 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateConversationTitle(conv.id);
                          }}
                        />
                        <X
                          size={14}
                          className="ml-1 text-error-600 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitle(null);
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 truncate text-sm">
                          {conv.title}
                        </div>
                        <div className="flex opacity-0 group-hover:opacity-100">
                          <Edit
                            size={14}
                            className="text-gray-500 hover:text-primary-600 p-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTitle(conv.id);
                              setNewTitle(conv.title);
                            }}
                          />
                          <Trash2
                            size={14}
                            className="text-gray-500 hover:text-error-600 p-1"
                            onClick={(e) =>
                              deleteConversation(conv.id, e)
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t mt-4">
              <button
                onClick={handleNewChat}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                <Plus size={16} className="mr-2" />
                New Chat
              </button>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div
          className={`flex-1 flex flex-col bg-white rounded-lg shadow overflow-hidden ${
            showSidebar && isMobile ? "hidden md:flex" : ""
          }`}
        >
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages
                .filter((m) => m.role !== "system")
                .map((msg, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary-50 ml-12"
                        : "bg-gray-50 mr-12"
                    }`}
                  >
                    <div className="flex items-start">
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center mr-2">
                          <Wrench size={16} />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          {msg.role === "user" ? "You" : "HVAC Assistant"}
                        </div>
                        <div className="text-gray-700 whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center ml-2">
                          <MessageSquare size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              {isLoading && (
                <div className="p-4 rounded-lg bg-gray-50 mr-12">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center mr-2">
                      <Wrench size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        HVAC Assistant
                      </div>
                      <div className="animate-pulse flex space-x-1">
                        <div className="h-2 w-2 bg-primary-600 rounded-full"></div>
                        <div className="h-2 w-2 bg-primary-600 rounded-full"></div>
                        <div className="h-2 w-2 bg-primary-600 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {error && (
            <div className="bg-error-50 border-l-4 border-error-500 p-4 mx-4 mb-4 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-error-500" />
                <p className="ml-3 text-sm text-error-700">{error}</p>
              </div>
            </div>
          )}

          <div className="p-4 border-t border-gray-200">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="input flex-1"
                placeholder="Ask a question about HVAC..."
                disabled={isLoading}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || !question.trim()}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}