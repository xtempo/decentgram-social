import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onConversationCreated: (conversationId: string) => void;
}

interface User {
  user_id: string;
  username: string;
}

export const NewConversationDialog = ({
  open,
  onOpenChange,
  userId,
  onConversationCreated,
}: NewConversationDialogProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      loadUsers();
      setSelectedUsers([]);
      setGroupName("");
      setIsPublic(false);
      setSearchQuery("");
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username")
        .neq("user_id", userId);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateDirectMessage = async () => {
    if (selectedUsers.length !== 1) {
      toast.error("Please select exactly one user for a direct message");
      return;
    }

    setLoading(true);
    try {
      // Check if conversation already exists
      const { data: existingParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      if (existingParticipants) {
        for (const participant of existingParticipants) {
          const { data: otherParticipants } = await supabase
            .from("conversation_participants")
            .select("user_id, conversation_id")
            .eq("conversation_id", participant.conversation_id);

          if (
            otherParticipants?.length === 2 &&
            otherParticipants.some(p => p.user_id === selectedUsers[0])
          ) {
            // Conversation already exists
            const { data: conv } = await supabase
              .from("conversations")
              .select("id, type")
              .eq("id", participant.conversation_id)
              .single();

            if (conv?.type === 'direct') {
              onConversationCreated(conv.id);
              onOpenChange(false);
              toast.info("Opening existing conversation");
              return;
            }
          }
        }
      }

      // Create new direct conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          type: 'direct',
          created_by: userId,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: conversation.id, user_id: userId },
          { conversation_id: conversation.id, user_id: selectedUsers[0] },
        ]);

      if (participantsError) throw participantsError;

      toast.success("Direct message created");
      onConversationCreated(conversation.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating direct message:", error);
      toast.error("Failed to create direct message");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    if (selectedUsers.length < 1) {
      toast.error("Please select at least one member");
      return;
    }

    setLoading(true);
    try {
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          name: groupName,
          type: 'group',
          is_public: isPublic,
          created_by: userId,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add all participants including creator
      const participants = [
        { conversation_id: conversation.id, user_id: userId },
        ...selectedUsers.map(userId => ({
          conversation_id: conversation.id,
          user_id: userId,
        })),
      ];

      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert(participants);

      if (participantsError) throw participantsError;

      toast.success(`${isPublic ? 'Public' : 'Private'} group created`);
      onConversationCreated(conversation.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userIdToToggle: string) => {
    setSelectedUsers(prev =>
      prev.includes(userIdToToggle)
        ? prev.filter(id => id !== userIdToToggle)
        : [...prev, userIdToToggle]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Start a direct message or create a group chat
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="direct">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">Direct Message</TabsTrigger>
            <TabsTrigger value="group">Group Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4">
            <div className="space-y-2">
              <Label>Search Users</Label>
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="h-64 border rounded-lg p-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.user_id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent/20 ${
                    selectedUsers.includes(user.user_id) ? 'bg-accent/30' : ''
                  }`}
                  onClick={() => toggleUserSelection(user.user_id)}
                >
                  <Checkbox
                    checked={selectedUsers.includes(user.user_id)}
                    onCheckedChange={() => toggleUserSelection(user.user_id)}
                  />
                  <span>{user.username}</span>
                </div>
              ))}
            </ScrollArea>

            <Button
              onClick={handleCreateDirectMessage}
              disabled={loading || selectedUsers.length !== 1}
              className="w-full"
            >
              {loading ? "Creating..." : "Start Direct Message"}
            </Button>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="public"
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked as boolean)}
              />
              <Label htmlFor="public" className="cursor-pointer flex items-center gap-2">
                <Users className="h-4 w-4" />
                Make this group public
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Search Members</Label>
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="h-48 border rounded-lg p-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.user_id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent/20 ${
                    selectedUsers.includes(user.user_id) ? 'bg-accent/30' : ''
                  }`}
                  onClick={() => toggleUserSelection(user.user_id)}
                >
                  <Checkbox
                    checked={selectedUsers.includes(user.user_id)}
                    onCheckedChange={() => toggleUserSelection(user.user_id)}
                  />
                  <span>{user.username}</span>
                </div>
              ))}
            </ScrollArea>

            <p className="text-sm text-muted-foreground">
              Selected: {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''}
            </p>

            <Button
              onClick={handleCreateGroup}
              disabled={loading || !groupName.trim() || selectedUsers.length < 1}
              className="w-full"
            >
              {loading ? "Creating..." : `Create ${isPublic ? 'Public' : 'Private'} Group`}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
