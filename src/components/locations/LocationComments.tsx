import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";
import { MessageSquare, Plus, Edit, Trash2, Send } from "lucide-react";

type LocationComment = Database["public"]["Tables"]["location_comments"]["Row"];

interface LocationCommentsProps {
  locationId: string;
  title?: string;
  onCommentsChange?: () => void;
}

const LocationComments: React.FC<LocationCommentsProps> = ({
  locationId,
  title = "Comments",
  onCommentsChange,
}) => {
  const { supabase } = useSupabase();
  const [comments, setComments] = useState<LocationComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingComment, setDeletingComment] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [locationId]);

  const fetchComments = async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      if (!locationId) {
        setComments([]);
        return;
      }

      const { data, error } = await supabase
        .from("location_comments")
        .select("*")
        .eq("location_id", locationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!supabase || !newComment.trim()) return;

    try {
      setSubmitting(true);
      const { error } = await supabase.from("location_comments").insert({
        location_id: locationId,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      await fetchComments();
      onCommentsChange?.();
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!supabase || !editContent.trim()) return;

    try {
      const { error } = await supabase
        .from("location_comments")
        .update({ content: editContent.trim() })
        .eq("id", commentId);

      if (error) throw error;

      setEditingComment(null);
      setEditContent("");
      await fetchComments();
      onCommentsChange?.();
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!supabase) return;

    try {
      setDeletingComment(commentId);
      const { error } = await supabase
        .from("location_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      await fetchComments();
      onCommentsChange?.();
    } catch (error) {
      console.error("Error deleting comment:", error);
    } finally {
      setDeletingComment(null);
    }
  };

  const startEditing = (comment: LocationComment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditContent("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary-600" />
            {title}
          </h2>
        </div>
        <div className="flex justify-center items-center h-16">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary-600" />
          {title} ({comments.length})
        </h2>
      </div>

      {/* Add Comment Form */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            onKeyPress={(e) => {
              if (e.key === "Enter" && !submitting) {
                handleAddComment();
              }
            }}
          />
          <button
            onClick={handleAddComment}
            disabled={submitting || !newComment.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              No comments yet
            </h3>
            <p className="text-gray-500 text-sm">
              Be the first to add a comment about this location
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="border border-gray-200 rounded-lg p-3 bg-gray-50"
            >
              {editingComment === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditComment(comment.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-500">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditing(comment)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit comment"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={deletingComment === comment.id}
                        className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Delete comment"
                      >
                        {deletingComment === comment.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LocationComments;
