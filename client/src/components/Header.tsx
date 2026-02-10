import { TrendingUp } from "lucide-react";

export function Header() {
  return (
    <header className="py-6 md:py-8 border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center text-white shadow-lg shadow-gray-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight text-gradient-silver">
              SilverTrack
            </h1>
            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
              Live Market Data
            </p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Connection
          </span>
          <div className="h-4 w-px bg-border" />
          <span>XAG/USD Data Source</span>
        </div>
      </div>
    </header>
  );
}
