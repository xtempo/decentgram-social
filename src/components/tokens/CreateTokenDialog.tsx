import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Coins, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CreateTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  gramBalance: number;
  onTokenCreated: () => void;
}

const TOKEN_CREATION_COST = 1000; // Cost in $GRAM to create a token

export const CreateTokenDialog = ({
  open,
  onOpenChange,
  userId,
  gramBalance,
  onTokenCreated,
}: CreateTokenDialogProps) => {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [totalSupply, setTotalSupply] = useState("1000000");
  const [pricePerToken, setPricePerToken] = useState("0.001");
  const [creating, setCreating] = useState(false);

  const canAfford = gramBalance >= TOKEN_CREATION_COST;

  const handleCreate = async () => {
    if (!name.trim() || !symbol.trim()) {
      toast.error("Please fill in token name and symbol");
      return;
    }

    if (symbol.length > 10) {
      toast.error("Symbol must be 10 characters or less");
      return;
    }

    if (!canAfford) {
      toast.error(`You need at least ${TOKEN_CREATION_COST} $GRAM to create a token`);
      return;
    }

    setCreating(true);

    try {
      // Deduct creation cost
      const { error: deductError } = await supabase
        .from("profiles")
        .update({ token_balance: gramBalance - TOKEN_CREATION_COST })
        .eq("user_id", userId);

      if (deductError) throw deductError;

      // Create the token
      const { data: tokenData, error: tokenError } = await supabase
        .from("tokens")
        .insert({
          creator_id: userId,
          name: name.trim(),
          symbol: symbol.toUpperCase().trim(),
          description: description.trim() || null,
          total_supply: parseInt(totalSupply) || 1000000,
          circulating_supply: 0,
          price_per_token: parseFloat(pricePerToken) || 0.001,
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      // Record the creation transaction
      await supabase.from("token_transactions").insert({
        user_id: userId,
        token_id: tokenData.id,
        transaction_type: "create",
        amount: 0,
        price_per_token: parseFloat(pricePerToken) || 0.001,
        total_cost: TOKEN_CREATION_COST,
      });

      // Give creator initial supply (10% of total)
      const initialAllocation = Math.floor(parseInt(totalSupply) * 0.1);
      await supabase.from("user_tokens").insert({
        user_id: userId,
        token_id: tokenData.id,
        balance: initialAllocation,
      });

      // Update circulating supply
      await supabase
        .from("tokens")
        .update({ circulating_supply: initialAllocation })
        .eq("id", tokenData.id);

      toast.success(`Token ${symbol.toUpperCase()} created! You received ${initialAllocation.toLocaleString()} tokens.`);
      onTokenCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating token:", error);
      toast.error("Failed to create token. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName("");
    setSymbol("");
    setDescription("");
    setTotalSupply("1000000");
    setPricePerToken("0.001");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Create Your Token
          </DialogTitle>
          <DialogDescription>
            Launch your own token on DecentGram. Cost: {TOKEN_CREATION_COST} $GRAM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!canAfford && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                Insufficient balance. You need {TOKEN_CREATION_COST} $GRAM (you have {gramBalance})
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Token Name *</Label>
            <Input
              id="name"
              placeholder="e.g., My Awesome Token"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol * (max 10 chars)</Label>
            <Input
              id="symbol"
              placeholder="e.g., MAT"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is your token about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supply">Total Supply</Label>
              <Input
                id="supply"
                type="number"
                placeholder="1000000"
                value={totalSupply}
                onChange={(e) => setTotalSupply(e.target.value)}
                min="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (in $GRAM)</Label>
              <Input
                id="price"
                type="number"
                placeholder="0.001"
                value={pricePerToken}
                onChange={(e) => setPricePerToken(e.target.value)}
                step="0.0001"
                min="0.0001"
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
            <p className="font-medium">Token Creation Summary</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creation Cost:</span>
              <span>{TOKEN_CREATION_COST} $GRAM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initial Allocation (10%):</span>
              <span>{Math.floor(parseInt(totalSupply || "0") * 0.1).toLocaleString()} tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available for Sale:</span>
              <span>{Math.floor(parseInt(totalSupply || "0") * 0.9).toLocaleString()} tokens</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !canAfford || !name.trim() || !symbol.trim()}
            className="bg-gradient-primary"
          >
            {creating ? "Creating..." : `Create Token (${TOKEN_CREATION_COST} $GRAM)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
