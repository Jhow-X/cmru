import { Helmet } from 'react-helmet';
import { Link } from 'wouter';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>Quem Somos | GPT da Câmara Regional de Caruaru do TJPE</title>
        <meta 
          name="description" 
          content="Conheça a 1ª Câmara Regional de Caruaru do Tribunal de Justiça de Pernambuco e nosso papel no sistema judicial."
        />
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">Quem Somos</h1>
            <div className="w-20 h-1 bg-accent mb-6"></div>
          </div>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg leading-relaxed text-white">
              A 1ª Câmara Regional de Caruaru do Tribunal de Justiça de Pernambuco foi instalada em 5 de dezembro de 2014, representando um marco na descentralização do Judiciário estadual e aproximando a Justiça de milhões de habitantes do Agreste e Sertão pernambucanos. Desde sua criação, a Câmara tem atuado com o objetivo de garantir maior eficiência e acesso à Justiça no interior do estado, julgando milhares de processos e contribuindo para a regionalização da prestação jurisdicional. A Câmara Regional de Caruaru funciona com duas turmas, cada uma composta por três desembargadores. As turmas têm competência para julgar, em grau de recurso, processos cíveis e criminais oriundos das comarcas de sua jurisdição, conforme definido no Regimento Interno do TJPE. Entre as competências das turmas estão julgar apelações cíveis e criminais, agravos e demais recursos contra decisões de juízes de primeiro grau; processar e julgar mandados de segurança, habeas corpus, habeas data e mandados de injunção, nos casos previstos em lei; julgar ações rescisórias de seus próprios acórdãos e das seções cíveis e de direito público; decidir sobre exceções de suspeição e impedimento de magistrados de primeiro grau vinculados à sua jurisdição; além de processar e julgar incidentes de inconstitucionalidade, reclamações para preservação de competência e garantia da autoridade de suas decisões, pedidos de revisão e reabilitação, incidentes de falsidade e de insanidade mental do acusado, entre outros previstos no Regimento Interno do TJPE. Essas competências reforçam o papel da Câmara Regional de Caruaru como órgão julgador de segundo grau, aproximando o Tribunal de Justiça da população do interior e promovendo maior celeridade e eficiência no julgamento dos processos. Ao longo de sua história, a Câmara contou com a participação de diversos desembargadores que contribuíram para o fortalecimento da Justiça regional, consolidando-se como referência no atendimento jurisdicional fora da capital. A 1ª Câmara Regional de Caruaru segue dedicada a promover a Justiça com qualidade, proximidade e agilidade para a população do interior pernambucano.
            </p>
          </div>
          
          <div className="mt-8">
            <Link href="/">
              <a className="inline-flex items-center text-accent font-medium hover:text-white transition-colors">
                <i className="ri-arrow-left-line mr-2"></i>
                Voltar para a página inicial
              </a>
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </>
  );
}