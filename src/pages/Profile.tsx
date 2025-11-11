import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { PostCard, Post } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
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
    loadProfile(session.user.id);
    loadPosts(session.user.id);
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
      setUsername(data.username || "");
      setBio(data.bio || "");
    } catch (error: any) {
      toast.error("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedPosts: Post[] = data.map((post) => ({
        id: post.id,
        author: username || "You",
        authorAddress: userId,
        content: post.content,
        mediaUrl: post.media_url,
        mediaType: post.media_type as 'image' | 'video' | undefined,
        timestamp: new Date(post.created_at).getTime(),
        likes: post.likes,
        comments: 0,
        shares: post.shares,
        tokenReward: 25,
      }));

      setPosts(formattedPosts);
    } catch (error: any) {
      toast.error("Error loading posts");
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username, bio })
        .eq("user_id", profile.user_id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
      setProfile({ ...profile, username, bio });
    } catch (error: any) {
      toast.error("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      const { error } = await supabase
        .from("posts")
        .update({ likes: post.likes + 1 })
        .eq("id", postId);

      if (error) throw error;

      setPosts(posts.map(p => 
        p.id === postId ? { ...p, likes: p.likes + 1 } : p
      ));
    } catch (error: any) {
      toast.error("Error liking post");
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== postId));
      toast.success("Post deleted");
    } catch (error: any) {
      toast.error("Error deleting post");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg">
      <Header
        walletAddress={profile?.user_id}
        tokenBalance={profile?.token_balance || 0}
        onDisconnect={handleDisconnect}
      />

      <div className="container py-8">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 h-fit bg-card/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself"
                  rows={4}
                />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Profile"}
              </Button>

              <div className="pt-4 border-t border-white/10 space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Token Balance</div>
                  <div className="text-2xl font-bold text-primary">{profile?.token_balance || 0} $GRAM</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="text-2xl font-bold text-foreground">{profile?.followers_count || 0}</div>
                    <div className="text-sm text-muted-foreground">Followers</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="text-2xl font-bold text-foreground">{profile?.following_count || 0}</div>
                    <div className="text-sm text-muted-foreground">Following</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold">My Posts ({posts.length})</h2>
            {posts.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No posts yet. Start creating content to earn tokens!
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="relative group">
                  <PostCard
                    post={post}
                    onLike={handleLike}
                    onEarn={() => {}}
                    currentUserId={profile?.user_id}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeletePost(post.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
