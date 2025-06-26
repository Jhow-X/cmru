import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Gpt } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, BookmarkPlus, BookmarkCheck, ExternalLink } from "lucide-react";

export default function GptPage() {
  const { id } = useParams();
  const gptId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch GPT details
  const {
    data: gpt,
    isLoading: gptLoading,
    error: gptError
  } = useQuery<Gpt>({
    queryKey: [`/api/gpts/${gptId}`],
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes deste GPT.",
        variant: "destructive",
      });
      navigate("/");
    },
  });

  // Check if GPT is in favorites
  const { data: favorites } = useQuery<Gpt[]>({
    queryKey: ["/api/favorites"],
    onSuccess: (data) => {
      if (data.some(favorite => favorite.id === gptId)) {
        setIsFavorite(true);
      }
    },
  });

  useEffect(() => {
    // Update document title with GPT name
    if (gpt) {
      document.title = `GPT da Câmara Regional de Caruaru do TJPE - ${gpt.title}`;
    }
  }, [gpt]);

  // Add to favorites mutation
  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/favorites", { gptId });
      return await res.json();
    },
    onSuccess: () => {
      setIsFavorite(true);
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Adicionado aos favoritos",
        description: "GPT adicionado aos seus favoritos com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar aos favoritos.",
        variant: "destructive",
      });
    },
  });

  // Remove from favorites mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/favorites/${gptId}`);
      return res;
    },
    onSuccess: () => {
      setIsFavorite(false);
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Removido dos favoritos",
        description: "GPT removido dos seus favoritos com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover dos favoritos.",
        variant: "destructive",
      });
    },
  });

  // Toggle favorite status
  const toggleFavorite = () => {
    if (isFavorite) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  // Open internal chat with GPT
  const openGptChat = async () => {
    if (gpt) {
      try {
        // Log view
        await apiRequest("POST", `/api/gpts/${gptId}/view`, {});
        // Redirect to internal chat
        window.location.href = `/chat?gpt=${gpt.id}`;
      } catch (error) {
        console.error("Failed to log view:", error);
        window.location.href = `/chat?gpt=${gpt.id}`;
      }
    } else {
      toast({
        title: "GPT não encontrado",
        description: "Este GPT não está disponível.",
        variant: "destructive",
      });
    }
  };

  if (isNaN(gptId)) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-primary-bg">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6 hover:bg-primary-light"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        
        {gptLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
        ) : gpt ? (
          <>
            <div className="mb-8">
              <div className="flex flex-col md:flex-row justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{gpt.title}</h1>
                  <div className="flex items-center text-sm text-neutral-200 mb-4">
                    <span className="flex items-center mr-4">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      {gpt.rating || 0}
                    </span>
                    <span className="mr-4">
                      <i className="ri-eye-line mr-1"></i> {gpt.views} visualizações
                    </span>
                    <span>
                      <i className="ri-folder-line mr-1"></i> {gpt.category}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={toggleFavorite}
                    disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                  >
                    {isFavorite ? (
                      <>
                        <BookmarkCheck className="h-4 w-4 text-accent" />
                        Favoritado
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="h-4 w-4" />
                        Favoritar
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* GPT Info */}
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Sobre este GPT</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-2/5 mb-6">
                        {gpt.imageUrl ? (
                          <img
                            src={gpt.imageUrl}
                            alt={gpt.title}
                            className="w-full max-h-60 object-cover rounded-lg mb-4"
                          />
                        ) : (
                          <div className="w-full h-60 bg-secondary flex items-center justify-center rounded-lg mb-4">
                            <i className="ri-robot-line text-6xl text-accent"></i>
                          </div>
                        )}
                      </div>
                      
                      <div className="md:w-3/5">
                        <p className="text-neutral-200 mb-6">{gpt.description}</p>
                        
                        <div className="border-t border-neutral-800 pt-4 mb-6">
                          <h3 className="font-semibold mb-2">Detalhes</h3>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-neutral-300">Categoria:</span>
                              <span>{gpt.category}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-300">Criado em:</span>
                              <span>{new Date(gpt.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-300">Visualizações:</span>
                              <span>{gpt.views}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-300">Avaliação:</span>
                              <span className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-500 mr-1 inline" />
                                {gpt.rating || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-center mt-4">
                          <Button 
                            className="bg-accent hover:bg-accent-hover text-white py-2 px-4 rounded-md w-full md:w-auto flex items-center justify-center gap-2"
                            onClick={openGptChat}
                          >
                            <MessageSquare className="h-4 w-4" />
                            Conversar com este GPT
                          </Button>
                          <p className="text-xs text-neutral-400 mt-2">
                            Você será direcionado para o chat interno para conversar com este GPT
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <i className="ri-error-warning-line text-6xl text-error mb-4"></i>
            <h2 className="text-2xl font-bold mb-2">GPT não encontrado</h2>
            <p className="text-neutral-300 mb-6">
              O GPT que você está procurando não existe ou foi removido.
            </p>
            <Button 
              className="bg-accent hover:bg-accent-hover"
              onClick={() => navigate("/")}
            >
              Voltar para a Página Inicial
            </Button>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}

// Redirect component
function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  
  useEffect(() => {
    navigate(to);
  }, [navigate, to]);
  
  return null;
}
