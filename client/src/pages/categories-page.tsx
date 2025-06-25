import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import CategoryCard from '@/components/category-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Category } from '@shared/schema';

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch all categories
  const { 
    data: categories, 
    isLoading: categoriesLoading 
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Filter categories based on search
  const filteredCategories = categories?.filter(
    category => category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <>
      <Helmet>
        <title>Todas as Categorias | GPT da Câmara Regional de Caruaru do TJPE</title>
        <meta 
          name="description" 
          content="Explore todas as categorias de GPTs disponíveis na plataforma da Câmara Regional de Caruaru do TJPE."
        />
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Todas as Categorias</h1>
            <p className="text-neutral-400">
              Explore todas as áreas de especialização jurídica disponíveis
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 w-full md:w-72">
            <Input
              type="text"
              placeholder="Buscar categorias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        {categoriesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {Array(12).fill(0).map((_, index) => (
              <div key={index} className="bg-secondary-bg p-4 rounded-lg text-center">
                <Skeleton className="w-16 h-16 rounded-full mx-auto mb-3" />
                <Skeleton className="h-5 w-24 mx-auto" />
              </div>
            ))}
          </div>
        ) : filteredCategories && filteredCategories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {filteredCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-secondary-bg rounded-lg">
            <i className="ri-search-line text-5xl text-accent mb-4"></i>
            <h3 className="text-xl font-medium mb-2">Nenhuma categoria encontrada</h3>
            <p className="text-neutral-400 max-w-md mx-auto">
              Não encontramos nenhuma categoria correspondente à sua busca. Tente usar termos diferentes.
            </p>
          </div>
        )}
      </main>
      
      <Footer />
    </>
  );
}