import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Monitor, 
  QrCode, 
  UserCheck, 
  Cpu, 
  ClipboardList, 
  Lock, 
  LayoutDashboard, 
  ArrowRight, 
  ChevronRight, 
  Clock, 
  MessageSquare, 
  Search, 
  CheckCircle2,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import logoEsquadromil from '@/assets/logo-esquadromil.png';

const pros = [
  { title: "Redução de Chamados Repetitivos", desc: "IA e base de conhecimento resolvem dúvidas comuns antes de virarem tickets.", icon: MessageSquare },
  { title: "Fluxos de Trabalho Ágeis", desc: "Aprovação e resolução de demandas internas com menos burocracia manual.", icon: Clock },
  { title: "Dados para Tomada de Decisão", desc: "Relatórios precisos sobre gargalos operacionais e performance setorial.", icon: BarChart3 },
  { title: "Segurança de Dados Internos", desc: "Protocolos rígidos que protegem informações estratégicas da empresa.", icon: Lock }
];

export default function Landing() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const navigate = useNavigate();
  const { role, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % pros.length);
    }, 4000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      const roleRoutes: Record<string, string> = {
        ti: '/ti',
        guarita: '/guarita',
        colaborador: '/colaborador',
      };
      navigate(roleRoutes[role] || '/login');
    }
  }, [isAuthenticated, isLoading, role, navigate]);

  if (isLoading) {
    return <LoadingPage message="Verificando sessão..." />;
  }

  const handleAccessClick = () => {
    navigate('/login');
  };

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Navegação */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={logoEsquadromil} alt="Esquadromil" className="h-8 w-8 object-contain" style={{ filter: isScrolled ? 'none' : 'brightness(0) invert(1)' }} />
            <span className={`text-xl font-bold tracking-tight ${isScrolled ? 'text-blue-900' : 'text-white'}`}>
              ESQUADROMIL
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => handleScrollTo('sistema')} className={`text-sm font-medium hover:opacity-70 transition-opacity ${isScrolled ? 'text-slate-600' : 'text-white/90'}`}>O Sistema</button>
            <button onClick={() => handleScrollTo('modulos')} className={`text-sm font-medium hover:opacity-70 transition-opacity ${isScrolled ? 'text-slate-600' : 'text-white/90'}`}>Módulos</button>
            <button onClick={() => handleScrollTo('seguranca')} className={`text-sm font-medium hover:opacity-70 transition-opacity ${isScrolled ? 'text-slate-600' : 'text-white/90'}`}>Segurança</button>
            <button 
              onClick={handleAccessClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-semibold transition-colors shadow-lg shadow-blue-900/20"
            >
              Acesso Interno
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative bg-blue-900 min-h-[85vh] flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:40px_40px]"></div>
        </div>
        <div className="absolute -bottom-48 -right-48 w-[600px] h-[600px] bg-blue-700 rounded-full blur-[120px] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-800/50 border border-blue-400/30 rounded-full text-blue-100 text-xs font-semibold tracking-wider uppercase mb-6">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              Infraestrutura Crítica
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
              Portal <span className="text-blue-400">Esquadromil</span>
            </h1>
            <p className="text-xl text-blue-100/80 mb-10 leading-relaxed max-w-2xl">
              Sistema interno corporativo de alta performance. Gestão centralizada para chamados de TI, agendamentos inteligentes e controle rigoroso de acesso e operações.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleAccessClick}
                className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all flex items-center gap-2 group shadow-xl shadow-blue-950/40"
              >
                Iniciar Acesso
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Carrossel Automático */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="w-full md:w-1/2">
                <h2 className="text-blue-900 font-bold text-sm uppercase tracking-widest mb-4">Vantagens Competitivas</h2>
                <div className="h-48 flex items-center">
                  <div key={activeSlide} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">{pros[activeSlide].title}</h3>
                    <p className="text-lg text-slate-600">{pros[activeSlide].desc}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-8">
                  {pros.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveSlide(idx)}
                      className={`h-1.5 rounded-full transition-all duration-500 ${activeSlide === idx ? 'w-8 bg-blue-600' : 'w-2 bg-slate-300'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="relative">
                  <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl animate-pulse">
                    {React.createElement(pros[activeSlide].icon, { size: 48 })}
                  </div>
                  <div className="absolute -top-4 -right-4 bg-green-500 text-white p-2 rounded-full shadow-lg">
                    <CheckCircle2 size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section id="sistema" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-blue-900 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-8 h-px bg-blue-600"></div>
                O Ecossistema Operacional
              </h2>
              <h3 className="text-4xl font-bold text-slate-900 mb-6">
                Controle total, <br />rastreabilidade absoluta.
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                O Portal Esquadromil não é apenas uma aplicação, é a espinha dorsal de nossas operações diárias. Desenvolvido para unificar processos complexos numa interface intuitiva e altamente segura.
              </p>
              
              <div className="space-y-6">
                {[
                  { title: "Acesso Exclusivo", desc: "Sistema fechado, sem registo público. Controle rigoroso de permissões pelo setor de TI.", icon: Lock },
                  { title: "Gestão Centralizada", desc: "Unificação de protocolos operacionais numa única plataforma robusta.", icon: ClipboardList },
                  { title: "Eficiência", desc: "Automação de fluxos que reduzem o tempo de resposta operacional em até 40%.", icon: Clock }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="mt-1 bg-blue-50 p-2 rounded-lg text-blue-600">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">{item.title}</h4>
                      <p className="text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center relative group">
                <div className="w-5/6 h-5/6 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transform group-hover:scale-105 transition-transform duration-500">
                  <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <div className="ml-4 h-5 w-32 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex-1 p-6 space-y-4">
                    <div className="h-32 bg-blue-50 rounded-lg border border-blue-100 p-4">
                      <div className="w-1/3 h-4 bg-blue-200 rounded mb-4"></div>
                      <div className="grid grid-cols-4 gap-2">
                         {[1,2,3,4].map(i => <div key={i} className="h-12 bg-white rounded shadow-sm"></div>)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grelha de Módulos */}
      <section id="modulos" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-blue-700 font-bold text-sm uppercase tracking-widest mb-4">Arquitetura de Módulos</h2>
            <h3 className="text-4xl font-bold text-slate-900">Soluções integradas para cada necessidade operacional</h3>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Chamados de TI */}
            <div className="group bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-900 text-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Monitor className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-700 transition-colors">Chamados de TI</h4>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-1 shrink-0 group-hover:translate-x-1 transition-transform" />
                  <span>Abertura inteligente com preenchimento automático</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-1 shrink-0 group-hover:translate-x-1 transition-transform" />
                  <span>Acompanhamento em tempo real via Kanban</span>
                </li>
              </ul>
            </div>

            {/* Agendamentos QR */}
            <div className="group bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <QrCode className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">Agendamentos QR</h4>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-1 shrink-0 group-hover:translate-x-1 transition-transform" />
                  <span>Emissão de códigos com validade temporal</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-1 shrink-0 group-hover:translate-x-1 transition-transform" />
                  <span>Validação instantânea na entrada e saída</span>
                </li>
              </ul>
            </div>

            {/* Painel de Guarita */}
            <div className="group bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
              <div className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <UserCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-slate-700 transition-colors">Painel de Guarita</h4>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-1 shrink-0 group-hover:translate-x-1 transition-transform" />
                  <span>Terminal de validação para segurança</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-1 shrink-0 group-hover:translate-x-1 transition-transform" />
                  <span>Zero papel: registo 100% digitalizado</span>
                </li>
              </ul>
            </div>

            {/* Inteligência Artificial */}
            <div className="group bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-400 text-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Cpu className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-500 transition-colors">Inteligência Artificial</h4>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-1 shrink-0 group-hover:translate-x-1 transition-transform" />
                  <span>Triagem inicial automatizada de incidentes</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-1 shrink-0 group-hover:translate-x-1 transition-transform" />
                  <span>Sugestão de chamados via IA</span>
                </li>
              </ul>
            </div>

            {/* Gestão e Auditoria */}
            <div className="group bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 md:col-span-2">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="w-12 h-12 bg-blue-100 text-blue-900 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-900 transition-colors">Gestão e Auditoria</h4>
                  <p className="text-slate-600 mb-6">Tomada de decisão baseada em governança clara.</p>
                  <ul className="space-y-3 text-slate-600">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-blue-600 mt-1 shrink-0 group-hover:translate-x-1 transition-transform" />
                      <span>Transparência e conformidade em processos internos</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 group-hover:bg-blue-50 transition-colors duration-300">
                   <div className="flex justify-between items-end h-32 gap-2">
                      <div className="w-full bg-blue-200 h-[30%] rounded-t group-hover:h-[45%] transition-all duration-500"></div>
                      <div className="w-full bg-blue-300 h-[60%] rounded-t group-hover:h-[75%] transition-all duration-500 delay-75"></div>
                      <div className="w-full bg-blue-600 h-[90%] rounded-t group-hover:h-[100%] transition-all duration-500 delay-100"></div>
                      <div className="w-full bg-blue-800 h-[75%] rounded-t group-hover:h-[85%] transition-all duration-500 delay-150"></div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="seguranca" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-slate-50 rounded-3xl p-8 md:p-16 border border-slate-200 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-blue-700 font-bold mb-6">
                <ShieldCheck className="w-6 h-6" />
                <span>SEGURANÇA CORPORATIVA</span>
              </div>
              <h3 className="text-4xl font-bold text-slate-900 mb-6">Um sistema fechado projetado para segurança</h3>
              <p className="text-lg text-slate-600 mb-8">
                O Portal Esquadromil opera em ambiente controlado. A segurança é a base da plataforma.
              </p>
              <div className="grid grid-cols-2 gap-y-6">
                {["Sem registo público", "Usuários via TI", "Logs de sessão", "Criptografia de ponta"].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <ChevronRight className="w-3 h-3" />
                    </div>
                    <span className="font-semibold text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full md:w-1/3 flex justify-center">
              <div className="w-48 h-48 bg-blue-900 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl transition-transform hover:rotate-0 duration-500">
                <Lock className="w-20 h-20 text-blue-400 -rotate-12" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="bg-slate-900 text-white pt-16 pb-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 border-b border-slate-800 pb-12">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <img src={logoEsquadromil} alt="Esquadromil" className="h-8 w-8 object-contain brightness-0 invert" />
                <span className="text-xl font-bold tracking-tight">ESQUADROMIL</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Sistemas internos de alta confiabilidade para suporte operacional e infraestrutura estratégica.
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest">Status do Sistema</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-slate-300 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Sistemas Online - Estável</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Última atualização: Hoje, 15:00</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest">Apoio Interno</h4>
              <div className="space-y-3">
                <button onClick={handleAccessClick} className="flex items-center gap-2 text-slate-300 text-sm hover:text-white transition-colors">
                  <Search className="w-4 h-4 text-blue-500" />
                  <span>Base de Conhecimento</span>
                </button>
                <button onClick={handleAccessClick} className="flex items-center gap-2 text-slate-300 text-sm hover:text-white transition-colors">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span>Ticket de Suporte</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4">
            <div className="flex flex-col items-center md:items-start gap-1">
              <p className="text-slate-500 text-xs tracking-wider uppercase font-semibold">
                © 2026 Esquadromil | Uso Interno Exclusivo
              </p>
              <p className="text-blue-500 font-bold text-sm">
                Desenvolvido por TI Esquadromil
              </p>
            </div>
            
            <div className="flex gap-4">
              <div className="px-3 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-400 border border-slate-700">
                VERSÃO 2.0
              </div>
              <div className="px-3 py-1 bg-blue-900/30 rounded text-[10px] font-bold text-blue-400 border border-blue-800/50 uppercase">
                LGPD COMPLIANCE
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
