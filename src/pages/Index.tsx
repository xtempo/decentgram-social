import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Feed } from "@/components/Feed";
import { Post } from "@/components/PostCard";
import { toast } from "sonner";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadPosts();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user);
        if (session?.user) {
          loadProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    if (session?.user) {
      loadProfile(session.user.id);
    }
    setLoading(false);
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
      console.error("Error loading profile:", error);
    }
  };

  const loadPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username");

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData.map(p => [p.user_id, p.username]));

      const formattedPosts: Post[] = postsData.map((post) => ({
        id: post.id,
        author: profilesMap.get(post.user_id) || "Anonymous",
        authorAddress: post.user_id,
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
      console.error("Error loading posts:", error);
    }
  };

  const handleWalletConnect = () => {
    navigate("/auth");
  };

  const handleDisconnect = async () => {
    await supabase.auth.signOut();
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

      if (user) {
        handleEarn(5);
      }
    } catch (error: any) {
      toast.error("Error liking post");
    }
  };

  const handlePost = async (content: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content,
          media_url: mediaUrl,
          media_type: mediaType,
        })
        .select()
        .single();

      if (error) throw error;

      const newPost: Post = {
        id: data.id,
        author: profile?.username || "You",
        authorAddress: user.id,
        content: data.content,
        mediaUrl: data.media_url,
        mediaType: data.media_type as 'image' | 'video' | undefined,
        timestamp: new Date(data.created_at).getTime(),
        likes: data.likes,
        comments: 0,
        shares: data.shares,
        tokenReward: 25,
      };

      setPosts([newPost, ...posts]);
      handleEarn(25);
      toast.success("Post created! Earned 25 $GRAM");
    } catch (error: any) {
      toast.error("Error creating post");
    }
  };

  const handleEarn = async (amount: number) => {
    if (!user || !profile) return;

    try {
      const newBalance = profile.token_balance + amount;
      const { error } = await supabase
        .from("profiles")
        .update({ token_balance: newBalance })
        .eq("user_id", user.id);

      if (error) throw error;
      setProfile({ ...profile, token_balance: newBalance });
    } catch (error: any) {
      console.error("Error updating token balance:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      <Header 
        walletAddress={user?.id}
        tokenBalance={profile?.token_balance || 0}
        onDisconnect={handleDisconnect}
      />
      
      <Hero 
        onWalletConnect={handleWalletConnect}
        isConnected={!!user}
      />

      {user && (
        <div className="container">
          <Feed 
            posts={posts}
            onLike={handleLike}
            onPost={handlePost}
            onEarn={handleEarn}
          />
        </div>
      )}
    </div>
  );
};

export default Index;
