import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Gpt } from "@shared/schema";
import GptCard from "@/components/gpt-card";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Grid, List, Plus } from "lucide-react";
import AddGptDialog from "@/components/add-gpt-dialog";

export default function MyGptsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Fetch GPTs created by the current user
  const { data: myGpts = [], isLoading } = useQuery<Gpt[]>({
    queryKey: ["/api/gpts/my"],
  });
  
  // Set document title
  document.title = "GPT da Câmara Regional de Caruaru do TJPE - Meus GPTs";
  
  // Open the dialog to add a new GPT
  const handleNewGpt = () => {
    setDialogOpen(true);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-primary-bg">
      <Header />
      
      <div className="flex flex-1">
        {!isMobile && <Sidebar activeItem="my-gpts" />}
        
        <main className={`flex-1 ${!isMobile ? "ml-64" : ""} p-6`}>
          <div className="container mx-auto max-w-7xl">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Meus GPTs</h1>
              
              <div className="flex space-x-3">
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
                
                <Button onClick={handleNewGpt} className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  Novo GPT
                </Button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-60">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
              </div>
            ) : myGpts.length === 0 ? (
              <div className="bg-secondary p-8 rounded-lg shadow-md text-center">
                <i className="ri-robot-line text-6xl text-neutral-400 mb-4"></i>
                <h2 className="text-xl font-semibold mb-2">Nenhum GPT encontrado</h2>
                <p className="text-neutral-200 mb-4">
                  Você ainda não registrou nenhum GPT na plataforma.
                </p>
                <p className="text-neutral-300 mb-6 text-sm">
                  Como magistrado, você pode compartilhar links para seus GPTs customizados no ChatGPT.
                </p>
                <Button onClick={handleNewGpt} className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  Adicionar novo GPT
                </Button>
              </div>
            ) : (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                : "flex flex-col space-y-4"
              }>
                {myGpts.map((gpt) => (
                  <GptCard 
                    key={gpt.id} 
                    gpt={gpt} 
                    gridView={viewMode === "grid"} 
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      
      <Footer />
      
      {/* Modal para adicionar novo GPT */}
      <AddGptDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}