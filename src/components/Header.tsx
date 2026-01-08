import { Link } from "react-router-dom";
import { Coins, User, LogOut, MessageSquare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";

interface HeaderProps {
  walletAddress: string | null;
  tokenBalance: number;
  onDisconnect: () => void;
}

export const Header = ({ walletAddress, tokenBalance, onDisconnect }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary" />
          <Link to="/">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              DecentGram
            </h1>
          </Link>
        </div>

        {walletAddress && (
          <div className="flex items-center gap-4">
            <Link to="/tokens">
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 hover:bg-secondary/80 transition-colors cursor-pointer">
                <Coins className="h-5 w-5 text-accent" />
                <span className="font-semibold text-accent">{tokenBalance.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">$GRAM</span>
              </div>
            </Link>

            <Link to="/tokens">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Tokens
              </Button>
            </Link>

            <NotificationsDropdown />

            <Link to="/messages">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Messages
              </Button>
            </Link>

            <Link to="/profile">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <User className="h-4 w-4" />
                Profile
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
