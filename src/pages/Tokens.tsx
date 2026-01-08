import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { TokenMarketplace } from "@/components/tokens/TokenMarketplace";
import { CreateTokenDialog } from "@/components/tokens/CreateTokenDialog";
import { MyTokens } from "@/components/tokens/MyTokens";
import { CryptoMarket } from "@/components/tokens/CryptoMarket";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Coins, Wallet, TrendingUp, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const Tokens = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleDisconnect = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        walletAddress={user?.email || null}
        tokenBalance={profile?.token_balance || 0}
        onDisconnect={handleDisconnect}
      />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Coins className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Token Marketplace</h1>
              <p className="text-muted-foreground">Buy, sell, and create tokens</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Your $GRAM Balance</p>
              <p className="text-xl font-bold text-primary">{profile?.token_balance?.toLocaleString() || 0}</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Token
            </Button>
          </div>
        </div>

        <Tabs defaultValue="crypto" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="crypto" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Crypto
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="my-tokens" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              My Tokens
            </TabsTrigger>
            <TabsTrigger value="gram" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              $GRAM
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crypto">
            <CryptoMarket />
          </TabsContent>

          <TabsContent value="marketplace">
            <TokenMarketplace userId={user.id} gramBalance={profile?.token_balance || 0} onBalanceChange={(newBalance) => setProfile({ ...profile, token_balance: newBalance })} />
          </TabsContent>

          <TabsContent value="my-tokens">
            <MyTokens userId={user.id} />
          </TabsContent>

          <TabsContent value="gram">
            <TokenMarketplace userId={user.id} gramBalance={profile?.token_balance || 0} onBalanceChange={(newBalance) => setProfile({ ...profile, token_balance: newBalance })} gramOnly />
          </TabsContent>
        </Tabs>

        <CreateTokenDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
          userId={user.id}
          gramBalance={profile?.token_balance || 0}
          onTokenCreated={() => {
            toast.success("Token created successfully!");
          }}
        />
      </main>
    </div>
  );
};

export default Tokens;
