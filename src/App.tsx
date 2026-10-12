import { useMemo, useState } from 'react';
import { Activity, Bell, Boxes, CheckCircle2, ChevronDown, ClipboardList, Clock3, Hammer, LayoutDashboard, Package, Plus, Search, Settings, Users, Wrench, Zap } from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';

type Status = 'Em diagnóstico' | 'Aguardando peça' | 'Em conserto' | 'Pronta para entrega';
type Order = { number: string; customer: string; equipment: string; problem: string; status: Status; date: string; value: number };
const initialOrders: Order[] = [
  { number: 'OS-2026-000128', customer: 'Marcos Oliveira', equipment: 'Máquina de lavar · Electrolux', problem: 'Não centrifuga', status: 'Em diagnóstico', date: 'Hoje, 08:42', value: 180 },
  { number: 'OS-2026-000127', customer: 'Sandra Martins', equipment: 'Geladeira · Consul', problem: 'Não está refrigerando', status: 'Aguardando peça', date: 'Ontem, 16:10', value: 320 },
  { number: 'OS-2026-000126', customer: 'Paulo Ribeiro', equipment: 'Micro-ondas · Panasonic', problem: 'Não aquece', status: 'Em conserto', date: 'Ontem, 14:35', value: 150 },
  { number: 'OS-2026-000125', customer: 'Luciana Costa', equipment: 'Ventilador · Arno', problem: 'Ruído no motor', status: 'Pronta para entrega', date: '12 out, 10:20', value: 95 },
];
const statusClass: Record<Status, string> = { 'Em diagnóstico': 'blue', 'Aguardando peça': 'amber', 'Em conserto': 'violet', 'Pronta para entrega': 'green' };
const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function App() {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [section, setSection] = useState('Visão geral');
  const filtered = useMemo(() => {
    const term = search.toLocaleLowerCase('pt-BR').trim();
    return orders.filter(o => !term || [o.number, o.customer, o.equipment, o.problem, o.status].some(v => v.toLocaleLowerCase('pt-BR').includes(term)));
  }, [orders, search]);
  const nav = [
    { label: 'Visão geral', icon: LayoutDashboard },
    { label: 'Ordens de serviço', icon: ClipboardList },
    { label: 'Clientes', icon: Users },
    { label: 'Estoque', icon: Boxes },
    { label: 'Relatórios', icon: Activity },
  ];
  function createDemo() {
    setOrders(current => [{ number: `OS-2026-${String(129 + current.length - initialOrders.length).padStart(6, '0')}`, customer: 'Novo cliente (exemplo)', equipment: 'Eletrodoméstico não informado', problem: 'Descreva o defeito na próxima etapa', status: 'Em diagnóstico', date: 'Agora', value: 0 }, ...current]);
    setModal(false);
  }
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Zap size={22}/></div><div><b>OS Stock</b><small>Assistência técnica</small></div></div>
      <p className="nav-label">MENU PRINCIPAL</p>
      <nav>{nav.map(n => { const Icon = n.icon; return <button key={n.label} className={`nav-item ${section === n.label ? 'active' : ''}`} onClick={() => setSection(n.label)}><Icon size={18}/><span>{n.label}</span></button>; })}</nav>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => setSection('Configurações')}><Settings size={18}/><span>Configurações</span></button><div className="privacy"><CheckCircle2 size={18}/><b>Seus dados protegidos</b><p>Acesso privado para você e sua família.</p></div><div className="user"><div className="avatar">OS</div><div><b>Assistência técnica</b><small>Administrador</small></div><ChevronDown size={15}/></div></div>
    </aside>
    <main>
      <header className="topbar"><div>OS Stock <span>/</span> {section}</div><div className="top-actions"><span className="connection"><i className={isSupabaseConfigured ? 'ok' : ''}/>{isSupabaseConfigured ? 'Supabase configurado' : 'Modo demonstração'}</span><button className="icon-button" aria-label="Notificações"><Bell size={18}/></button><div className="avatar">OS</div></div></header>
      <div className="page">
        <section className="welcome"><div><p className="eyebrow">PAINEL DE CONTROLE</p><h1>Bom dia! ☀️</h1><p>Acompanhe os serviços e mantenha tudo em ordem.</p></div><button className="primary" onClick={() => setModal(true)}><Plus size={18}/> Nova ordem de serviço</button></section>
        {section !== 'Visão geral' && <div className="notice"><Wrench size={18}/><span><b>{section}</b> será implementado nas próximas etapas. Esta versão inicial é uma prévia visual.</span></div>}
        <section className="stats">
          <article className="stat"><div><span>Ordens em andamento</span><div className="stat-icon blue"><ClipboardList size={19}/></div></div><strong>12</strong><small><b>+3 novas</b> nesta semana</small></article>
          <article className="stat"><div><span>Aguardando peças</span><div className="stat-icon amber"><Package size={19}/></div></div><strong>03</strong><small><b>Atenção</b> para concluir</small></article>
          <article className="stat"><div><span>Prontas para entrega</span><div className="stat-icon green"><CheckCircle2 size={19}/></div></div><strong>04</strong><small><b>Finalizadas</b> aguardam retirada</small></article>
          <article className="stat"><div><span>Valores em aberto</span><div className="stat-icon violet"><Activity size={19}/></div></div><strong className="money">R$ 1.245,00</strong><small>Ordens não pagas</small></article>
        </section>
        <section className="columns">
          <article className="panel orders">
            <div className="panel-head"><div><h2>Ordens recentes</h2><p>Acompanhe os atendimentos mais recentes.</p></div><button className="link-button" onClick={() => setSection('Ordens de serviço')}>Ver todas ↗</button></div>
            <div className="toolbar"><div className="search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por OS, cliente ou aparelho..."/></div><button className="filter">Filtrar</button></div>
            <div className="order-list">{filtered.map(o => <div className="order" key={o.number}><div className="order-icon"><Hammer size={19}/></div><div className="order-info"><div className="order-title"><b>{o.number}</b><span className={`badge ${statusClass[o.status]}`}>{o.status}</span></div><strong>{o.customer}</strong><p>{o.equipment} · {o.problem}</p></div><div className="order-meta"><b>{money(o.value)}</b><small><Clock3 size={13}/>{o.date}</small></div></div>)}{filtered.length === 0 && <div className="empty">Nenhuma ordem encontrada.</div>}</div>
            <div className="panel-foot">Mostrando {filtered.length} de {orders.length} ordens <button className="link-button" onClick={() => setSection('Ordens de serviço')}>Abrir lista completa ↗</button></div>
          </article>
          <div className="right-col">
            <article className="panel"><div className="panel-head"><div><h2>Acesso rápido</h2><p>Atalhos para o dia a dia.</p></div></div>
              <button className="quick" onClick={() => setModal(true)}><span className="stat-icon blue"><Plus size={18}/></span><span><b>Nova ordem de serviço</b><small>Registrar um aparelho</small></span><span>↗</span></button>
              <button className="quick" onClick={() => setSection('Clientes')}><span className="stat-icon green"><Users size={18}/></span><span><b>Cadastrar cliente</b><small>Nome e contato</small></span><span>↗</span></button>
              <button className="quick" onClick={() => setSection('Estoque')}><span className="stat-icon amber"><Package size={18}/></span><span><b>Adicionar peça</b><small>Entrada no estoque</small></span><span>↗</span></button>
            </article>
            <article className="panel stock"><div className="panel-head"><div><h2>Estoque baixo</h2><p>Itens que merecem atenção.</p></div></div><div className="stock-item"><Zap size={16}/><span><b>Fusível térmico 10A</b><small>Estoque mínimo: 5 un.</small></span><strong>2 un.</strong></div><div className="stock-item"><Zap size={16}/><span><b>Capacitor 35 µF</b><small>Estoque mínimo: 4 un.</small></span><strong>1 un.</strong></div><button className="link-button" onClick={() => setSection('Estoque')}>Ver estoque completo ↗</button></article>
          </div>
        </section>
        <footer>OS Stock · Assistência técnica <span>● Tudo organizado, um serviço de cada vez.</span></footer>
      </div>
    </main>
    {modal && <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false); }}><section className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><p className="eyebrow">ATENDIMENTO</p><h2>Nova ordem de serviço</h2></div><button className="close" onClick={() => setModal(false)}>×</button></div><p className="modal-desc">Prévia visual. O formulário será conectado ao PostgreSQL na próxima etapa.</p><label>Cliente<input placeholder="Nome do cliente"/></label><label>Equipamento<input placeholder="Ex.: Máquina de lavar Electrolux"/></label><label>Defeito relatado<textarea rows={3} placeholder="Descreva o problema informado pelo cliente"/></label><div className="modal-actions"><button className="secondary" onClick={() => setModal(false)}>Cancelar</button><button className="primary" onClick={createDemo}><Plus size={17}/> Criar exemplo</button></div></section></div>}
  </div>;
}