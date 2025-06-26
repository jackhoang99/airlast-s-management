import { useState, useEffect } from 'react';
import { useSupabase } from '../../lib/supabase-context';
import { User, Mail, Phone, Shield, Key, Save, X, AlertTriangle, MessageSquare, Send } from 'lucide-react';

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
  const [userMap, setUserMap] = useState<{[key: string]: {first_name: string, last_name: string}}>({});
  const [authUserMap, setAuthUserMap] = useState<{[key: string]: string}>({});

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
        
        // Get all unique user IDs from comments
        const userIds = [...new Set(commentsData?.map(comment => comment.user_id) || [])];
        
        // Fetch user details
        if (userIds.length > 0) {
          // First, fetch direct user matches
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .in('id', userIds);
            
          if (userError) {
            console.error('Error fetching users for comments:', userError);
          } else if (userData) {
            // Create a map of user IDs to names
            const userMapData: {[key: string]: {first_name: string, last_name: string}} = {};
            
            userData.forEach(user => {
              userMapData[user.id] = {
                first_name: user.first_name || '',
                last_name: user.last_name || ''
              };
            });
            
            setUserMap(userMapData);
          }
          
          // Now try to map auth IDs to user IDs
          try {
            // Get all users with auth_id
            const { data: usersWithAuth, error: usersError } = await supabase
              .from('users')
              .select('id, auth_id, first_name, last_name')
              .not('auth_id', 'is', null);
              
            if (!usersError && usersWithAuth) {
              const authMap: {[key: string]: string} = {};
              const additionalUserMap: {[key: string]: {first_name: string, last_name: string}} = {};
              
              usersWithAuth.forEach(user => {
                if (user.auth_id) {
                  authMap[user.auth_id] = user.id;
                  additionalUserMap[user.id] = {
                    first_name: user.first_name || '',
                    last_name: user.last_name || ''
                  };
                }
              });
              
              setAuthUserMap(authMap);
              setUserMap(prev => ({...prev, ...additionalUserMap}));
            }
          } catch (err) {
            console.error('Error mapping auth IDs to users for comments:', err);
          }
        }
        
        // Process comments with user info
        const processedComments = commentsData?.map(comment => {
          return {
            ...comment,
            user: getUserInfo(comment.user_id)
          };
        }) || [];
        
        setComments(processedComments);
        
        // Get current user ID
        if (session?.user) {
          setCurrentUserId(session.user.id);
          
          // Get current user name
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .maybeSingle();
            
          if (!userError && userData) {
            setCurrentUserName(`${userData.first_name || ''} ${userData.last_name || ''}`);
          } else {
            // Try to find by auth_id
            const { data: authUserData, error: authUserError } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('auth_id', session.user.id)
              .maybeSingle();
              
            if (!authUserError && authUserData) {
              setCurrentUserName(`${authUserData.first_name || ''} ${authUserData.last_name || ''}`);
            }
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

  const getUserInfo = (userId: string): {first_name: string, last_name: string} => {
    // First check if this is a direct match in our user map
    if (userMap[userId]) {
      return userMap[userId];
    }
    
    // Next, check if this is an auth ID that maps to a user ID
    const mappedUserId = authUserMap[userId];
    if (mappedUserId && userMap[mappedUserId]) {
      return userMap[mappedUserId];
    }
    
    // If we still don't have a name, return empty values
    return { first_name: '', last_name: '' };
  };

  const getUserDisplayName = (userId: string): string => {
    const userInfo = getUserInfo(userId);
    
    if (userInfo.first_name || userInfo.last_name) {
      return `${userInfo.first_name} ${userInfo.last_name}`.trim();
    }
    
    // If we still don't have a name, return a default
    return 'User';
  };

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
            first_name: currentUserName.split(' ')[0] || '',
            last_name: currentUserName.split(' ')[1] || ''
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
                  {comment.user?.first_name || comment.user?.last_name 
                    ? `${comment.user.first_name || ''} ${comment.user.last_name || ''}`.trim()
                    : getUserDisplayName(comment.user_id)}
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