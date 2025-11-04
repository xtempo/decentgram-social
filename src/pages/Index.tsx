import { useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Feed } from "@/components/Feed";
import { Post } from "@/components/PostCard";

const Index = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(1000);
  const [posts, setPosts] = useState<Post[]>([
    {
      id: "1",
      author: "CryptoCreator",
      authorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      content: "Just minted my first NFT collection on DecentGram! The future of social media is decentralized 🚀",
      timestamp: Date.now() - 3600000,
      likes: 42,
      comments: 8,
      shares: 12,
      tokenReward: 50,
    },
    {
      id: "2",
      author: "Web3Builder",
      authorAddress: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
      content: "Building in Web3 hits different. No gatekeepers, no censorship, just pure innovation. WAGMI! 💎",
      timestamp: Date.now() - 7200000,
      likes: 128,
      comments: 23,
      shares: 45,
      tokenReward: 75,
    },
    {
      id: "3",
      author: "DeFiEnthusiast",
      authorAddress: "0x1aD91ee08f21bE3dE0BA2ba6918E714dA6B45836",
      content: "DecentGram's tokenomics are genius. Earn $GRAM for quality content and engagement. This is how social media should work!",
      timestamp: Date.now() - 10800000,
      likes: 89,
      comments: 15,
      shares: 28,
      tokenReward: 60,
    },
  ]);

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likes: post.likes + 1 }
        : post
    ));
  };

  const handlePost = (content: string, image?: string) => {
    const newPost: Post = {
      id: Date.now().toString(),
      author: "You",
      authorAddress: walletAddress || "0x...",
      content,
      image,
      timestamp: Date.now(),
      likes: 0,
      comments: 0,
      shares: 0,
      tokenReward: 25,
    };
    setPosts([newPost, ...posts]);
  };

  const handleEarn = (amount: number) => {
    setTokenBalance(prev => prev + amount);
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      <Header 
        walletAddress={walletAddress}
        tokenBalance={tokenBalance}
        onDisconnect={handleDisconnect}
      />
      
      <Hero 
        onWalletConnect={handleWalletConnect}
        isConnected={!!walletAddress}
      />

      {walletAddress && (
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
