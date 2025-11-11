import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Users, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  is_public: boolean;
  updated_at: string;
  participant_count: number;
  other_user_name?: string;
  last_message?: string;
}

interface ConversationListProps {
  userId: string;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export const ConversationList = ({
  userId,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => loadConversations()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => loadConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadConversations = async () => {
    try {
      // Get conversations user is part of
      const { data: participantData, error: participantError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      if (participantError) throw participantError;

      const conversationIds = participantData.map(p => p.conversation_id);

      if (conversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get conversation details
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (conversationsError) throw conversationsError;

      // Enrich with participant info and last message
      const enrichedConversations = await Promise.all(
        conversationsData.map(async (conv) => {
          // Get participant count
          const { count } = await supabase
            .from("conversation_participants")
            .select("*", { count: 'exact', head: true })
            .eq("conversation_id", conv.id);

          // For direct messages, get the other user's name
          let otherUserName;
          if (conv.type === 'direct') {
            const { data: otherParticipant } = await supabase
              .from("conversation_participants")
              .select("user_id")
              .eq("conversation_id", conv.id)
              .neq("user_id", userId)
              .single();

            if (otherParticipant) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("username")
                .eq("user_id", otherParticipant.user_id)
                .single();

              otherUserName = profile?.username;
            }
          }

          // Get last message
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            participant_count: count || 0,
            other_user_name: otherUserName,
            last_message: lastMessage?.content,
          };
        })
      );

      setConversations(enrichedConversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'direct') {
      return conv.other_user_name || 'Direct Message';
    }
    return conv.name || 'Group Chat';
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (conversations.length === 0) {
    return (
      <Card className="p-8 text-center bg-card/50 backdrop-blur-sm border-white/10">
        <p className="text-muted-foreground">No conversations yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Start a new conversation to get started
        </p>
      </Card>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2">
        {conversations.map((conv) => (
          <Card
            key={conv.id}
            className={`p-4 cursor-pointer transition-all hover:bg-accent/20 ${
              selectedConversationId === conv.id ? 'bg-accent/30 border-accent' : 'bg-card/50 backdrop-blur-sm border-white/10'
            }`}
            onClick={() => onSelectConversation(conv.id)}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 bg-gradient-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold truncate flex items-center gap-2">
                    {getConversationName(conv)}
                    {conv.type === 'group' && (
                      conv.is_public ? (
                        <Users className="h-4 w-4 text-accent" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )
                    )}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                  </span>
                </div>
                {conv.last_message && (
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.last_message}
                  </p>
                )}
                {conv.type === 'group' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {conv.participant_count} members
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
