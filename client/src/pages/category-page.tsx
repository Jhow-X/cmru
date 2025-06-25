import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Helmet } from 'react-helmet';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import GptCard from '@/components/gpt-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Gpt } from '@shared/schema';

export default function CategoryPage() {
  // Get the category from the URL
  const [, params] = useRoute<{ categoryName: string }>('/category/:categoryName');
  const categoryName = params?.categoryName ? decodeURIComponent(params.categoryName) : '';
  const formattedCategoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
  
  // Fetch GPTs for this category
  const { 
    data: gpts, 
    isLoading 
  } = useQuery<Gpt[]>({
    queryKey: ["/api/category/gpts", { categoryName }],
    enabled: !!categoryName,
  });
  
  // Log para debug
  console.log(`Buscando GPTs para categoria "${categoryName}"`, { gpts });
  
  // Set document title
  useEffect(() => {
    document.title = `${formattedCategoryName} | GPT da Câmara Regional de Caruaru do TJPE`;
  }, [formattedCategoryName]);
  
  return (
    <>
      <Helmet>
        <title>{formattedCategoryName} | GPT da Câmara Regional de Caruaru do TJPE</title>
        <meta 
          name="description" 
          content={`Explore GPTs especializados em ${formattedCategoryName} na plataforma da Câmara Regional de Caruaru do TJPE.`}
        />
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{formattedCategoryName}</h1>
          <p className="text-neutral-400">
            GPTs especializados em {formattedCategoryName}
          </p>
        </div>
        
        {isLoading ? (
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
        ) : gpts && gpts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {gpts.map((gpt) => (
              <GptCard key={gpt.id} gpt={gpt} gridView />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-secondary-bg rounded-lg">
            <i className="ri-search-line text-5xl text-accent mb-4"></i>
            <h3 className="text-xl font-medium mb-2">Nenhum GPT encontrado</h3>
            <p className="text-neutral-400 max-w-md mx-auto">
              Não encontramos nenhum GPT na categoria {formattedCategoryName}. Em breve adicionaremos novos GPTs.
            </p>
          </div>
        )}
      </main>
      
      <Footer />
    </>
  );
}