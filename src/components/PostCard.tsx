import { Heart, MessageCircle, Share2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CommentSection } from "@/components/CommentSection";
import { ShareDialog } from "@/components/ShareDialog";
import { FollowButton } from "@/components/FollowButton";
import { supabase } from "@/integrations/supabase/client";

export interface Post {
  id: string;
  author: string;
  authorAddress: string;
  content: string;
  image?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  timestamp: number;
  likes: number;
  comments: number;
  shares: number;
  tokenReward: number;
}

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onEarn: (amount: number) => void;
  currentUserId?: string;
}

export const PostCard = ({ post, onLike, onEarn, currentUserId }: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareCount, setShareCount] = useState(post.shares);

  const handleLike = () => {
    if (!isLiked) {
      onLike(post.id);
      setIsLiked(true);
      toast.success(`+${post.tokenReward} $GRAM earned!`, {
        description: "Thanks for engaging with quality content"
      });
      onEarn(post.tokenReward);
    }
  };

  const handleShare = async () => {
    setShowShareDialog(true);
    
    // Increment share count in database
    try {
      const { error } = await supabase
        .from('posts')
        .update({ shares: shareCount + 1 })
        .eq('id', post.id);

      if (!error) {
        setShareCount(prev => prev + 1);
        toast.success("Post shared!", {
          description: "Share count updated"
        });
      }
    } catch (error) {
      console.error("Error updating shares:", error);
    }
  };

  const timeAgo = () => {
    const seconds = Math.floor((Date.now() - post.timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <>
    <Card className="overflow-hidden hover:shadow-glow-primary/20 transition-all duration-300">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-primary" />
          <div>
            <p className="font-semibold">{post.author}</p>
            <p className="text-sm text-muted-foreground">
              {post.authorAddress.slice(0, 6)}...{post.authorAddress.slice(-4)} · {timeAgo()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FollowButton 
            targetUserId={post.authorAddress} 
            currentUserId={currentUserId}
            variant="outline"
            size="sm"
          />
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-accent">+{post.tokenReward} $GRAM</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        <p className="text-foreground mb-3">{post.content}</p>
        {(post.mediaUrl || post.image) && (
          <div className="rounded-lg overflow-hidden">
            {(post.mediaType === 'video') ? (
              <video 
                src={post.mediaUrl} 
                controls 
                className="w-full max-h-96 object-cover"
              />
            ) : (
              <img
                src={post.mediaUrl || post.image}
                alt="Post content"
                className="w-full rounded-lg object-cover max-h-96"
              />
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`gap-2 ${isLiked ? 'text-accent' : ''}`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-accent' : ''}`} />
            <span>{post.likes + (isLiked ? 1 : 0)}</span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-5 w-5" />
            <span>{post.comments}</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="h-5 w-5" />
            <span>{shareCount}</span>
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && <CommentSection postId={post.id} />}
    </Card>

    {/* Share Dialog */}
    <ShareDialog
      open={showShareDialog}
      onOpenChange={setShowShareDialog}
      postId={post.id}
      content={post.content}
    />
    </>
  );
};
