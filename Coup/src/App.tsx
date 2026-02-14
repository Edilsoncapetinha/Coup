import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./contexts/GameContext";
import MainMenu from "./pages/MainMenu";
import GameSetup from "./pages/GameSetup";
import GameBoard from "./pages/GameBoard";

import NotFound from "./pages/NotFound";
import Lobby from "./components/Lobby";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GameProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainMenu />} />
            <Route path="/setup" element={<GameSetup />} />
            <Route path="/game" element={<GameBoard />} />

            <Route path="/lobby" element={
              <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Lobby />
              </div>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
