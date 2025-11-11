import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { NewConversationDialog } from "@/components/chat/NewConversationDialog";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

const Messages = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    loadProfile(session.user.id);
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast.error("Error loading profile");
    }
  };

  const handleDisconnect = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-bg">
      <Header
        walletAddress={user.id}
        tokenBalance={profile?.token_balance || 0}
        onDisconnect={handleDisconnect}
      />

      <div className="container py-8">
        <div className="grid md:grid-cols-[350px,1fr] gap-4 h-[calc(100vh-200px)]">
          {/* Conversation List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Messages</h2>
              <Button
                onClick={() => setShowNewConversation(true)}
                size="sm"
                className="gap-2"
              >
                <MessageSquarePlus className="h-4 w-4" />
                New
              </Button>
            </div>
            <ConversationList
              userId={user.id}
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
            />
          </div>

          {/* Chat Window */}
          <div className="flex flex-col">
            {selectedConversationId ? (
              <ChatWindow
                conversationId={selectedConversationId}
                userId={user.id}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquarePlus className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <NewConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        userId={user.id}
        onConversationCreated={setSelectedConversationId}
      />
    </div>
  );
};

export default Messages;
