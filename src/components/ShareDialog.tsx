import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link2, Twitter, Facebook, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  content: string;
}

export const ShareDialog = ({ open, onOpenChange, postId, content }: ShareDialogProps) => {
  const postUrl = `${window.location.origin}/?post=${postId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(postUrl);
    toast.success("Link copied to clipboard!");
  };

  const handleShareTwitter = () => {
    const text = content.slice(0, 200) + (content.length > 200 ? '...' : '');
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(postUrl)}`;
    window.open(url, '_blank');
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post',
          text: content.slice(0, 200),
          url: postUrl,
        });
        toast.success("Shared successfully!");
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast.error("Failed to share");
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Post</DialogTitle>
          <DialogDescription>
            Share this post with your network
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={handleCopyLink}
          >
            <Link2 className="h-4 w-4" />
            Copy Link
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={handleShareTwitter}
          >
            <Twitter className="h-4 w-4" />
            Share on Twitter
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={handleShareFacebook}
          >
            <Facebook className="h-4 w-4" />
            Share on Facebook
          </Button>
          {navigator.share && (
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={handleNativeShare}
            >
              <Share2 className="h-4 w-4" />
              More Options
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
