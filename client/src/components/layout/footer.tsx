import { Link } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-primary-light py-8 px-6">
      <div className="container mx-auto">
        <div className="flex flex-wrap justify-between">
          <div className="w-full md:w-1/4 mb-6 md:mb-0">
            <div className="flex items-center mb-4">
              <i className="ri-scales-3-line text-2xl text-accent mr-2"></i>
              <h2 className="text-xl font-bold">GPT da Câmara Regional de Caruaru</h2>
            </div>
            <p className="text-neutral-200 text-sm mb-6">
              Plataforma de Inteligência Artificial desenvolvida para auxiliar no trabalho jurídico, 
              trazendo eficiência e precisão nas atividades diárias.
            </p>
          </div>
          
          <div className="w-full md:w-1/4 mb-6 md:mb-0 mt-6 md:mt-0">
            <h4 className="text-lg font-semibold mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/">
                  <a className="text-neutral-200 hover:text-accent transition">Início</a>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <a className="text-neutral-200 hover:text-accent transition">Quem Somos</a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="w-full md:w-1/4 mb-6 md:mb-0">
            <h4 className="text-lg font-semibold mb-4">Recursos</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://portal.tjpe.jus.br/web/tribunal-de-justica/camara-regional-caruaru" target="_blank" rel="noopener noreferrer" className="text-neutral-200 hover:text-accent transition">
                  Portal TJPE
                </a>
              </li>
              <li>
                <a href="https://portal.tjpe.jus.br/web/transmissao-das-sessoes/1-turma-da-camara-regional-caruaru" target="_blank" rel="noopener noreferrer" className="text-neutral-200 hover:text-accent transition">
                  Sessões 1ª Turma
                </a>
              </li>
              <li>
                <a href="https://portal.tjpe.jus.br/web/transmissao-das-sessoes/2-turma-da-camara-regional-caruaru" target="_blank" rel="noopener noreferrer" className="text-neutral-200 hover:text-accent transition">
                  Sessões 2ª Turma
                </a>
              </li>
            </ul>
          </div>
          
          <div className="w-full md:w-1/4">
            <h4 className="text-lg font-semibold mb-4">Contato</h4>
            <ul className="space-y-2">
              <li className="flex items-center text-neutral-200">
                <i className="ri-mail-line mr-2"></i> contato@tjpe.jus.br
              </li>
              <li className="flex items-center text-neutral-200">
                <i className="ri-phone-line mr-2"></i> +55 81 3725-7647
              </li>
              <li className="flex items-center text-neutral-200">
                <i className="ri-map-pin-line mr-2"></i> Caruaru, PE
              </li>
            </ul>
            
            <div className="mt-4 flex space-x-4">
              <a href="#" className="text-neutral-200 hover:text-accent transition" aria-label="LinkedIn">
                <i className="ri-linkedin-box-fill text-xl"></i>
              </a>
              <a href="#" className="text-neutral-200 hover:text-accent transition" aria-label="Twitter">
                <i className="ri-twitter-fill text-xl"></i>
              </a>
              <a href="#" className="text-neutral-200 hover:text-accent transition" aria-label="YouTube">
                <i className="ri-youtube-fill text-xl"></i>
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-neutral-800 mt-8 pt-6 flex flex-wrap justify-between items-center">
          <p className="text-sm text-neutral-400">© {currentYear} GPT da Câmara Regional de Caruaru do TJPE. Todos os direitos reservados.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link href="/terms">
              <a className="text-sm text-neutral-400 hover:text-accent transition">Termos de Uso</a>
            </Link>
            <Link href="/privacy">
              <a className="text-sm text-neutral-400 hover:text-accent transition">Política de Privacidade</a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
