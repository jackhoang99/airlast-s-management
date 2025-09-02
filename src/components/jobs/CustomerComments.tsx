import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import {
  MessageSquare,
  Send,
  Edit,
  Trash2,
  User,
  AlertTriangle,
} from "lucide-react";

type CustomerCommentsProps = {
  jobId: string;
};

type CustomerComment = {
  id: string;
  job_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    first_name: string;
    last_name: string;
  };
};

const CustomerComments = ({ jobId }: CustomerCommentsProps) => {
  const { supabase, session } = useSupabase();
  const [comments, setComments] = useState<CustomerComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [userMap, setUserMap] = useState<{
    [key: string]: { first_name: string; last_name: string };
  }>({});

  useEffect(() => {
    const fetchComments = async () => {
      if (!supabase || !jobId) return;

      try {
        setIsLoading(true);

        // Fetch customer comments
        const { data: commentsData, error: commentsError } = await supabase
          .from("customer_comments")
          .select(
            `
            id,
            job_id,
            user_id,
            content,
            created_at,
            updated_at
          `
          )
          .eq("job_id", jobId)
          .order("created_at", { ascending: false });

        if (commentsError) throw commentsError;

        // Get all unique user IDs from comments
        const userIds = [
          ...new Set(commentsData?.map((comment) => comment.user_id) || []),
        ];

        // Fetch user details
        if (userIds.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, first_name, last_name")
            .in("id", userIds);

          if (userError) {
            console.error("Error fetching users for comments:", userError);
          } else if (userData) {
            const userMapData: {
              [key: string]: { first_name: string; last_name: string };
            } = {};
            userData.forEach((user) => {
              userMapData[user.id] = {
                first_name: user.first_name || "",
                last_name: user.last_name || "",
              };
            });
            setUserMap(userMapData);

            // Process comments with user info
            const processedComments =
              commentsData?.map((comment) => {
                return {
                  ...comment,
                  user: userMapData[comment.user_id] || {
                    first_name: "",
                    last_name: "",
                  },
                };
              }) || [];

            setComments(processedComments);
          }
        } else {
          // No users to fetch, just set comments
          setComments(commentsData || []);
        }
      } catch (err) {
        console.error("Error fetching customer comments:", err);
        setError("Failed to load comments");
      } finally {
        setIsLoading(false);
      }
    };

    const getCurrentUser = async () => {
      if (!supabase || !session?.user) return;

      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, first_name, last_name")
          .eq("auth_id", session.user.id)
          .single();

        if (!userError && userData) {
          setCurrentUserId(userData.id);
          setCurrentUserName(
            `${userData.first_name || ""} ${userData.last_name || ""}`
          );

          // Add current user to userMap
          setUserMap((prev) => ({
            ...prev,
            [userData.id]: {
              first_name: userData.first_name || "",
              last_name: userData.last_name || "",
            },
          }));
        }
      } catch (err) {
        console.error("Error getting current user:", err);
      }
    };

    fetchComments();
    getCurrentUser();
  }, [supabase, jobId, session]);

  const handleSubmit = async () => {
    if (!supabase || !currentUserId || !newComment.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("customer_comments")
        .insert({
          job_id: jobId,
          user_id: currentUserId,
          content: newComment.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new comment to the list with user info
      setComments([
        {
          ...data,
          user: {
            first_name: currentUserName.split(" ")[0] || "",
            last_name: currentUserName.split(" ")[1] || "",
          },
        },
        ...comments,
      ]);

      setNewComment("");
    } catch (err) {
      console.error("Error adding customer comment:", err);
      setError("Failed to add comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!supabase || !editContent.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const { error: updateError } = await supabase
        .from("customer_comments")
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", commentId);

      if (updateError) throw updateError;

      setEditingComment(null);
      setEditContent("");

      // Update the comment in local state
      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                content: editContent.trim(),
                updated_at: new Date().toISOString(),
              }
            : comment
        )
      );
    } catch (err) {
      console.error("Error updating customer comment:", err);
      setError("Failed to update comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!supabase || !confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      setIsSubmitting(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from("customer_comments")
        .delete()
        .eq("id", commentId);

      if (deleteError) throw deleteError;

      // Remove the comment from local state
      setComments((prevComments) =>
        prevComments.filter((comment) => comment.id !== commentId)
      );
    } catch (err) {
      console.error("Error deleting customer comment:", err);
      setError("Failed to delete comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (comment: CustomerComment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditContent("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold">Customer Comments</h3>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium flex items-center mb-4">
        <MessageSquare className="h-5 w-5 mr-2 text-primary-600" />
        Customer Comments
        <span className="text-sm text-gray-500 ml-2">
          (Visible to customers)
        </span>
      </h3>

      {currentUserId && (
        <div className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment that will be visible to the customer..."
            className="input w-full h-24"
            disabled={isSubmitting}
          ></textarea>
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={isSubmitting || !newComment.trim()}
            >
              {isSubmitting ? (
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              ) : (
                <Send size={16} className="mr-2" />
              )}
              Add Comment
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="font-medium">
                  {comment.user?.first_name && comment.user?.last_name
                    ? `${comment.user.first_name} ${comment.user.last_name}`
                    : userMap[comment.user_id]?.first_name &&
                      userMap[comment.user_id]?.last_name
                    ? `${userMap[comment.user_id].first_name} ${
                        userMap[comment.user_id].last_name
                      }`
                    : "Unknown User"}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(comment.created_at)}
                  {comment.updated_at !== comment.created_at && " (edited)"}
                </div>
              </div>
              {editingComment === comment.id ? (
                <div className="space-y-2 mt-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="input w-full h-20"
                    disabled={isSubmitting}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(comment.id)}
                      disabled={isSubmitting || !editContent.trim()}
                      className="btn btn-primary btn-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={isSubmitting}
                      className="btn btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-gray-700">{comment.content}</p>

                  {currentUserId === comment.user_id && (
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={() => startEdit(comment)}
                        className="text-primary-600 hover:text-primary-800 p-1 text-xs"
                        title="Edit comment"
                        disabled={isSubmitting}
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-red-600 hover:text-red-800 p-1 text-xs"
                        title="Delete comment"
                        disabled={isSubmitting}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">
          No customer comments yet
        </p>
      )}
    </div>
  );
};

export default CustomerComments;
