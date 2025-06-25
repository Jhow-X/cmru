import { ReactNode, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScrollableSectionProps = {
  title: string;
  children: ReactNode;
  id: string;
  className?: string;
};

export default function ScrollableSection({ 
  title, 
  children, 
  id,
  className 
}: ScrollableSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = direction === 'left' ? -300 : 300;
    
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };
  
  return (
    <section className={cn("mb-16", className)} id={id}>
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      
      <div className="relative">
        {/* Navigation Arrows */}
        <Button
          variant="outline"
          className="absolute -left-4 top-1/2 transform -translate-y-1/2 bg-secondary-dark rounded-full w-10 h-10 p-0 hidden md:flex items-center justify-center z-10 border-0 hover:bg-primary-light"
          onClick={() => scroll('left')}
          aria-label="Rolar para a esquerda"
        >
          <i className="ri-arrow-left-s-line text-xl"></i>
        </Button>
        
        {/* Scrollable Content */}
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto pb-4 scrollbar-hide"
        >
          {children}
        </div>
        
        <Button
          variant="outline"
          className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-secondary-dark rounded-full w-10 h-10 p-0 hidden md:flex items-center justify-center z-10 border-0 hover:bg-primary-light"
          onClick={() => scroll('right')}
          aria-label="Rolar para a direita"
        >
          <i className="ri-arrow-right-s-line text-xl"></i>
        </Button>
      </div>
    </section>
  );
}
