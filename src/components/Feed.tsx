import { PostCard, Post } from "./PostCard";
import { CreatePost } from "./CreatePost";

interface FeedProps {
  posts: Post[];
  onLike: (postId: string) => void;
  onPost: (content: string, mediaUrl?: string, mediaType?: 'image' | 'video') => void;
  onEarn: (amount: number) => void;
}

export const Feed = ({ posts, onLike, onPost, onEarn }: FeedProps) => {
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <CreatePost onPost={onPost} />
      
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            onLike={onLike}
            onEarn={onEarn}
          />
        ))}
      </div>
    </div>
  );
};
