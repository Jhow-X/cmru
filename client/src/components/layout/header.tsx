import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import UserMenu from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Listen for scroll events to add shadow to header when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle search submit
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      toast({
        title: "Campo vazio",
        description: "Digite um termo para buscar GPTs",
        variant: "destructive",
      });
      return;
    }
    
    // Redirecionar para a página inicial com o parâmetro de pesquisa
    setLocation(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    
    // Fechar o menu móvel caso esteja aberto
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };
  
  return (
    <header className={`bg-primary-light py-4 px-6 sticky top-0 z-50 transition-all ${scrolled ? 'shadow-md' : ''}`}>
      <div className="flex flex-wrap items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center">
          <Link href="/">
            <a className="flex items-center">
              <i className="ri-scales-3-line text-2xl text-accent mr-2"></i>
              <h1 className="text-lg font-bold">GPT da Câmara Regional de Caruaru do TJPE</h1>
            </a>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link href="/">
                  <a className={`hover:text-accent transition ${location === '/' ? 'text-accent' : ''}`}>
                    Início
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/favorites">
                  <a className={`hover:text-accent transition ${location === '/favorites' ? 'text-accent' : ''}`}>
                    Favoritos
                  </a>
                </Link>
              </li>
              {/* Admin-only menu item */}
              {user && user.role === 'admin' && (
                <li>
                  <Link href="/admin">
                    <a className={`hover:text-accent transition ${location === '/admin' ? 'text-accent' : ''}`}>
                      Administração
                    </a>
                  </Link>
                </li>
              )}
              {/* Magistrate-only menu item */}
              {user && (user.role === 'magistrate' || user.role === 'admin') && (
                <li>
                  <Link href="/my-gpts">
                    <a className={`hover:text-accent transition ${location === '/my-gpts' ? 'text-accent' : ''}`}>
                      Meus GPTs
                    </a>
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
        
        <div className="flex items-center">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mr-4 hidden md:block w-64">
            <SearchInput
              type="text"
              placeholder="Buscar GPTs..."
              value={searchQuery}
              onChange={handleSearchChange}
              onSearch={handleSearch}
            />
          </form>
          
          {/* User Menu */}
          <UserMenu />
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="ml-4 md:hidden"
            onClick={toggleMobileMenu}
            aria-label="Toggle Menu"
          >
            <i className={`ri-${isMobileMenuOpen ? 'close' : 'menu'}-line text-2xl`}></i>
          </Button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-4">
          <nav className="flex flex-col space-y-3">
            <Link href="/">
              <a className={`hover:text-accent transition ${location === '/' ? 'text-accent' : ''}`}>
                Início
              </a>
            </Link>
            <Link href="/favorites">
              <a className={`hover:text-accent transition ${location === '/favorites' ? 'text-accent' : ''}`}>
                Favoritos
              </a>
            </Link>
            {user && (user.role === 'magistrate' || user.role === 'admin') && (
              <Link href="/my-gpts">
                <a className={`hover:text-accent transition ${location === '/my-gpts' ? 'text-accent' : ''}`}>
                  Meus GPTs
                </a>
              </Link>
            )}
            {user && user.role === 'admin' && (
              <Link href="/admin">
                <a className={`hover:text-accent transition ${location === '/admin' ? 'text-accent' : ''}`}>
                  Administração
                </a>
              </Link>
            )}
            
            {/* Mobile search */}
            <form onSubmit={handleSearch} className="mt-2">
              <SearchInput
                type="text"
                placeholder="Buscar GPTs..."
                value={searchQuery}
                onChange={handleSearchChange}
                onSearch={handleSearch}
              />
            </form>
          </nav>
        </div>
      )}
    </header>
  );
}
