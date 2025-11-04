import { WalletConnect } from "./WalletConnect";
import { Shield, Coins, Share2 } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

interface HeroProps {
  onWalletConnect: (address: string) => void;
  isConnected: boolean;
}

export const Hero = ({ onWalletConnect, isConnected }: HeroProps) => {
  if (isConnected) return null;

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Welcome to DecentGram
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80 mb-8 max-w-2xl mx-auto">
            The decentralized social platform where you own your content, earn from engagement, and connect without censorship
          </p>
          
          <WalletConnect onConnect={onWalletConnect} />
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 hover:shadow-glow-primary transition-all duration-300">
            <Shield className="h-12 w-12 text-primary mb-4 mx-auto" />
            <h3 className="text-xl font-semibold mb-2">Decentralized</h3>
            <p className="text-muted-foreground">
              Your content stored on IPFS, interactions on-chain. No central authority.
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 hover:shadow-glow-accent transition-all duration-300">
            <Coins className="h-12 w-12 text-accent mb-4 mx-auto" />
            <h3 className="text-xl font-semibold mb-2">Earn $GRAM</h3>
            <p className="text-muted-foreground">
              Get rewarded with tokens for quality content and engagement.
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 hover:shadow-glow-primary transition-all duration-300">
            <Share2 className="h-12 w-12 text-primary mb-4 mx-auto" />
            <h3 className="text-xl font-semibold mb-2">True Ownership</h3>
            <p className="text-muted-foreground">
              You own your data, content, and social graph. Forever.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
