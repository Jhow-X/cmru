import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function HeroBanner() {
  const [, navigate] = useLocation();
  
  const handleGetStarted = () => {
    // Navigate to the first featured GPT or a specific page
    navigate("#featured");
  };
  
  return (
    <div className="relative h-[50vh] bg-gradient-to-r from-primary to-secondary-dark flex items-center">
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="w-full h-full object-cover opacity-20 bg-[url('https://images.unsplash.com/photo-1589994965851-a8f479c573a9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center"
          aria-hidden="true"
        />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            GPTs da Câmara Regional de Caruaru do TJPE
          </h1>
          <p className="text-xl text-neutral-200 mb-8">
            Acesse GPTs especializados para auxiliar no trabalho judiciário e otimizar suas decisões.
          </p>
          <Button 
            className="bg-accent hover:bg-accent-hover text-white font-medium py-3 px-6 rounded-lg shadow-lg flex items-center h-12"
            onClick={handleGetStarted}
          >
            <i className="ri-play-circle-line mr-2 text-xl"></i>
            Começar Agora
          </Button>
        </div>
      </div>
    </div>
  );
}
