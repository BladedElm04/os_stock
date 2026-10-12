
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Bell, Boxes, CheckCircle2, ChevronDown,
  ClipboardList, Clock3, Hammer, LayoutDashboard, Package,
  Plus, Search, Settings, Users, Wrench, Zap
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type Status =
  | 'aberta'
  | 'em_diagnostico'
  | 'aguardando_aprovacao'
  | 'aguardando_peca'
  | 'em_conserto'
  | 'pronta'
  | 'entregue'
  | 'cancelada';

type DbOrder = {
  id: number;
  numero: number;
  status: Status;
  data_entrada: string | null;
  valor_total: number | string | null;
  defeito_relatado: string | null;
  clientes: { nome: string } | null;
  equipamentos: {
    tipo: string;
    marca: string | null;
    modelo: string | null;
  } | null;
};

type Order = {
  id: number;
  number: string;
  customer: string;
  equipment: string;
  problem: string;
  status: string;
  date: string;
  value: number;
  rawStatus: Status;
};

type StockItem = {
  id: number;
  nome: string;
  quantidade_atual: number | string;
  estoque_minimo: number | string;
  unidade: string;
};

const statusInfo: Record<Status, { label: string; css: string }> = {
  aberta: { label: 'Aberta', css: 'blue' },
  em_diagnostico: { label: 'Em diagnóstico', css: 'blue' },
  aguardando_aprovacao: { label: 'Aguardando aprovação', css: 'amber' },
  aguardando_peca: { label: 'Aguardando peça', css: 'amber' },
  em_conserto: { label: 'Em conserto', css: 'violet' },
  pronta: { label: 'Pronta para entrega', css: 'green' },
  entregue: { label: 'Entregue', css: 'green' },
  cancelada: { label: 'Cancelada', css: 'amber' },
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const formatDate = (value: string | null) => {
  if (!value) return 'Sem data';

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const equipmentName = (equipment: DbOrder['equipamentos']) => {
  if (!equipment) return 'Equipamento não informado';

  return [
    equipment.tipo,
    equipment.marca,
    equipment.modelo,
  ].filter(Boolean).join(' · ');
};

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('Visão geral');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase não está configurado.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [ordersResult, stockResult] = await Promise.all([
        supabase
          .from('ordens_servico')
          .select(`
            id,
            numero,
            status,
            data_entrada,
            valor_total,
            defeito_relatado,
            clientes ( nome ),
            equipamentos ( tipo, marca, modelo )
          `)
          .order('criado_em', { ascending: false })
          .limit(100),

        supabase
          .from('pecas')
          .select('id, nome, quantidade_atual, estoque_minimo, unidade')
          .eq('ativo', true)
          .order('nome'),
      ]);

      if (ordersResult.error) {
        console.error('Erro ao consultar ordens:', ordersResult.error);
        throw new Error(
          `Ordens de serviço: ${ordersResult.error.message}`
        );
      }

      if (stockResult.error) {
        console.error('Erro ao consultar estoque:', stockResult.error);
        throw new Error(
          `Estoque: ${stockResult.error.message}`
        );
      }

      const rows = (ordersResult.data ?? []) as unknown as DbOrder[];

      setOrders(rows.map(row => ({
        id: row.id,
        number: `OS-${String(row.numero).padStart(6, '0')}`,
        customer: row.clientes?.nome ?? 'Cliente não informado',
        equipment: equipmentName(row.equipamentos),
        problem: row.defeito_relatado ?? 'Sem descrição do defeito',
        status: statusInfo[row.status]?.label ?? row.status,
        date: formatDate(row.data_entrada),
        value: Number(row.valor_total ?? 0),
        rawStatus: row.status,
      })));

      setStock((stockResult.data ?? []) as StockItem[]);
    } catch (err) {
      console.error('Erro ao carregar dados do OS Stock:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os dados.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const term = search.toLocaleLowerCase('pt-BR').trim();

    return orders.filter(order =>
      [
        order.number,
        order.customer,
        order.equipment,
        order.problem,
        order.status,
      ].some(value =>
        value.toLocaleLowerCase('pt-BR').includes(term)
      )
    );
  }, [orders, search]);

  const inProgress = orders.filter(order =>
    [
      'aberta',
      'em_diagnostico',
      'aguardando_aprovacao',
      'aguardando_peca',
      'em_conserto',
    ].includes(order.rawStatus)
  );

  const waitingParts = orders.filter(
    order => order.rawStatus === 'aguardando_peca'
  );

  const ready = orders.filter(
    order => order.rawStatus === 'pronta'
  );

  const openValue = inProgress.reduce(
    (total, order) => total + order.value,
    0
  );

  const lowStock = stock.filter(
    item => Number(item.quantidade_atual) <= Number(item.estoque_minimo)
  );

  const nav = [
    { label: 'Visão geral', icon: LayoutDashboard },
    { label: 'Ordens de serviço', icon: ClipboardList },
    { label: 'Clientes', icon: Users },
    { label: 'Estoque', icon: Boxes },
    { label: 'Relatórios', icon: Activity },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Zap size={22} /></div>
          <div><b>OS Stock</b><small>Assistência técnica</small></div>
        </div>

        <p className="nav-label">MENU PRINCIPAL</p>

        <nav>
          {nav.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={`nav-item ${section === item.label ? 'active' : ''}`}
                onClick={() => setSection(item.label)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setSection('Configurações')}>
            <Settings size={18} /><span>Configurações</span>
          </button>

          <div className="privacy">
            <CheckCircle2 size={18} />
            <b>Seus dados protegidos</b>
            <p>Acesso privado para você e sua família.</p>
          </div>

          <div className="user">
            <div className="avatar">OS</div>
            <div><b>Assistência técnica</b><small>Usuário conectado</small></div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>OS Stock <span>/</span> {section}</div>

          <div className="top-actions">
            <span className="connection">
              <i className={isSupabaseConfigured ? 'ok' : ''} />
              {isSupabaseConfigured ? 'Supabase conectado' : 'Não configurado'}
            </span>
            <button className="icon-button" aria-label="Notificações">
              <Bell size={18} />
            </button>
            <div className="avatar">OS</div>
          </div>
        </header>

        <div className="page">
          <section className="welcome">
            <div>
              <p className="eyebrow">PAINEL DE CONTROLE</p>
              <h1>Bem-vindo! 👋</h1>
              <p>Acompanhe os serviços e mantenha tudo em ordem.</p>
            </div>

            <button className="primary" onClick={() => setModal(true)}>
              <Plus size={18} /> Nova ordem de serviço
            </button>
          </section>

          {error && (
            <div className="notice">
              <Wrench size={18} />
              <span>
                <b>Erro ao carregar dados:</b> {error}
                <button className="link-button" onClick={() => void loadData()}>
                  Tentar novamente
                </button>
              </span>
            </div>
          )}

          {section !== 'Visão geral' && (
            <div className="notice">
              <Wrench size={18} />
              <span>
                <b>{section}</b> terá sua tela própria na próxima etapa.
                Os dados do painel já são consultados no Supabase.
              </span>
            </div>
          )}

          <section className="stats">
            <article className="stat">
              <div>
                <span>Ordens em andamento</span>
                <div className="stat-icon blue"><ClipboardList size={19} /></div>
              </div>
              <strong>{loading ? '—' : inProgress.length}</strong>
              <small>Ordens cadastradas em andamento</small>
            </article>

            <article className="stat">
              <div>
                <span>Aguardando peças</span>
                <div className="stat-icon amber"><Package size={19} /></div>
              </div>
              <strong>{loading ? '—' : waitingParts.length}</strong>
              <small>Precisam de peças para continuar</small>
            </article>

            <article className="stat">
              <div>
                <span>Prontas para entrega</span>
                <div className="stat-icon green"><CheckCircle2 size={19} /></div>
              </div>
              <strong>{loading ? '—' : ready.length}</strong>
              <small>Aguardando retirada</small>
            </article>

            <article className="stat">
              <div>
                <span>Valor das OS em andamento</span>
                <div className="stat-icon violet"><Activity size={19} /></div>
              </div>
              <strong className="money">
                {loading ? '—' : money(openValue)}
              </strong>
              <small>Soma das ordens em andamento</small>
            </article>
          </section>

          <section className="columns">
            <article className="panel orders">
              <div className="panel-head">
                <div>
                  <h2>Ordens recentes</h2>
                  <p>Dados consultados no banco de dados.</p>
                </div>
                <button className="link-button" onClick={() => setSection('Ordens de serviço')}>
                  Ver todas ↗
                </button>
              </div>

              <div className="toolbar">
                <div className="search">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Buscar por OS, cliente ou aparelho..."
                  />
                </div>
                <button className="filter" onClick={() => void loadData()}>
                  Atualizar
                </button>
              </div>

              <div className="order-list">
                {loading && <div className="empty">Carregando ordens...</div>}

                {!loading && !error && filtered.map(order => (
                  <div className="order" key={order.id}>
                    <div className="order-icon"><Hammer size={19} /></div>

                    <div className="order-info">
                      <div className="order-title">
                        <b>{order.number}</b>
                        <span className={`badge ${statusInfo[order.rawStatus]?.css ?? 'blue'}`}>
                          {order.status}
                        </span>
                      </div>
                      <strong>{order.customer}</strong>
                      <p>{order.equipment} · {order.problem}</p>
                    </div>

                    <div className="order-meta">
                      <b>{money(order.value)}</b>
                      <small><Clock3 size={13} />{order.date}</small>
                    </div>
                  </div>
                ))}

                {!loading && !error && filtered.length === 0 && (
                  <div className="empty">
                    {orders.length === 0
                      ? 'Ainda não existem ordens de serviço cadastradas.'
                      : 'Nenhuma ordem encontrada.'}
                  </div>
                )}
              </div>

              <div className="panel-foot">
                Mostrando {filtered.length} de {orders.length} ordens
                <button className="link-button" onClick={() => setSection('Ordens de serviço')}>
                  Abrir lista completa ↗
                </button>
              </div>
            </article>

            <div className="right-col">
              <article className="panel">
                <div className="panel-head">
                  <div><h2>Acesso rápido</h2><p>Atalhos para o dia a dia.</p></div>
                </div>

                <button className="quick" onClick={() => setModal(true)}>
                  <span className="stat-icon blue"><Plus size={18} /></span>
                  <span><b>Nova ordem de serviço</b><small>Registrar um aparelho</small></span>
                  <span>↗</span>
                </button>

                <button className="quick" onClick={() => setSection('Clientes')}>
                  <span className="stat-icon green"><Users size={18} /></span>
                  <span><b>Clientes</b><small>Consultar cadastros</small></span>
                  <span>↗</span>
                </button>

                <button className="quick" onClick={() => setSection('Estoque')}>
                  <span className="stat-icon amber"><Package size={18} /></span>
                  <span><b>Estoque</b><small>Consultar peças</small></span>
                  <span>↗</span>
                </button>
              </article>

              <article className="panel stock">
                <div className="panel-head">
                  <div><h2>Estoque baixo</h2><p>Itens no limite ou abaixo do mínimo.</p></div>
                </div>

                {loading && <div className="empty">Carregando estoque...</div>}

                {!loading && lowStock.map(item => (
                  <div className="stock-item" key={item.id}>
                    <Package size={16} />
                    <span>
                      <b>{item.nome}</b>
                      <small>
                        Mínimo: {Number(item.estoque_minimo)} {item.unidade}
                      </small>
                    </span>
                    <strong>
                      {Number(item.quantidade_atual)} {item.unidade}
                    </strong>
                  </div>
                ))}

                {!loading && lowStock.length === 0 && (
                  <div className="empty">Nenhum item com estoque baixo.</div>
                )}

                <button className="link-button" onClick={() => setSection('Estoque')}>
                  Ver estoque completo ↗
                </button>
              </article>
            </div>
          </section>

          <footer>
            OS Stock · Assistência técnica
            <span>● Dados consultados no Supabase.</span>
          </footer>
        </div>
      </main>

      {modal && (
        <div className="backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget) setModal(false);
        }}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-head">
              <div>
                <p className="eyebrow">ATENDIMENTO</p>
                <h2>Nova ordem de serviço</h2>
              </div>
              <button className="close" onClick={() => setModal(false)}>×</button>
            </div>

            <p className="modal-desc">
              O cadastro de ordens será conectado ao banco na próxima etapa.
            </p>

            <label>Cliente<input placeholder="Nome do cliente" disabled /></label>
            <label>Equipamento<input placeholder="Ex.: Máquina de lavar Electrolux" disabled /></label>
            <label>Defeito relatado<textarea rows={3} placeholder="Descreva o problema" disabled /></label>

            <div className="modal-actions">
              <button className="secondary" onClick={() => setModal(false)}>Fechar</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}