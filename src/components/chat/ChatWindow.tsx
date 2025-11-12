import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, Lock, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { processMedia } from "@/utils/mediaProcessor";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  media_url?: string;
  media_type?: string;
}

interface ChatWindowProps {
  conversationId: string;
  userId: string;
}

export const ChatWindow = ({ conversationId, userId }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversation();
    loadMessages();

    // Subscribe to real-time messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Get username for the new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", newMsg.user_id)
            .single();

          setMessages(prev => [...prev, { ...newMsg, username: profile?.username }]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadConversation = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      setConversation(data);
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Get usernames for all messages
      const userIds = [...new Set(messagesData.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]));

      const enrichedMessages = messagesData.map(msg => ({
        ...msg,
        username: profileMap.get(msg.user_id),
      }));

      setMessages(enrichedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size must be less than 20MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (file: File) => {
    try {
      const fileType = file.type.startsWith('image/') ? 'image' : 
                      file.type.startsWith('video/') ? 'video' : 'file';
      
      let fileToUpload = file;
      let fileName = file.name;

      // Process media to remove metadata
      if (fileType === 'image' || fileType === 'video') {
        const processed = await processMedia(file, fileType);
        fileToUpload = new File([processed.blob], processed.fileName, { type: file.type });
        fileName = processed.fileName;
      } else {
        fileName = `${Date.now()}-${file.name}`;
      }

      const filePath = `chat/${userId}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("media")
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      return { url: publicUrl, type: fileType };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    setUploading(true);
    try {
      let mediaUrl = null;
      let mediaType = null;

      if (selectedFile) {
        const uploadResult = await uploadFile(selectedFile);
        mediaUrl = uploadResult.url;
        mediaType = uploadResult.type;
      }

      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          content: newMessage.trim() || "",
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (error) throw error;
      setNewMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setUploading(false);
    }
  };

  const getConversationTitle = () => {
    if (!conversation) return "Chat";
    if (conversation.type === 'direct') return "Direct Message";
    return conversation.name || "Group Chat";
  };

  return (
    <Card className="flex flex-col h-full bg-card/50 backdrop-blur-sm border-white/10">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{getConversationTitle()}</h3>
          {conversation?.type === 'group' && (
            conversation.is_public ? (
              <Users className="h-4 w-4 text-accent" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.user_id === userId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent/20 text-foreground'
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs font-semibold mb-1 text-accent">
                          {message.username || 'User'}
                        </p>
                      )}
                      
                      {message.media_url && (
                        <div className="mb-2">
                          {message.media_type === 'image' && (
                            <img 
                              src={message.media_url} 
                              alt="Shared image" 
                              className="max-w-full max-h-64 rounded object-cover"
                            />
                          )}
                          {message.media_type === 'video' && (
                            <video 
                              src={message.media_url} 
                              controls 
                              className="max-w-full max-h-64 rounded"
                            />
                          )}
                          {message.media_type === 'file' && (
                            <a 
                              href={message.media_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm underline hover:no-underline"
                            >
                              <Paperclip className="h-4 w-4" />
                              Download File
                            </a>
                          )}
                        </div>
                      )}
                      
                      {message.content && (
                        <p className="text-sm break-words">{message.content}</p>
                      )}
                      
                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
          {selectedFile && (
            <div className="mb-2 p-2 bg-accent/10 rounded flex items-center justify-between">
              <span className="text-sm truncate flex-1">{selectedFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={uploading}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={(!newMessage.trim() && !selectedFile) || uploading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
