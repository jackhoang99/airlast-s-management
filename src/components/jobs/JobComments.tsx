import { useState, useEffect } from 'react';
import { MessageSquare, Send, AlertTriangle } from 'lucide-react';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';

type JobCommentsProps = {
  jobId: string;
};

type Comment = {
  id: string;
  job_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
  };
};

const JobComments = ({ jobId }: JobCommentsProps) => {
  const { supabase, session } = useSupabase();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');

  useEffect(() => {
    const fetchComments = async () => {
      if (!supabase || !jobId) return;

      try {
        setIsLoading(true);
        
        // Fetch job comments
        const { data: commentsData, error: commentsError } = await supabase
          .from('job_comments')
          .select(`
            id,
            job_id,
            user_id,
            content,
            created_at
          `)
          .eq('job_id', jobId)
          .order('created_at', { ascending: false });

        if (commentsError) throw commentsError;
        
        // For each comment, fetch the user details separately
        const commentsWithUsers = await Promise.all(
          (commentsData || []).map(async (comment) => {
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('first_name, last_name')
                .eq('id', comment.user_id)
                .single();
              
              if (userError) {
                console.error('Error fetching user for comment:', userError);
                return {
                  ...comment,
                  user: { first_name: 'Unknown', last_name: 'User' }
                };
              }
              
              return {
                ...comment,
                user: userData
              };
            } catch (err) {
              console.error('Error processing comment user:', err);
              return {
                ...comment,
                user: { first_name: 'Unknown', last_name: 'User' }
              };
            }
          })
        );
        
        setComments(commentsWithUsers);
        
        // Get current user ID
        if (session?.user) {
          setCurrentUserId(session.user.id);
          
          // Get current user name
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .single();
            
          if (!userError && userData) {
            setCurrentUserName(`${userData.first_name || ''} ${userData.last_name || ''}`);
          }
        }
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError('Failed to load comments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [supabase, jobId, session]);

  const handleAddComment = async () => {
    if (!supabase || !jobId || !currentUserId || !newComment.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('job_comments')
        .insert({
          job_id: jobId,
          user_id: currentUserId,
          content: newComment.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new comment to the list with user info
      setComments([
        {
          ...data,
          user: {
            first_name: currentUserName.split(' ')[0] || 'Unknown',
            last_name: currentUserName.split(' ')[1] || 'User'
          }
        },
        ...comments
      ]);
      
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium flex items-center mb-4">
        <MessageSquare className="h-5 w-5 mr-2 text-primary-600" />
        Comments
      </h3>

      <div className="mb-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="input w-full h-24"
          disabled={isSubmitting}
        ></textarea>
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAddComment}
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
                  {comment.user?.first_name} {comment.user?.last_name}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(comment.created_at).toLocaleString()}
                </div>
              </div>
              <p className="mt-2 text-gray-700">{comment.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No comments yet</p>
      )}
    </div>
  );
};

export default JobComments;