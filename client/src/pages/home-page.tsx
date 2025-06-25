import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Gpt, Category } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import HeroBanner from "@/components/hero-banner";
import ScrollableSection from "@/components/scrollable-section";
import CategoryCard from "@/components/category-card";
import GptCard from "@/components/gpt-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, Link } from "wouter";

export default function HomePage() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [searchResults, setSearchResults] = useState<Gpt[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Extract search query from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      setSearchQuery(query);
      setIsSearching(true);
    } else {
      setIsSearching(false);
      setSearchQuery("");
    }
  }, [location]);
  
  // Fetch featured GPTs
  const { 
    data: featuredGpts, 
    isLoading: featuredLoading 
  } = useQuery<Gpt[]>({
    queryKey: ["/api/gpts/featured"],
  });
  
  // Fetch new GPTs
  const { 
    data: newGpts, 
    isLoading: newGptsLoading 
  } = useQuery<Gpt[]>({
    queryKey: ["/api/gpts/new"],
  });
  
  // Fetch popular GPTs
  const { 
    data: popularGpts, 
    isLoading: popularGptsLoading 
  } = useQuery<Gpt[]>({
    queryKey: ["/api/gpts/popular"],
  });
  
  // Fetch categorias (filtrando apenas categorias com GPTs)
  const { 
    data: categories, 
    isLoading: categoriesLoading 
  } = useQuery<Category[]>({
    queryKey: ["/api/categories", { onlyWithGpts: true }],
  });
  
  // Fetch user favorites
  const { 
    data: favorites, 
    isLoading: favoritesLoading 
  } = useQuery<Gpt[]>({
    queryKey: ["/api/favorites"],
  });
  
  // Fetch all GPTs for search
  const { 
    data: allGpts,
    isLoading: allGptsLoading 
  } = useQuery<Gpt[]>({
    queryKey: ["/api/gpts"],
    enabled: isSearching, // Only fetch when searching
  });
  
  // Filter GPTs based on search query
  useEffect(() => {
    if (isSearching && allGpts && searchQuery) {
      const query = searchQuery.toLowerCase();
      const results = allGpts.filter(gpt => 
        gpt.title.toLowerCase().includes(query) || 
        gpt.description.toLowerCase().includes(query) ||
        gpt.category.toLowerCase().includes(query)
      );
      setSearchResults(results);
    }
  }, [isSearching, allGpts, searchQuery]);
  
  // Set document title
  useEffect(() => {
    document.title = searchQuery 
      ? `GPT da Câmara Regional de Caruaru do TJPE - Busca: ${searchQuery}` 
      : "GPT da Câmara Regional de Caruaru do TJPE - Início";
  }, [searchQuery]);
  
  // Create skeleton loader for GPT cards
  const GptCardsSkeleton = () => (
    <div className="flex space-x-6 overflow-x-auto pb-4">
      {Array(5).fill(0).map((_, index) => (
        <div key={index} className="flex-shrink-0 w-72">
          <div className="bg-secondary-bg rounded-lg overflow-hidden shadow-lg">
            <Skeleton className="h-40 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between items-center">
                <div className="space-x-2 flex">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
  
  // Create skeleton loader for categories
  const CategoriesSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array(6).fill(0).map((_, index) => (
        <div key={index} className="bg-secondary-bg p-4 rounded-lg text-center">
          <Skeleton className="w-16 h-16 rounded-full mx-auto mb-3" />
          <Skeleton className="h-5 w-24 mx-auto" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-primary-bg">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Banner - Hide on search results */}
        {!isSearching && <HeroBanner />}
        
        {/* Main Content with GPT Categories and Cards */}
        <div className="container mx-auto px-6 py-12">
          {/* Search Results Section */}
          {isSearching && (
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6">
                Resultados para "{searchQuery}"
                <span className="text-sm font-normal ml-2 text-neutral-400">
                  {searchResults.length} {searchResults.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                </span>
              </h2>
              
              {allGptsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array(4).fill(0).map((_, index) => (
                    <div key={index} className="bg-secondary-bg rounded-lg overflow-hidden shadow-lg">
                      <Skeleton className="h-40 w-full" />
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <div className="flex justify-between items-center">
                          <div className="space-x-2 flex">
                            <Skeleton className="h-4 w-10" />
                            <Skeleton className="h-4 w-10" />
                          </div>
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {searchResults.map((gpt) => (
                    <GptCard key={gpt.id} gpt={gpt} gridView />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-secondary-bg rounded-lg">
                  <i className="ri-search-line text-5xl text-accent mb-4"></i>
                  <h3 className="text-xl font-medium mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-neutral-400 max-w-md mx-auto">
                    Não encontramos nenhum GPT correspondente à sua busca. Tente usar termos diferentes.
                  </p>
                </div>
              )}
            </section>
          )}
          
          {/* Content only shown when not searching */}
          {!isSearching && (
            <>
              {/* Featured GPTs Section */}
              <ScrollableSection 
                title="GPTs em Destaque" 
                id="featured"
              >
                {featuredLoading ? (
                  <GptCardsSkeleton />
                ) : (
                  <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide">
                    {featuredGpts?.map((gpt) => (
                      <GptCard key={gpt.id} gpt={gpt} badge="Destaque" />
                    ))}
                  </div>
                )}
              </ScrollableSection>
              
              {/* Favorites Section - Only show if user has favorites */}
              {!favoritesLoading && favorites && favorites.length > 0 && (
                <ScrollableSection 
                  title="Meus Favoritos" 
                  id="favorites"
                  className="mb-16"
                >
                  <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide">
                    {favorites.map((gpt) => (
                      <GptCard key={gpt.id} gpt={gpt} badge="Favorito" />
                    ))}
                  </div>
                </ScrollableSection>
              )}
              
              {/* Categories Section */}
              <section className="mb-16">
                <h2 className="text-2xl font-bold mb-6">Categorias</h2>
                
                {categoriesLoading ? (
                  <CategoriesSkeleton />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {categories?.map((category) => (
                      <CategoryCard key={category.id} category={category} />
                    ))}
                    
                    {/* "Ver Todos" card */}
                    <div 
                      className="bg-secondary-bg p-4 rounded-lg text-center hover:bg-primary-light transition cursor-pointer"
                      onClick={() => window.location.href = '/categories'}
                    >
                      <div className="bg-primary-light w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="ri-more-2-fill text-2xl text-accent"></i>
                      </div>
                      <h3 className="font-medium">Ver Todos</h3>
                    </div>
                  </div>
                )}
              </section>
              
              {/* Recently Added Section */}
              <section className="mb-16">
                <h2 className="text-2xl font-bold mb-6">Adicionados Recentemente</h2>
                
                {newGptsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array(4).fill(0).map((_, index) => (
                      <div key={index} className="bg-secondary-bg rounded-lg overflow-hidden shadow-lg">
                        <Skeleton className="h-40 w-full" />
                        <div className="p-4 space-y-3">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <div className="flex justify-between items-center">
                            <div className="space-x-2 flex">
                              <Skeleton className="h-4 w-10" />
                              <Skeleton className="h-4 w-10" />
                            </div>
                            <Skeleton className="h-8 w-20" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {newGpts?.map((gpt) => (
                      <GptCard key={gpt.id} gpt={gpt} badge="Novo" gridView />
                    ))}
                  </div>
                )}
              </section>
              
              {/* Most Popular Section */}
              <section>
                <h2 className="text-2xl font-bold mb-6">Mais Populares</h2>
                
                {popularGptsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array(4).fill(0).map((_, index) => (
                      <div key={index} className="bg-secondary-bg rounded-lg overflow-hidden shadow-lg">
                        <Skeleton className="h-40 w-full" />
                        <div className="p-4 space-y-3">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <div className="flex justify-between items-center">
                            <div className="space-x-2 flex">
                              <Skeleton className="h-4 w-10" />
                              <Skeleton className="h-4 w-10" />
                            </div>
                            <Skeleton className="h-8 w-20" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {popularGpts?.map((gpt) => (
                      <GptCard key={gpt.id} gpt={gpt} badge="Popular" gridView />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
