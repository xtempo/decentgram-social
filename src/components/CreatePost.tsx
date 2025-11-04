import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Image, Send } from "lucide-react";
import { toast } from "sonner";

interface CreatePostProps {
  onPost: (content: string, image?: string) => void;
}

export const CreatePost = ({ onPost }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) {
      toast.error("Please write something to post");
      return;
    }

    setIsPosting(true);
    
    // Simulate posting to blockchain
    setTimeout(() => {
      onPost(content);
      setContent("");
      setIsPosting(false);
      toast.success("Posted to blockchain!", {
        description: "Your content is now immutable and decentralized"
      });
    }, 1500);
  };

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-primary flex-shrink-0" />
        <div className="flex-1">
          <Textarea
            placeholder="What's happening on-chain?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none border-0 focus-visible:ring-0 bg-transparent"
          />
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" className="gap-2">
              <Image className="h-5 w-5" />
              Media
            </Button>

            <Button 
              onClick={handlePost}
              disabled={isPosting || !content.trim()}
              className="bg-gradient-primary hover:shadow-glow-primary gap-2"
            >
              <Send className="h-4 w-4" />
              {isPosting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
