import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Gpt } from "@shared/schema";
import GptCard from "@/components/gpt-card";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid, List } from "lucide-react";

export default function FavoritesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Fetch user's favorite GPTs
  const { data: favorites = [], isLoading } = useQuery<Gpt[]>({
    queryKey: ["/api/favorites"],
  });
  
  // Set document title
  document.title = "GPT da Câmara Regional de Caruaru do TJPE - Favoritos";
  
  return (
    <div className="flex flex-col min-h-screen bg-primary-bg">
      <Header />
      
      <div className="flex flex-1">
        {!isMobile && <Sidebar activeItem="favorites" />}
        
        <main className={`flex-1 ${!isMobile ? "ml-64" : ""} p-6`}>
          <div className="container mx-auto max-w-7xl">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Meus Favoritos</h1>
              
              <div className="flex space-x-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  aria-label="Visualização em grade"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  aria-label="Visualização em lista"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-60">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
              </div>
            ) : favorites.length === 0 ? (
              <div className="bg-secondary p-8 rounded-lg shadow-md text-center">
                <i className="ri-bookmark-line text-6xl text-neutral-400 mb-4"></i>
                <h2 className="text-xl font-semibold mb-2">Nenhum favorito encontrado</h2>
                <p className="text-neutral-200 mb-4">
                  Você ainda não adicionou nenhum GPT aos seus favoritos.
                </p>
                <Button asChild>
                  <a href="/">Explorar GPTs</a>
                </Button>
              </div>
            ) : (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                : "flex flex-col space-y-4"
              }>
                {favorites.map((gpt) => (
                  <GptCard 
                    key={gpt.id} 
                    gpt={gpt} 
                    badge="Favorito"
                    gridView={viewMode === "grid"} 
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}