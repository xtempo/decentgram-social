import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

interface WalletConnectProps {
  onConnect: (address: string) => void;
}

export const WalletConnect = ({ onConnect }: WalletConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    
    try {
      // Check if MetaMask is installed
      if (typeof (window as any).ethereum !== 'undefined') {
        // Request account access
        const accounts = await (window as any).ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (accounts.length > 0) {
          const address = accounts[0];
          onConnect(address);
          toast.success("Wallet connected successfully!", {
            description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`
          });
        }
      } else {
        // MetaMask is not installed
        toast.error("MetaMask not detected", {
          description: "Please install MetaMask to use DecentGram"
        });
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      toast.error("Failed to connect wallet", {
        description: "Please try again"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button
      onClick={connectWallet}
      disabled={isConnecting}
      className="relative overflow-hidden bg-gradient-primary hover:shadow-glow-primary transition-all duration-300 font-semibold"
      size="lg"
    >
      <Wallet className="mr-2 h-5 w-5" />
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
};
