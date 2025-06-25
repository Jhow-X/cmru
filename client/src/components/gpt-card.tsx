import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Gpt, Favorite } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink } from "lucide-react";

type GptCardProps = {
  gpt: Gpt;
  badge?: "Destaque" | "Novo" | "Popular" | "Favorito";
  gridView?: boolean;
};

export default function GptCard({ gpt, badge, gridView = false }: GptCardProps) {
  const { toast } = useToast();
  const [isFavorited, setIsFavorited] = useState(false);
  
  // Check if GPT is already in favorites
  const { data: favorites = [] } = useQuery<Gpt[]>({
    queryKey: ["/api/favorites"],
  });
  
  // Update favorited state when favorites data changes
  useEffect(() => {
    if (favorites && favorites.length > 0) {
      const isInFavorites = favorites.some((favorite) => favorite.id === gpt.id);
      setIsFavorited(isInFavorites);
    }
  }, [favorites, gpt.id]);
  
  // Add to favorites mutation
  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      // Certifique-se de que o gptId seja um número
      const res = await apiRequest("POST", "/api/favorites", { 
        gptId: typeof gpt.id === 'string' ? parseInt(gpt.id) : gpt.id 
      });
      return res.json();
    },
    onSuccess: () => {
      setIsFavorited(true);
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
      // Certifique-se de que o gptId seja um número
      const gptId = typeof gpt.id === 'string' ? parseInt(gpt.id) : gpt.id;
      const res = await apiRequest("DELETE", `/api/favorites/${gptId}`);
      return res;
    },
    onSuccess: () => {
      setIsFavorited(false);
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
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Botão de favorito clicado");
    
    if (isFavorited) {
      console.log("Removendo dos favoritos...");
      removeFavoriteMutation.mutate();
    } else {
      console.log("Adicionando aos favoritos...");
      addFavoriteMutation.mutate();
    }
  };
  
  // Handle card click - track view and redirect
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Check if there's a valid URL
    if (!gpt.gptUrl || !gpt.gptUrl.startsWith('http')) {
      toast({
        title: "URL inválido",
        description: "Este GPT não possui um URL válido para acessar no ChatGPT.",
        variant: "destructive",
      });
      return;
    }
    
    // Log view before redirecting
    const logView = async () => {
      try {
        await apiRequest("POST", `/api/gpts/${gpt.id}/view`, {});
      } catch (error) {
        console.error("Failed to log view:", error);
      }
      
      // Redirect to GPT URL (open in new tab)
      window.open(gpt.gptUrl, '_blank');
    };
    
    logView();
  };
  
  // Determine badge background color
  const getBadgeBgColor = () => {
    switch (badge) {
      case "Destaque":
        return "bg-accent";
      case "Novo":
        return "bg-green-900 text-green-200";
      case "Popular":
        return "bg-blue-900 text-blue-200";
      case "Favorito":
        return "bg-purple-900 text-purple-200";
      default:
        return "bg-neutral-800";
    }
  };
  
  // Função para validar se a URL da imagem é válida
  const isValidImageUrl = (url: string): boolean => {
    // Verificar se a URL termina com uma extensão de imagem comum
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const endsWithValidExtension = validExtensions.some(ext => 
      url.toLowerCase().endsWith(ext) || url.toLowerCase().includes(ext + '?')
    );
    
    // Verificar se é uma URL de pesquisa ou de site, não de imagem direta
    const isSearchUrl = 
      url.includes('bing.com/images/search') || 
      url.includes('google.com/search') || 
      url.includes('search?');
    
    // Verifica se é uma URL de CDN de imagem comum
    const isCdnUrl = 
      url.includes('cloudinary.com') || 
      url.includes('imgix.net') || 
      url.includes('cdn.') ||
      url.includes('media.') ||
      url.includes('images.');
      
    console.log('URL de imagem:', url, 'Extensão válida:', endsWithValidExtension, 'É URL de busca:', isSearchUrl);
    
    return (endsWithValidExtension || isCdnUrl) && !isSearchUrl;
  };
  
  return (
    <div onClick={handleCardClick} className={`${gridView ? "" : "flex-shrink-0 w-72"} card-zoom cursor-pointer`}>
      <div className="bg-secondary rounded-lg overflow-hidden shadow-lg h-full">
        <div className="h-40 overflow-hidden relative">
          {gpt.imageUrl && gpt.imageUrl.trim() !== "" && isValidImageUrl(gpt.imageUrl) ? (
            <div className="w-full h-full relative">
              <img 
                src={gpt.imageUrl} 
                alt={gpt.title} 
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                onError={(e) => {
                  // Se a imagem não carregar, esconde-a e mostra o fallback
                  e.currentTarget.style.display = 'none';
                  const fallbackEl = e.currentTarget.nextElementSibling;
                  if (fallbackEl) {
                    fallbackEl.classList.remove('hidden');
                    fallbackEl.classList.add('flex');
                  }
                }}
              />
              <div className="hidden w-full h-full absolute top-0 left-0 bg-primary-light items-center justify-center">
                <i className="ri-robot-line text-6xl text-accent"></i>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-primary-light flex items-center justify-center">
              <i className="ri-robot-line text-6xl text-accent"></i>
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-primary to-transparent">
            <div className="flex justify-between items-center">
              {badge && (
                <span className={`${getBadgeBgColor()} text-xs py-1 px-2 rounded-full`}>
                  {badge}
                </span>
              )}
              
              <div onClick={(e) => e.stopPropagation()}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="text-white hover:text-accent transition z-10"
                        onClick={handleToggleFavorite}
                        disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                      >
                        <i className={`ri-bookmark-${isFavorited ? 'fill' : 'line'}`}></i>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-1">{gpt.title}</h3>
          {gpt.creatorName && (
            <p className="text-accent text-xs mb-2">
              <i className="ri-user-line mr-1"></i>
              Criado por: {gpt.creatorName}
            </p>
          )}
          <p className="text-neutral-200 text-sm mb-4 line-clamp-2">{gpt.description}</p>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-sm text-neutral-200">
                <i className="ri-star-fill text-accent mr-1"></i> {gpt.rating || 0}
              </span>
              <span className="mx-2 text-neutral-500">|</span>
              <span className="text-sm text-neutral-200">
                <i className="ri-eye-line mr-1"></i> {gpt.views}
              </span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Button 
                className="bg-accent hover:bg-accent-hover text-white text-sm py-1 px-3 h-8 rounded flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  if (gpt.gptUrl) window.open(gpt.gptUrl, '_blank');
                }}
              >
                <ExternalLink size={12} />
                Acessar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
