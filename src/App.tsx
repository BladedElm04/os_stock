
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity, Bell, Boxes, CheckCircle2,
  ClipboardList, Clock3, Hammer, LayoutDashboard, LogOut, Package, Pencil, Trash2,
  Plus, Printer, Search, Settings, Users, Wrench, Zap
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
  prioridade: string;
  previsao_entrega: string | null;
  diagnostico: string | null;
  servico_executado: string | null;
  observacoes: string | null;
  valor_mao_obra: number | string;
  desconto: number | string;
  garantia_dias: number;
  clientes: {
    nome: string;
    telefone: string | null;
    email: string | null;
    cpf_cnpj: string | null;
    endereco: string | null;
    numero_endereco: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
  } | null;
  equipamentos: {
    tipo: string;
    marca: string | null;
    modelo: string | null;
    numero_serie: string | null;
    cor: string | null;
    acessorios: string | null;
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
  priority: string;
  dueDate: string | null;
  diagnosis: string | null;
  service: string | null;
  notes: string | null;
  labor: number;
  discount: number;
  warrantyDays: number;
  customerPhone: string | null;
  customerEmail: string | null;
  customerDocument: string | null;
  customerAddress: string;
  equipmentSerial: string | null;
  equipmentColor: string | null;
  equipmentAccessories: string | null;
};

type StockItem = {
  id: number;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  marca: string | null;
  quantidade_atual: number | string;
  estoque_minimo: number | string;
  unidade: string;
  custo_unitario: number | string;
  preco_venda: number | string;
  localizacao: string | null;
};

type Client = {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf_cnpj: string | null;
  cep: string | null;
  endereco: string | null;
  numero_endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
};

type ClientDraft = Omit<Client, 'id'>;

type StockDraft = {
  codigo: string;
  nome: string;
  descricao: string;
  categoria: string;
  marca: string;
  unidade: string;
  estoque_minimo: string;
  custo_unitario: string;
  preco_venda: string;
  localizacao: string;
};

type Equipment = {
  id: number;
  cliente_id: number;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  cor: string | null;
  acessorios: string | null;
  defeito_relatado: string | null;
  observacoes: string | null;
  clientes: { nome: string } | null;
};

type EquipmentDraft = {
  cliente_id: string;
  tipo: string;
  marca: string;
  modelo: string;
  numero_serie: string;
  cor: string;
  acessorios: string;
  defeito_relatado: string;
  observacoes: string;
};

type ReportOrder = {
  id: number;
  status: Status;
  valor_total: number | string;
  data_entrada: string;
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

const formatCalendarDate = (value: string | null) => {
  if (!value) return 'Não informada';

  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
};

const equipmentName = (equipment: DbOrder['equipamentos']) => {
  if (!equipment) return 'Equipamento não informado';

  return [
    equipment.tipo,
    equipment.marca,
    equipment.modelo,
  ].filter(Boolean).join(' · ');
};

type AppProps = {
  userEmail: string;
  userId: string;
  onLogout: () => void;
};

export default function App({ userEmail, userId, onLogout }: AppProps) {
  const currentDate = new Date();
  const [orders, setOrders] = useState<Order[]>([]);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [diagnosisDraft, setDiagnosisDraft] = useState('');
  const [serviceDraft, setServiceDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientDraft, setClientDraft] = useState<ClientDraft | null>(null);
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);
  const [stockDraft, setStockDraft] = useState<StockDraft | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [equipmentDraft, setEquipmentDraft] = useState<EquipmentDraft | null>(null);
  const [search, setSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [section, setSection] = useState('Visão geral');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClientDraft, setNewClientDraft] = useState<ClientDraft>({
    nome: '',
    telefone: '',
    email: '',
    cpf_cnpj: '',
    cep: '',
    endereco: '',
    numero_endereco: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    observacoes: '',
  });
  const [equipmentClientId, setEquipmentClientId] = useState('');
  const [newEquipmentType, setNewEquipmentType] = useState('');
  const [newEquipmentBrand, setNewEquipmentBrand] = useState('');
  const [newEquipmentModel, setNewEquipmentModel] = useState('');
  const [newEquipmentSerial, setNewEquipmentSerial] = useState('');
  const [newEquipmentColor, setNewEquipmentColor] = useState('');
  const [newEquipmentAccessories, setNewEquipmentAccessories] = useState('');
  const [newEquipmentProblem, setNewEquipmentProblem] = useState('');
  const [newEquipmentNotes, setNewEquipmentNotes] = useState('');
  const [orderClientId, setOrderClientId] = useState('');
  const [orderEquipmentId, setOrderEquipmentId] = useState('');
  const [orderProblem, setOrderProblem] = useState('');
  const [orderPriority, setOrderPriority] = useState('normal');
  const [orderLabor, setOrderLabor] = useState('');
  const [orderDiscount, setOrderDiscount] = useState('');
  const [orderDueDate, setOrderDueDate] = useState('');
  const [stockMoveItem, setStockMoveItem] = useState<StockItem | null>(null);
  const [stockMoveType, setStockMoveType] = useState<'entrada' | 'saida'>('entrada');
  const [stockMoveQuantity, setStockMoveQuantity] = useState('');
  const [stockMoveReason, setStockMoveReason] = useState('');
  const [newPartCode, setNewPartCode] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartUnit, setNewPartUnit] = useState('un');
  const [newPartMinimum, setNewPartMinimum] = useState('');
  const [reportMonth, setReportMonth] = useState(
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  );
  const [reportOrders, setReportOrders] = useState<ReportOrder[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase não está configurado.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [ordersResult, stockResult, clientsResult, equipmentsResult] = await Promise.all([
        supabase
          .from('ordens_servico')
          .select(`
            id,
            numero,
            status,
            data_entrada,
            valor_total,
            defeito_relatado,
            prioridade,
            previsao_entrega,
            diagnostico,
            servico_executado,
            observacoes,
            valor_mao_obra,
            desconto,
            garantia_dias,
            clientes ( nome, telefone, email, cpf_cnpj, cep, endereco, numero_endereco, complemento, bairro, cidade, estado ),
            equipamentos ( tipo, marca, modelo, numero_serie, cor, acessorios )
          `)
          .order('criado_em', { ascending: false })
          .limit(100),

        supabase
          .from('pecas')
          .select('id, codigo, nome, descricao, categoria, marca, quantidade_atual, estoque_minimo, unidade, custo_unitario, preco_venda, localizacao')
          .eq('ativo', true)
          .order('nome'),

        supabase
          .from('clientes')
          .select('id, nome, telefone, email, cpf_cnpj, cep, endereco, numero_endereco, complemento, bairro, cidade, estado, observacoes')
          .eq('ativo', true)
          .order('nome'),

        supabase
          .from('equipamentos')
          .select('id, cliente_id, tipo, marca, modelo, numero_serie, cor, acessorios, defeito_relatado, observacoes, clientes ( nome )')
          .order('criado_em', { ascending: false }),
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

      if (clientsResult.error) {
        console.error('Erro ao consultar clientes:', clientsResult.error);
        throw new Error(`Clientes: ${clientsResult.error.message}`);
      }

      if (equipmentsResult.error) {
        console.error('Erro ao consultar equipamentos:', equipmentsResult.error);
        throw new Error(`Equipamentos: ${equipmentsResult.error.message}`);
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
        priority: row.prioridade,
        dueDate: row.previsao_entrega,
        diagnosis: row.diagnostico,
        service: row.servico_executado,
        notes: row.observacoes,
        labor: Number(row.valor_mao_obra ?? 0),
        discount: Number(row.desconto ?? 0),
        warrantyDays: Number(row.garantia_dias ?? 0),
        customerPhone: row.clientes?.telefone ?? null,
        customerEmail: row.clientes?.email ?? null,
        customerDocument: row.clientes?.cpf_cnpj ?? null,
        customerAddress: row.clientes
          ? [
              [row.clientes.endereco, row.clientes.numero_endereco].filter(Boolean).join(', '),
              row.clientes.complemento,
              row.clientes.bairro,
              [row.clientes.cidade, row.clientes.estado].filter(Boolean).join(' - '),
              row.clientes.cep ? `CEP ${row.clientes.cep}` : null,
            ].filter(Boolean).join(' · ')
          : '',
        equipmentSerial: row.equipamentos?.numero_serie ?? null,
        equipmentColor: row.equipamentos?.cor ?? null,
        equipmentAccessories: row.equipamentos?.acessorios ?? null,
      })));

      setStock((stockResult.data ?? []) as StockItem[]);
      setClients((clientsResult.data ?? []) as Client[]);
      setEquipments((equipmentsResult.data ?? []).map(equipment => ({
        ...equipment,
        clientes: equipment.clientes?.[0] ?? null,
      })));
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

  useEffect(() => {
    if (!printOrder) return;

    const previousTitle = document.title;
    document.title = `${printOrder.number} - OS Stock`;
    const closePrint = () => {
      document.title = previousTitle;
      setPrintOrder(null);
    };
    window.addEventListener('afterprint', closePrint);
    const timer = window.setTimeout(() => window.print(), 100);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', closePrint);
      document.title = previousTitle;
    };
  }, [printOrder]);

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

  const filteredClients = useMemo(() => {
    const term = clientSearch.toLocaleLowerCase('pt-BR').trim();
    if (!term) return clients;

    return clients.filter(client =>
      [
        client.nome,
        client.telefone ?? '',
        client.email ?? '',
        client.cpf_cnpj ?? '',
        client.cidade ?? '',
      ].some(value => value.toLocaleLowerCase('pt-BR').includes(term))
    );
  }, [clients, clientSearch]);

  const filteredStock = useMemo(() => {
    const term = stockSearch.toLocaleLowerCase('pt-BR').trim();
    if (!term) return stock;

    return stock.filter(item =>
      [
        item.codigo ?? '',
        item.nome,
        item.descricao ?? '',
        item.categoria ?? '',
        item.marca ?? '',
        item.localizacao ?? '',
      ].some(value => value.toLocaleLowerCase('pt-BR').includes(term))
    );
  }, [stock, stockSearch]);

  const filteredEquipments = useMemo(() => {
    const term = equipmentSearch.toLocaleLowerCase('pt-BR').trim();
    if (!term) return equipments;

    return equipments.filter(equipment => {
      const clientName = equipment.clientes?.nome
        ?? clients.find(client => client.id === equipment.cliente_id)?.nome
        ?? '';
      return [
        clientName,
        equipment.tipo,
        equipment.marca ?? '',
        equipment.modelo ?? '',
        equipment.numero_serie ?? '',
        equipment.cor ?? '',
        equipment.acessorios ?? '',
        equipment.defeito_relatado ?? '',
      ].some(value => value.toLocaleLowerCase('pt-BR').includes(term));
    });
  }, [clients, equipmentSearch, equipments]);

  const loadReports = useCallback(async () => {
    if (!supabase) {
      setReportsError('Supabase não está configurado.');
      return;
    }

    const match = /^(\d{4})-(\d{2})$/.exec(reportMonth);
    if (!match) {
      setReportsError('Selecione um mês válido para consultar o relatório.');
      return;
    }

    setReportsLoading(true);
    setReportsError('');
    setReportOrders([]);
    const [, yearValue, monthValue] = match;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const from = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const until = new Date(Date.UTC(year, month, 1)).toISOString();
    const batchSize = 1000;
    const rows: ReportOrder[] = [];

    try {
      for (let offset = 0; ; offset += batchSize) {
        const { data, error: queryError } = await supabase
          .from('ordens_servico')
          .select('id, status, valor_total, data_entrada')
          .gte('data_entrada', from)
          .lt('data_entrada', until)
          .order('data_entrada', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (queryError) {
          console.error('Erro ao consultar relatório de ordens:', queryError);
          throw new Error(queryError.message);
        }

        const batch = (data ?? []) as ReportOrder[];
        rows.push(...batch);
        if (batch.length < batchSize) break;
      }

      setReportOrders(rows);
    } catch (err) {
      setReportsError(
        err instanceof Error
          ? `Não foi possível carregar o relatório: ${err.message}`
          : 'Não foi possível carregar o relatório.'
      );
    } finally {
      setReportsLoading(false);
    }
  }, [reportMonth]);

  useEffect(() => {
    if (section === 'Relatórios') void loadReports();
  }, [loadReports, section]);

  const loadProfile = useCallback(async () => {
    if (!supabase) return;

    setProfileLoading(true);
    setProfileName('');
    const { data, error: queryError } = await supabase
      .from('perfis')
      .select('nome')
      .eq('id', userId)
      .maybeSingle();
    setProfileLoading(false);

    if (queryError) {
      console.error('Erro ao carregar perfil:', queryError);
      setError(`Não foi possível carregar o perfil: ${queryError.message}`);
      return;
    }

    setProfileName(data?.nome ?? '');
  }, [userId]);

  useEffect(() => {
    if (section === 'Configurações') void loadProfile();
  }, [loadProfile, section]);

  const reportStatusCounts = useMemo(
    () => Object.keys(statusInfo).map(status => ({
      status: status as Status,
      count: reportOrders.filter(order => order.status === status).length,
    })),
    [reportOrders]
  );
  const reportTotalValue = reportOrders.reduce(
    (total, order) => total + Number(order.valor_total ?? 0),
    0
  );
  const reportCompletedValue = reportOrders
    .filter(order => order.status === 'entregue')
    .reduce((total, order) => total + Number(order.valor_total ?? 0), 0);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: saveError } = await supabase
      .from('perfis')
      .upsert({ id: userId, nome: profileName.trim() }, { onConflict: 'id' });

    setSaving(false);
    if (saveError) {
      console.error('Erro ao salvar perfil:', saveError);
      setError(`Não foi possível salvar as configurações: ${saveError.message}`);
      return;
    }

    setSuccess('Nome do perfil salvo.');
  };

  const updateOrderStatus = async (orderId: number, status: Status) => {
    if (!supabase) {
      setError('Supabase não está configurado.');
      return;
    }

    setError('');

    const update = {
      status,
      ...(status === 'pronta' ? { data_conclusao: new Date().toISOString() } : {}),
      ...(status === 'entregue' ? { data_entrega: new Date().toISOString() } : {}),
    };

    const { data: updatedOrders, error: updateError } = await supabase
      .from('ordens_servico')
      .update(update)
      .eq('id', orderId)
      .select('id');

    if (updateError) {
      console.error('Erro ao atualizar status da ordem:', updateError);
      setError(`Não foi possível atualizar o status: ${updateError.message}`);
      return;
    }

    if (!updatedOrders?.length) {
      setError('Nenhuma ordem foi atualizada. Verifique as permissões de acesso.');
      return;
    }

    await loadData();
  };

  const saveOrderDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !editingOrder) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { data: updatedOrders, error: updateError } = await supabase
      .from('ordens_servico')
      .update({
        diagnostico: diagnosisDraft.trim() || null,
        servico_executado: serviceDraft.trim() || null,
        observacoes: notesDraft.trim() || null,
      })
      .eq('id', editingOrder.id)
      .select('id');

    setSaving(false);
    if (updateError) {
      console.error('Erro ao salvar detalhes da ordem:', updateError);
      setError(`Não foi possível salvar os detalhes da OS: ${updateError.message}`);
      return;
    }

    if (!updatedOrders?.length) {
      setError('Nenhuma ordem foi atualizada. Verifique as permissões de acesso.');
      return;
    }

    setEditingOrder(null);
    setSuccess(`Diagnóstico e serviço da ${editingOrder.number} foram salvos.`);
    await loadData();
  };

  const saveClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: insertError } = await supabase.from('clientes').insert({
      nome: newClientDraft.nome.trim(),
      telefone: newClientDraft.telefone?.trim() || null,
      email: newClientDraft.email?.trim() || null,
      cpf_cnpj: newClientDraft.cpf_cnpj?.trim() || null,
      cep: newClientDraft.cep?.trim() || null,
      endereco: newClientDraft.endereco?.trim() || null,
      numero_endereco: newClientDraft.numero_endereco?.trim() || null,
      complemento: newClientDraft.complemento?.trim() || null,
      bairro: newClientDraft.bairro?.trim() || null,
      cidade: newClientDraft.cidade?.trim() || null,
      estado: newClientDraft.estado?.trim().toUpperCase() || null,
      observacoes: newClientDraft.observacoes?.trim() || null,
    });

    setSaving(false);
    if (insertError) {
      console.error('Erro ao cadastrar cliente:', insertError);
      setError(`Não foi possível cadastrar o cliente: ${insertError.message}`);
      return;
    }

    setNewClientDraft({
      nome: '',
      telefone: '',
      email: '',
      cpf_cnpj: '',
      cep: '',
      endereco: '',
      numero_endereco: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      observacoes: '',
    });
    setSuccess('Cliente cadastrado.');
    await loadData();
  };

  const beginClientEdit = (client: Client) => {
    setEditingClient(client);
    setClientDraft({
      nome: client.nome,
      telefone: client.telefone,
      email: client.email,
      cpf_cnpj: client.cpf_cnpj,
      cep: client.cep,
      endereco: client.endereco,
      numero_endereco: client.numero_endereco,
      complemento: client.complemento,
      bairro: client.bairro,
      cidade: client.cidade,
      estado: client.estado,
      observacoes: client.observacoes,
    });
    setError('');
    setSuccess('');
  };

  const saveClientEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !editingClient || !clientDraft) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { data: updated, error: updateError } = await supabase
      .from('clientes')
      .update({
        nome: clientDraft.nome.trim(),
        telefone: clientDraft.telefone?.trim() || null,
        email: clientDraft.email?.trim() || null,
        cpf_cnpj: clientDraft.cpf_cnpj?.trim() || null,
        cep: clientDraft.cep?.trim() || null,
        endereco: clientDraft.endereco?.trim() || null,
        numero_endereco: clientDraft.numero_endereco?.trim() || null,
        complemento: clientDraft.complemento?.trim() || null,
        bairro: clientDraft.bairro?.trim() || null,
        cidade: clientDraft.cidade?.trim() || null,
        estado: clientDraft.estado?.trim().toUpperCase() || null,
        observacoes: clientDraft.observacoes?.trim() || null,
      })
      .eq('id', editingClient.id)
      .select('id');

    setSaving(false);
    if (updateError) {
      console.error('Erro ao atualizar cliente:', updateError);
      setError(`Não foi possível atualizar o cliente: ${updateError.message}`);
      return;
    }
    if (!updated?.length) {
      setError('Nenhum cliente foi atualizado. Verifique as permissões de acesso.');
      return;
    }

    const name = editingClient.nome;
    setEditingClient(null);
    setClientDraft(null);
    setSuccess(`Dados de ${name} atualizados.`);
    await loadData();
  };

  const deactivateClient = async (client: Client) => {
    if (!supabase || !window.confirm(`Desativar o cadastro de ${client.nome}? O histórico e as ordens de serviço serão preservados.`)) return;

    setError('');
    setSuccess('');
    const { data: updated, error: updateError } = await supabase
      .from('clientes')
      .update({ ativo: false })
      .eq('id', client.id)
      .select('id');

    if (updateError) {
      console.error('Erro ao desativar cliente:', updateError);
      setError(`Não foi possível desativar o cliente: ${updateError.message}`);
      return;
    }
    if (!updated?.length) {
      setError('Nenhum cliente foi desativado. Verifique as permissões de acesso.');
      return;
    }

    setSuccess(`Cadastro de ${client.nome} desativado; o histórico foi preservado.`);
    await loadData();
  };

  const beginStockEdit = (item: StockItem) => {
    setEditingStock(item);
    setStockDraft({
      codigo: item.codigo ?? '',
      nome: item.nome,
      descricao: item.descricao ?? '',
      categoria: item.categoria ?? '',
      marca: item.marca ?? '',
      unidade: item.unidade,
      estoque_minimo: String(item.estoque_minimo),
      custo_unitario: String(item.custo_unitario),
      preco_venda: String(item.preco_venda),
      localizacao: item.localizacao ?? '',
    });
    setError('');
    setSuccess('');
  };

  const saveStockEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !editingStock || !stockDraft) return;

    const minimum = Number(stockDraft.estoque_minimo);
    const cost = Number(stockDraft.custo_unitario);
    const price = Number(stockDraft.preco_venda);
    if (![minimum, cost, price].every(value => Number.isFinite(value) && value >= 0)) {
      setError('Estoque mínimo, custo e preço precisam ser números iguais ou maiores que zero.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { data: updated, error: updateError } = await supabase
      .from('pecas')
      .update({
        codigo: stockDraft.codigo.trim() || null,
        nome: stockDraft.nome.trim(),
        descricao: stockDraft.descricao.trim() || null,
        categoria: stockDraft.categoria.trim() || null,
        marca: stockDraft.marca.trim() || null,
        unidade: stockDraft.unidade.trim(),
        estoque_minimo: minimum,
        custo_unitario: cost,
        preco_venda: price,
        localizacao: stockDraft.localizacao.trim() || null,
      })
      .eq('id', editingStock.id)
      .select('id');

    setSaving(false);
    if (updateError) {
      console.error('Erro ao atualizar peça:', updateError);
      setError(`Não foi possível atualizar a peça: ${updateError.message}`);
      return;
    }
    if (!updated?.length) {
      setError('Nenhuma peça foi atualizada. Verifique as permissões de acesso.');
      return;
    }

    const name = editingStock.nome;
    setEditingStock(null);
    setStockDraft(null);
    setSuccess(`Dados de ${name} atualizados.`);
    await loadData();
  };

  const deactivateStockItem = async (item: StockItem) => {
    if (!supabase || !window.confirm(`Desativar a peça ${item.nome}? O saldo e o histórico de movimentações serão preservados.`)) return;

    setError('');
    setSuccess('');
    const { data: updated, error: updateError } = await supabase
      .from('pecas')
      .update({ ativo: false })
      .eq('id', item.id)
      .select('id');

    if (updateError) {
      console.error('Erro ao desativar peça:', updateError);
      setError(`Não foi possível desativar a peça: ${updateError.message}`);
      return;
    }
    if (!updated?.length) {
      setError('Nenhuma peça foi desativada. Verifique as permissões de acesso.');
      return;
    }

    setSuccess(`Peça ${item.nome} desativada; o saldo e o histórico foram preservados.`);
    await loadData();
  };

  const saveEquipment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: insertError } = await supabase.from('equipamentos').insert({
      cliente_id: Number(equipmentClientId),
      tipo: newEquipmentType.trim(),
      marca: newEquipmentBrand.trim() || null,
      modelo: newEquipmentModel.trim() || null,
      numero_serie: newEquipmentSerial.trim() || null,
      cor: newEquipmentColor.trim() || null,
      acessorios: newEquipmentAccessories.trim() || null,
      defeito_relatado: newEquipmentProblem.trim() || null,
      observacoes: newEquipmentNotes.trim() || null,
    });

    setSaving(false);
    if (insertError) {
      console.error('Erro ao cadastrar equipamento:', insertError);
      setError(`Não foi possível cadastrar o equipamento: ${insertError.message}`);
      return;
    }

    setNewEquipmentType('');
    setNewEquipmentBrand('');
    setNewEquipmentModel('');
    setNewEquipmentSerial('');
    setNewEquipmentColor('');
    setNewEquipmentAccessories('');
    setNewEquipmentProblem('');
    setNewEquipmentNotes('');
    setSuccess('Equipamento cadastrado.');
    await loadData();
  };

  const beginEquipmentEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setEquipmentDraft({
      cliente_id: String(equipment.cliente_id),
      tipo: equipment.tipo,
      marca: equipment.marca ?? '',
      modelo: equipment.modelo ?? '',
      numero_serie: equipment.numero_serie ?? '',
      cor: equipment.cor ?? '',
      acessorios: equipment.acessorios ?? '',
      defeito_relatado: equipment.defeito_relatado ?? '',
      observacoes: equipment.observacoes ?? '',
    });
    setError('');
    setSuccess('');
  };

  const saveEquipmentEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !editingEquipment || !equipmentDraft) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { data: updated, error: updateError } = await supabase
      .from('equipamentos')
      .update({
        cliente_id: Number(equipmentDraft.cliente_id),
        tipo: equipmentDraft.tipo.trim(),
        marca: equipmentDraft.marca.trim() || null,
        modelo: equipmentDraft.modelo.trim() || null,
        numero_serie: equipmentDraft.numero_serie.trim() || null,
        cor: equipmentDraft.cor.trim() || null,
        acessorios: equipmentDraft.acessorios.trim() || null,
        defeito_relatado: equipmentDraft.defeito_relatado.trim() || null,
        observacoes: equipmentDraft.observacoes.trim() || null,
      })
      .eq('id', editingEquipment.id)
      .select('id');

    setSaving(false);
    if (updateError) {
      console.error('Erro ao atualizar equipamento:', updateError);
      setError(`Não foi possível atualizar o equipamento: ${updateError.message}`);
      return;
    }
    if (!updated?.length) {
      setError('Nenhum equipamento foi atualizado. Verifique as permissões de acesso.');
      return;
    }

    setEditingEquipment(null);
    setEquipmentDraft(null);
    setSuccess('Dados do equipamento atualizados.');
    await loadData();
  };

  const saveOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const equipmentBelongsToClient = equipments.some(
      item => item.id === Number(orderEquipmentId) && item.cliente_id === Number(orderClientId)
    );

    if (!equipmentBelongsToClient) {
      setError('Selecione um equipamento pertencente ao cliente escolhido.');
      return;
    }

    const labor = Number(orderLabor || 0);
    const discount = Number(orderDiscount || 0);
    if (!Number.isFinite(labor) || !Number.isFinite(discount) || labor < 0 || discount < 0) {
      setError('Informe valores de mão de obra e desconto válidos, iguais ou maiores que zero.');
      return;
    }
    if (discount > labor) {
      setError('O desconto não pode ser maior que o valor da mão de obra.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: insertError } = await supabase.from('ordens_servico').insert({
      cliente_id: Number(orderClientId),
      equipamento_id: Number(orderEquipmentId),
      status: 'aberta',
      prioridade: orderPriority,
      defeito_relatado: orderProblem.trim() || null,
      valor_mao_obra: labor,
      desconto: discount,
      valor_total: labor - discount,
      previsao_entrega: orderDueDate || null,
      criado_por: userId,
    });

    setSaving(false);
    if (insertError) {
      console.error('Erro ao cadastrar ordem de serviço:', insertError);
      setError(`Não foi possível cadastrar a OS: ${insertError.message}`);
      return;
    }

    setModal(false);
    setOrderProblem('');
    setOrderLabor('');
    setOrderDiscount('');
    setOrderDueDate('');
    setSuccess('Ordem de serviço cadastrada.');
    await loadData();
  };

  const saveStockMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !stockMoveItem) return;

    const quantity = Number(stockMoveQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Informe uma quantidade maior que zero.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: insertError } = await supabase.from('movimentacoes_estoque').insert({
      peca_id: stockMoveItem.id,
      tipo: stockMoveType,
      quantidade: stockMoveType === 'entrada' ? quantity : -quantity,
      motivo: stockMoveReason.trim() || null,
      usuario_id: userId,
    });

    setSaving(false);
    if (insertError) {
      console.error('Erro ao registrar movimentação de estoque:', insertError);
      setError(`Não foi possível registrar a movimentação: ${insertError.message}`);
      return;
    }

    setStockMoveItem(null);
    setStockMoveQuantity('');
    setStockMoveReason('');
    setSuccess('Movimentação de estoque registrada.');
    await loadData();
  };

  const saveStockPart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const minimum = Number(newPartMinimum || 0);
    if (!Number.isFinite(minimum) || minimum < 0) {
      setError('O estoque mínimo precisa ser um número igual ou maior que zero.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: insertError } = await supabase.from('pecas').insert({
      codigo: newPartCode.trim() || null,
      nome: newPartName.trim(),
      unidade: newPartUnit.trim() || 'un',
      estoque_minimo: minimum,
    });

    setSaving(false);
    if (insertError) {
      console.error('Erro ao cadastrar peça:', insertError);
      setError(`Não foi possível cadastrar a peça: ${insertError.message}`);
      return;
    }

    setNewPartCode('');
    setNewPartName('');
    setNewPartUnit('un');
    setNewPartMinimum('');
    setSuccess('Peça cadastrada. Registre uma entrada para informar o saldo inicial.');
    await loadData();
  };

  const priorityLabel: Record<string, string> = {
    baixa: 'Baixa',
    normal: 'Normal',
    alta: 'Alta',
    urgente: 'Urgente',
  };

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
    { label: 'Equipamentos', icon: Hammer },
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
            <div className="avatar">{(profileName || userEmail).slice(0, 2).toUpperCase()}</div>
            <div className="user-info" title={userEmail}>
              <b>{profileName || userEmail}</b>
              <small>{profileName ? userEmail : 'Usuário conectado'}</small>
            </div>
            <button
              className="user-logout"
              type="button"
              aria-label="Sair da conta"
              title="Sair da conta"
              onClick={onLogout}
            >
              <LogOut size={16} />
            </button>
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
            <div className="avatar">{userEmail.slice(0, 2).toUpperCase()}</div>
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
                <b>Atenção:</b> {error}
                <button className="link-button" onClick={() => void loadData()}>
                  Recarregar dados
                </button>
              </span>
            </div>
          )}
          {success && <div className="success-notice">{success}</div>}

          {section === 'Visão geral' && <section className="stats">
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
          </section>}

          {section === 'Visão geral' && (
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
                      <button
                        className="print-button"
                        type="button"
                        onClick={() => setPrintOrder(order)}
                        aria-label={`Gerar PDF da ${order.number}`}
                        title="Imprimir / salvar como PDF"
                      >
                        <Printer size={14} /> PDF
                      </button>
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
          )}

          {section === 'Ordens de serviço' && (
            <section className="panel section-panel">
              <div className="panel-head">
                <div>
                  <h2>Ordens de serviço</h2>
                  <p>Consulte e atualize o andamento das ordens.</p>
                </div>
                <button className="filter" onClick={() => void loadData()}>Atualizar</button>
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
              </div>
              {loading && <div className="empty">Carregando ordens...</div>}
              {!loading && !error && filtered.map(order => (
                <div className="order section-order" key={order.id}>
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
                    <button
                      className="print-button"
                      type="button"
                      onClick={() => setPrintOrder(order)}
                      aria-label={`Gerar PDF da ${order.number}`}
                      title="Imprimir / salvar como PDF"
                    >
                      <Printer size={14} /> PDF
                    </button>
                    <button
                      className="edit-order-button"
                      type="button"
                      onClick={() => {
                        setEditingOrder(order);
                        setDiagnosisDraft(order.diagnosis ?? '');
                        setServiceDraft(order.service ?? '');
                        setNotesDraft(order.notes ?? '');
                        setError('');
                        setSuccess('');
                      }}
                      aria-label={`Editar diagnóstico e serviço da ${order.number}`}
                      title="Editar diagnóstico e serviço"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <select
                      className="status-select"
                      aria-label={`Atualizar status de ${order.number}`}
                      value={order.rawStatus}
                      onChange={event => void updateOrderStatus(order.id, event.target.value as Status)}
                    >
                      {Object.entries(statusInfo).map(([value, info]) => (
                        <option key={value} value={value}>{info.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {!loading && !error && filtered.length === 0 && (
                <div className="empty">Nenhuma ordem encontrada.</div>
              )}
            </section>
          )}

          {section === 'Estoque' && (
            <section className="stock-section">
              <form className="panel data-form part-form" onSubmit={saveStockPart}>
                <div className="panel-head">
                  <div><h2>Nova peça</h2><p>Cadastre o item antes de registrar movimentações.</p></div>
                </div>
                <div className="form-grid part-fields">
                  <label>Código<input maxLength={50} value={newPartCode} onChange={event => setNewPartCode(event.target.value)} /></label>
                  <label>Nome<input required maxLength={150} value={newPartName} onChange={event => setNewPartName(event.target.value)} /></label>
                  <label>Unidade<input required maxLength={20} value={newPartUnit} onChange={event => setNewPartUnit(event.target.value)} /></label>
                  <label>Estoque mínimo<input type="number" min="0" step="0.001" value={newPartMinimum} onChange={event => setNewPartMinimum(event.target.value)} /></label>
                </div>
                <button className="primary" type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Cadastrar peça'}
                </button>
              </form>

              <article className="panel section-panel">
                <div className="panel-head">
                  <div>
                    <h2>Estoque</h2>
                    <p>{filteredStock.length} de {stock.length} peças ativas.</p>
                  </div>
                  <button className="filter" type="button" onClick={() => void loadData()}>Atualizar</button>
                </div>
                <div className="toolbar">
                  <div className="search">
                    <Search size={17} />
                    <input
                      value={stockSearch}
                      onChange={event => setStockSearch(event.target.value)}
                      placeholder="Buscar por código, nome, categoria ou marca..."
                      aria-label="Buscar peças no estoque"
                    />
                  </div>
                </div>
                <div className="stock-table">
                  <div className="stock-row stock-header">
                    <b>Código / peça</b><b>Quantidade</b><b>Estoque mínimo</b><b>Ações</b>
                  </div>
                  {loading && <div className="empty">Carregando estoque...</div>}
                  {!loading && filteredStock.map(item => {
                    const isLow = Number(item.quantidade_atual) <= Number(item.estoque_minimo);

                    return (
                      <div className="stock-row" key={item.id}>
                        <div className="stock-name">
                          <b>{item.nome}</b>
                          <small>{item.codigo || 'Sem código'}</small>
                        </div>
                        <span>{Number(item.quantidade_atual)} {item.unidade}</span>
                        <span>{Number(item.estoque_minimo)} {item.unidade}</span>
                        <div className="stock-actions">
                          <span className={`badge ${isLow ? 'amber' : 'green'}`}>
                            {isLow ? 'Estoque baixo' : 'Disponível'}
                          </span>
                          <button
                            className="secondary stock-move-button"
                            type="button"
                            onClick={() => beginStockEdit(item)}
                            aria-label={`Editar ${item.nome}`}
                          >
                            <Pencil size={13} /> Editar
                          </button>
                          <button
                            className="secondary stock-move-button"
                            type="button"
                            onClick={() => {
                              setStockMoveItem(item);
                              setError('');
                              setSuccess('');
                            }}
                          >
                            Movimentar
                          </button>
                          <button
                            className="row-action-button danger"
                            type="button"
                            onClick={() => void deactivateStockItem(item)}
                            aria-label={`Desativar ${item.nome}`}
                            title="Desativar peça"
                          >
                            <Trash2 size={13} /> Desativar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!loading && filteredStock.length === 0 && (
                    <div className="empty">
                      {stock.length === 0 ? 'Nenhuma peça ativa cadastrada.' : 'Nenhuma peça encontrada.'}
                    </div>
                  )}
                </div>
              </article>
            </section>
          )}

          {section === 'Clientes' && (
            <section className="clients-section">
              <div className="columns">
                <form className="panel data-form" onSubmit={saveClient}>
                  <div className="panel-head">
                    <div><h2>Novo cliente</h2><p>Nome obrigatório; os demais dados são opcionais.</p></div>
                  </div>
                  <label>Nome<input required maxLength={150} value={newClientDraft.nome} onChange={event => setNewClientDraft({ ...newClientDraft, nome: event.target.value })} /></label>
                  <div className="form-grid">
                    <label>Telefone<input maxLength={30} value={newClientDraft.telefone ?? ''} onChange={event => setNewClientDraft({ ...newClientDraft, telefone: event.target.value })} /></label>
                    <label>E-mail<input type="email" maxLength={150} value={newClientDraft.email ?? ''} onChange={event => setNewClientDraft({ ...newClientDraft, email: event.target.value })} /></label>
                    <label>CPF / CNPJ<input maxLength={20} value={newClientDraft.cpf_cnpj ?? ''} onChange={event => setNewClientDraft({ ...newClientDraft, cpf_cnpj: event.target.value })} /></label>
                    <label>CEP<input maxLength={10} value={newClientDraft.cep ?? ''} onChange={event => setNewClientDraft({ ...newClientDraft, cep: event.target.value })} /></label>
                    <label>Endereço<input maxLength={200} value={newClientDraft.endereco ?? ''} onChange={event => setNewClientDraft({ ...newClientDraft, endereco: event.target.value })} /></label>
                    <label>Número<input maxLength={20} value={newClientDraft.numero_endereco ?? ''} onChange={event => setNewClientDraft({ ...newClientDraft, numero_endereco: event.target.value })} /></label>
                    <label>Complemento<input maxLength={100} value={newClientDraft.complemento ?? ''} onChange={event => setNewClientDraft({ ...newClientDraft, complemento: event.target.value })} /></label>
                    <label>Bairro<input maxLength={100} value={newClientDraft.bairro ?? ''} onChange={event => setNewClientDraft({ ...newClientDraft, bairro: event.target.value })} /></label>
                    <label>Cidade<input maxLength={100} value={newClientDraft.cidade ?? ''} onChange={event => setNewClientDraft({ ...newClientDraft, cidade: event.target.value })} /></label>
                    <label>Estado (UF)<input maxLength={2} value={newClientDraft.estado ?? ''} onChange={event => setNewClientDraft({ ...newClientDraft, estado: event.target.value })} /></label>
                  </div>
                  <label>Observações<textarea rows={3} value={newClientDraft.observacoes ?? ''} onChange={event => setNewClientDraft({ ...newClientDraft, observacoes: event.target.value })} /></label>
                  <button className="primary" type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Cadastrar cliente'}
                  </button>
                </form>

                <form className="panel data-form" onSubmit={saveEquipment}>
                  <div className="panel-head">
                    <div><h2>Novo equipamento</h2><p>Vincule o aparelho a um cliente.</p></div>
                  </div>
                  <label>Cliente
                    <select required value={equipmentClientId} onChange={event => setEquipmentClientId(event.target.value)}>
                      <option value="">Selecione um cliente</option>
                      {clients.map(client => <option key={client.id} value={client.id}>{client.nome}</option>)}
                    </select>
                  </label>
                  <label>Tipo<input required maxLength={100} value={newEquipmentType} onChange={event => setNewEquipmentType(event.target.value)} placeholder="Ex.: Máquina de lavar" /></label>
                  <label>Marca<input maxLength={100} value={newEquipmentBrand} onChange={event => setNewEquipmentBrand(event.target.value)} /></label>
                  <label>Modelo<input maxLength={100} value={newEquipmentModel} onChange={event => setNewEquipmentModel(event.target.value)} /></label>
                  <label>Número de série<input maxLength={100} value={newEquipmentSerial} onChange={event => setNewEquipmentSerial(event.target.value)} /></label>
                  <label>Cor<input maxLength={50} value={newEquipmentColor} onChange={event => setNewEquipmentColor(event.target.value)} /></label>
                  <label>Acessórios<textarea rows={2} value={newEquipmentAccessories} onChange={event => setNewEquipmentAccessories(event.target.value)} /></label>
                  <label>Defeito relatado<textarea rows={2} value={newEquipmentProblem} onChange={event => setNewEquipmentProblem(event.target.value)} /></label>
                  <label>Observações<textarea rows={2} value={newEquipmentNotes} onChange={event => setNewEquipmentNotes(event.target.value)} /></label>
                  <button className="primary" type="submit" disabled={saving || clients.length === 0}>
                    {saving ? 'Salvando...' : 'Cadastrar equipamento'}
                  </button>
                </form>
              </div>

              <article className="panel section-panel">
                <div className="panel-head">
                  <div><h2>Clientes cadastrados</h2><p>{filteredClients.length} de {clients.length} clientes ativos. Desativar preserva o histórico.</p></div>
                  <button className="filter" type="button" onClick={() => void loadData()}>Atualizar</button>
                </div>
                <div className="toolbar">
                  <div className="search">
                    <Search size={17} />
                    <input
                      value={clientSearch}
                      onChange={event => setClientSearch(event.target.value)}
                      placeholder="Buscar por nome, telefone, e-mail, documento ou cidade..."
                      aria-label="Buscar clientes"
                    />
                  </div>
                </div>
                {loading && <div className="empty">Carregando clientes...</div>}
                {!loading && filteredClients.map(client => (
                  <div className="client-row" key={client.id}>
                    <div className="avatar">{client.nome.slice(0, 2).toUpperCase()}</div>
                    <div><b>{client.nome}</b><small>{client.telefone || client.email || 'Sem contato informado'}</small></div>
                    <span>{equipments.filter(item => item.cliente_id === client.id).length} equipamento(s)</span>
                    <div className="row-actions">
                      <button
                        className="row-action-button"
                        type="button"
                        onClick={() => beginClientEdit(client)}
                        aria-label={`Editar ${client.nome}`}
                        title="Editar cliente"
                      >
                        <Pencil size={13} /> Editar
                      </button>
                      <button
                        className="row-action-button danger"
                        type="button"
                        onClick={() => void deactivateClient(client)}
                        aria-label={`Desativar ${client.nome}`}
                        title="Desativar cliente"
                      >
                        <Trash2 size={13} /> Desativar
                      </button>
                    </div>
                  </div>
                ))}
                {!loading && filteredClients.length === 0 && (
                  <div className="empty">
                    {clients.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum cliente encontrado.'}
                  </div>
                )}
              </article>
            </section>
          )}

          {section === 'Equipamentos' && (
            <section className="panel section-panel">
              <div className="panel-head">
                <div>
                  <h2>Equipamentos cadastrados</h2>
                  <p>{filteredEquipments.length} de {equipments.length} equipamentos.</p>
                </div>
                <button className="primary" type="button" onClick={() => setSection('Clientes')}>
                  <Plus size={16} /> Cadastrar equipamento
                </button>
              </div>
              <div className="toolbar">
                <div className="search">
                  <Search size={17} />
                  <input
                    value={equipmentSearch}
                    onChange={event => setEquipmentSearch(event.target.value)}
                    placeholder="Buscar por cliente, aparelho, marca, modelo ou série..."
                    aria-label="Buscar equipamentos"
                  />
                </div>
                <button className="filter" type="button" onClick={() => void loadData()}>Atualizar</button>
              </div>
              {loading && <div className="empty">Carregando equipamentos...</div>}
              {!loading && filteredEquipments.map(equipment => (
                <article className="equipment-row" key={equipment.id}>
                  <div className="order-icon"><Hammer size={18} /></div>
                  <div className="equipment-info">
                    <b>{[equipment.tipo, equipment.marca, equipment.modelo].filter(Boolean).join(' · ')}</b>
                    <span>Cliente: {equipment.clientes?.nome ?? clients.find(client => client.id === equipment.cliente_id)?.nome ?? 'Cliente não encontrado'}</span>
                    <small>
                      {[
                        equipment.numero_serie ? `Série: ${equipment.numero_serie}` : '',
                        equipment.cor ? `Cor: ${equipment.cor}` : '',
                      ].filter(Boolean).join(' · ') || 'Sem número de série ou cor informados'}
                    </small>
                    {equipment.defeito_relatado && <p><strong>Defeito relatado:</strong> {equipment.defeito_relatado}</p>}
                    {equipment.acessorios && <p><strong>Acessórios:</strong> {equipment.acessorios}</p>}
                    {equipment.observacoes && <p><strong>Observações:</strong> {equipment.observacoes}</p>}
                  </div>
                  <div className="row-actions">
                    <button
                      className="row-action-button"
                      type="button"
                      onClick={() => beginEquipmentEdit(equipment)}
                      aria-label={`Editar equipamento ${equipment.tipo}`}
                      title="Editar equipamento"
                    >
                      <Pencil size={13} /> Editar
                    </button>
                  </div>
                </article>
              ))}
              {!loading && filteredEquipments.length === 0 && (
                <div className="empty">
                  {equipments.length === 0 ? 'Nenhum equipamento cadastrado.' : 'Nenhum equipamento encontrado.'}
                </div>
              )}
            </section>
          )}

          {section === 'Relatórios' && (
            <section className="reports-section">
              <div className="panel report-toolbar">
                <label htmlFor="report-month">Mês do relatório</label>
                <input
                  id="report-month"
                  type="month"
                  value={reportMonth}
                  onChange={event => setReportMonth(event.target.value)}
                />
                <button className="filter" type="button" onClick={() => void loadReports()} disabled={reportsLoading}>
                  {reportsLoading ? 'Atualizando...' : 'Atualizar'}
                </button>
              </div>
              {reportsError && <div className="notice"><Wrench size={18} /><span>{reportsError}</span></div>}
              <section className="stats">
                <article className="stat">
                  <div><span>OS abertas no mês</span><div className="stat-icon blue"><ClipboardList size={19} /></div></div>
                  <strong>{reportsLoading ? '—' : reportOrders.length}</strong>
                  <small>Ordens registradas por data de entrada</small>
                </article>
                <article className="stat">
                  <div><span>Valor total das OS</span><div className="stat-icon violet"><Activity size={19} /></div></div>
                  <strong className="money">{reportsLoading ? '—' : money(reportTotalValue)}</strong>
                  <small>Soma dos valores das ordens do mês</small>
                </article>
                <article className="stat">
                  <div><span>OS entregues</span><div className="stat-icon green"><CheckCircle2 size={19} /></div></div>
                  <strong>{reportsLoading ? '—' : reportStatusCounts.find(item => item.status === 'entregue')?.count ?? 0}</strong>
                  <small>Com status entregue</small>
                </article>
                <article className="stat">
                  <div><span>Valor das OS entregues</span><div className="stat-icon green"><Activity size={19} /></div></div>
                  <strong className="money">{reportsLoading ? '—' : money(reportCompletedValue)}</strong>
                  <small>Valor das OS entregues, não necessariamente recebido</small>
                </article>
              </section>
              <article className="panel section-panel">
                <div className="panel-head">
                  <div><h2>Ordens por status</h2><p>Distribuição das OS abertas no mês selecionado.</p></div>
                </div>
                {reportsLoading && <div className="empty">Carregando relatório...</div>}
                {!reportsLoading && reportStatusCounts.map(item => {
                  const percentage = reportOrders.length
                    ? (item.count / reportOrders.length) * 100
                    : 0;

                  return (
                    <div className="report-status-row" key={item.status}>
                      <span>{statusInfo[item.status].label}</span>
                      <div className="report-bar"><i style={{ width: `${percentage}%` }} /></div>
                      <b>{item.count}</b>
                    </div>
                  );
                })}
                {!reportsLoading && reportOrders.length === 0 && !reportsError && (
                  <div className="empty">Nenhuma OS encontrada nesse mês.</div>
                )}
              </article>
            </section>
          )}

          {section === 'Configurações' && (
            <section className="panel settings-panel">
              <div className="panel-head">
                <div><h2>Configurações da conta</h2><p>Edite o nome de exibição do perfil conectado.</p></div>
              </div>
              {profileLoading ? (
                <div className="empty">Carregando perfil...</div>
              ) : (
                <form className="data-form" onSubmit={saveProfile}>
                  <label>Nome de exibição
                    <input
                      maxLength={150}
                      value={profileName}
                      onChange={event => setProfileName(event.target.value)}
                      placeholder="Seu nome"
                    />
                  </label>
                  <label>E-mail da conta
                    <input value={userEmail} readOnly />
                  </label>
                  <button className="primary" type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar configurações'}
                  </button>
                </form>
              )}
            </section>
          )}

          <footer>
            OS Stock · Assistência técnica
            <span>● Dados consultados no Supabase.</span>
          </footer>
        </div>
      </main>

      {printOrder && (
        <article className="print-document">
          <header className="print-header">
            <div>
              <p className="print-brand">OS Stock</p>
              <p className="print-subtitle">Assistência técnica</p>
            </div>
            <div className="print-number">
              <span>ORDEM DE SERVIÇO</span>
              <strong>{printOrder.number}</strong>
            </div>
          </header>

          <div className="print-summary">
            <div><span>Data de entrada</span><b>{printOrder.date}</b></div>
            <div><span>Status</span><b>{printOrder.status}</b></div>
            <div><span>Prioridade</span><b>{priorityLabel[printOrder.priority] ?? printOrder.priority}</b></div>
            <div><span>Previsão de entrega</span><b>{formatCalendarDate(printOrder.dueDate)}</b></div>
          </div>

          <section className="print-section print-client">
            <h2>Dados do cliente</h2>
            <div className="print-grid">
              <div className="print-field"><span>Nome</span><p>{printOrder.customer}</p></div>
              <div className="print-field"><span>CPF / CNPJ</span><p>{printOrder.customerDocument || 'Não informado'}</p></div>
              <div className="print-field"><span>Contato</span><p>{[printOrder.customerPhone, printOrder.customerEmail].filter(Boolean).join(' · ') || 'Não informado'}</p></div>
              <div className="print-field print-wide"><span>Endereço</span><p>{printOrder.customerAddress || 'Não informado'}</p></div>
            </div>
          </section>

          <section className="print-section">
            <h2>Equipamento</h2>
            <div className="print-grid">
              <div className="print-field"><span>Aparelho</span><p>{printOrder.equipment}</p></div>
              <div className="print-field"><span>Número de série</span><p>{printOrder.equipmentSerial || 'Não informado'}</p></div>
              <div className="print-field"><span>Cor</span><p>{printOrder.equipmentColor || 'Não informada'}</p></div>
              <div className="print-field"><span>Acessórios entregues</span><p>{printOrder.equipmentAccessories || 'Não informado'}</p></div>
            </div>
          </section>

          <section className="print-section print-work">
            <h2>Serviço</h2>
            <div className="print-field"><span>Defeito relatado pelo cliente</span><p>{printOrder.problem}</p></div>
            <div className="print-field"><span>Diagnóstico técnico</span><p>{printOrder.diagnosis || 'A preencher'}</p></div>
            <div className="print-field"><span>Serviço executado</span><p>{printOrder.service || 'A preencher'}</p></div>
            {printOrder.notes && <div className="print-field"><span>Observações</span><p>{printOrder.notes}</p></div>}
          </section>

          <section className="print-section print-values">
            <h2>Valores</h2>
            <div><span>Mão de obra</span><b>{money(printOrder.labor)}</b></div>
            <div><span>Desconto</span><b>{money(printOrder.discount)}</b></div>
            <div className="print-total"><span>Total da ordem</span><b>{money(printOrder.value)}</b></div>
            <p>Garantia do serviço: {printOrder.warrantyDays} dias, conforme condições aplicáveis.</p>
          </section>

          <p className="print-terms">
            Declaro estar ciente das informações desta ordem de serviço e autorizo a avaliação
            e execução dos serviços aprovados.
          </p>
          <footer className="print-signatures">
            <div><span>Assinatura do cliente</span><small>Nome: __________________________________</small><small>Data: ______ / ______ / __________</small></div>
            <div><span>Assinatura do responsável técnico</span><small>Nome: __________________________________</small><small>Data: ______ / ______ / __________</small></div>
          </footer>
        </article>
      )}

      {editingEquipment && equipmentDraft && (
        <div className="backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) {
            setEditingEquipment(null);
            setEquipmentDraft(null);
          }
        }}>
          <form className="modal" role="dialog" aria-modal="true" onSubmit={saveEquipmentEdit}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">EQUIPAMENTO</p>
                <h2>Editar equipamento</h2>
              </div>
              <button className="close" type="button" disabled={saving} onClick={() => {
                setEditingEquipment(null);
                setEquipmentDraft(null);
              }}>×</button>
            </div>
            <label>Cliente
              <select
                required
                value={equipmentDraft.cliente_id}
                onChange={event => setEquipmentDraft({ ...equipmentDraft, cliente_id: event.target.value })}
              >
                {!clients.some(client => client.id === editingEquipment.cliente_id) && (
                  <option value={editingEquipment.cliente_id}>
                    {editingEquipment.clientes?.nome ?? 'Cliente atual (inativo)'}
                  </option>
                )}
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.nome}</option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>Tipo<input required maxLength={100} value={equipmentDraft.tipo} onChange={event => setEquipmentDraft({ ...equipmentDraft, tipo: event.target.value })} /></label>
              <label>Marca<input maxLength={100} value={equipmentDraft.marca} onChange={event => setEquipmentDraft({ ...equipmentDraft, marca: event.target.value })} /></label>
              <label>Modelo<input maxLength={100} value={equipmentDraft.modelo} onChange={event => setEquipmentDraft({ ...equipmentDraft, modelo: event.target.value })} /></label>
              <label>Número de série<input maxLength={100} value={equipmentDraft.numero_serie} onChange={event => setEquipmentDraft({ ...equipmentDraft, numero_serie: event.target.value })} /></label>
              <label>Cor<input maxLength={50} value={equipmentDraft.cor} onChange={event => setEquipmentDraft({ ...equipmentDraft, cor: event.target.value })} /></label>
            </div>
            <label>Acessórios<textarea rows={2} value={equipmentDraft.acessorios} onChange={event => setEquipmentDraft({ ...equipmentDraft, acessorios: event.target.value })} /></label>
            <label>Defeito relatado<textarea rows={2} value={equipmentDraft.defeito_relatado} onChange={event => setEquipmentDraft({ ...equipmentDraft, defeito_relatado: event.target.value })} /></label>
            <label>Observações<textarea rows={2} value={equipmentDraft.observacoes} onChange={event => setEquipmentDraft({ ...equipmentDraft, observacoes: event.target.value })} /></label>
            <div className="modal-actions">
              <button className="secondary" type="button" disabled={saving} onClick={() => {
                setEditingEquipment(null);
                setEquipmentDraft(null);
              }}>Cancelar</button>
              <button className="primary" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar equipamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingClient && clientDraft && (
        <div className="backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) {
            setEditingClient(null);
            setClientDraft(null);
          }
        }}>
          <form className="modal" role="dialog" aria-modal="true" onSubmit={saveClientEdit}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">CLIENTE</p>
                <h2>Editar cliente</h2>
              </div>
              <button className="close" type="button" disabled={saving} onClick={() => {
                setEditingClient(null);
                setClientDraft(null);
              }}>×</button>
            </div>
            <div className="form-grid">
              <label>Nome<input required maxLength={150} value={clientDraft.nome} onChange={event => setClientDraft({ ...clientDraft, nome: event.target.value })} /></label>
              <label>Telefone<input maxLength={30} value={clientDraft.telefone ?? ''} onChange={event => setClientDraft({ ...clientDraft, telefone: event.target.value })} /></label>
              <label>E-mail<input type="email" maxLength={150} value={clientDraft.email ?? ''} onChange={event => setClientDraft({ ...clientDraft, email: event.target.value })} /></label>
              <label>CPF / CNPJ<input maxLength={20} value={clientDraft.cpf_cnpj ?? ''} onChange={event => setClientDraft({ ...clientDraft, cpf_cnpj: event.target.value })} /></label>
              <label>CEP<input maxLength={10} value={clientDraft.cep ?? ''} onChange={event => setClientDraft({ ...clientDraft, cep: event.target.value })} /></label>
              <label>Endereço<input maxLength={200} value={clientDraft.endereco ?? ''} onChange={event => setClientDraft({ ...clientDraft, endereco: event.target.value })} /></label>
              <label>Número<input maxLength={20} value={clientDraft.numero_endereco ?? ''} onChange={event => setClientDraft({ ...clientDraft, numero_endereco: event.target.value })} /></label>
              <label>Complemento<input maxLength={100} value={clientDraft.complemento ?? ''} onChange={event => setClientDraft({ ...clientDraft, complemento: event.target.value })} /></label>
              <label>Bairro<input maxLength={100} value={clientDraft.bairro ?? ''} onChange={event => setClientDraft({ ...clientDraft, bairro: event.target.value })} /></label>
              <label>Cidade<input maxLength={100} value={clientDraft.cidade ?? ''} onChange={event => setClientDraft({ ...clientDraft, cidade: event.target.value })} /></label>
              <label>Estado (UF)<input maxLength={2} value={clientDraft.estado ?? ''} onChange={event => setClientDraft({ ...clientDraft, estado: event.target.value })} /></label>
            </div>
            <label>Observações<textarea rows={3} value={clientDraft.observacoes ?? ''} onChange={event => setClientDraft({ ...clientDraft, observacoes: event.target.value })} /></label>
            <div className="modal-actions">
              <button className="secondary" type="button" disabled={saving} onClick={() => {
                setEditingClient(null);
                setClientDraft(null);
              }}>Cancelar</button>
              <button className="primary" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingStock && stockDraft && (
        <div className="backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) {
            setEditingStock(null);
            setStockDraft(null);
          }
        }}>
          <form className="modal" role="dialog" aria-modal="true" onSubmit={saveStockEdit}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">ESTOQUE</p>
                <h2>Editar peça</h2>
              </div>
              <button className="close" type="button" disabled={saving} onClick={() => {
                setEditingStock(null);
                setStockDraft(null);
              }}>×</button>
            </div>
            <p className="modal-desc">
              Saldo atual: {Number(editingStock.quantidade_atual)} {editingStock.unidade}.
              Para alterar o saldo, use “Movimentar” e registre uma entrada ou saída.
            </p>
            <div className="form-grid">
              <label>Código<input maxLength={50} value={stockDraft.codigo} onChange={event => setStockDraft({ ...stockDraft, codigo: event.target.value })} /></label>
              <label>Nome<input required maxLength={150} value={stockDraft.nome} onChange={event => setStockDraft({ ...stockDraft, nome: event.target.value })} /></label>
              <label>Categoria<input maxLength={100} value={stockDraft.categoria} onChange={event => setStockDraft({ ...stockDraft, categoria: event.target.value })} /></label>
              <label>Marca<input maxLength={100} value={stockDraft.marca} onChange={event => setStockDraft({ ...stockDraft, marca: event.target.value })} /></label>
              <label>Unidade<input required maxLength={20} value={stockDraft.unidade} onChange={event => setStockDraft({ ...stockDraft, unidade: event.target.value })} /></label>
              <label>Estoque mínimo<input type="number" min="0" step="0.001" required value={stockDraft.estoque_minimo} onChange={event => setStockDraft({ ...stockDraft, estoque_minimo: event.target.value })} /></label>
              <label>Custo unitário (R$)<input type="number" min="0" step="0.01" required value={stockDraft.custo_unitario} onChange={event => setStockDraft({ ...stockDraft, custo_unitario: event.target.value })} /></label>
              <label>Preço de venda (R$)<input type="number" min="0" step="0.01" required value={stockDraft.preco_venda} onChange={event => setStockDraft({ ...stockDraft, preco_venda: event.target.value })} /></label>
              <label>Localização<input maxLength={100} value={stockDraft.localizacao} onChange={event => setStockDraft({ ...stockDraft, localizacao: event.target.value })} /></label>
            </div>
            <label>Descrição<textarea rows={3} value={stockDraft.descricao} onChange={event => setStockDraft({ ...stockDraft, descricao: event.target.value })} /></label>
            <div className="modal-actions">
              <button className="secondary" type="button" disabled={saving} onClick={() => {
                setEditingStock(null);
                setStockDraft(null);
              }}>Cancelar</button>
              <button className="primary" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar peça'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingOrder && (
        <div className="backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) setEditingOrder(null);
        }}>
          <form className="modal" role="dialog" aria-modal="true" onSubmit={saveOrderDetails}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">{editingOrder.number}</p>
                <h2>Detalhes técnicos</h2>
              </div>
              <button
                className="close"
                type="button"
                onClick={() => setEditingOrder(null)}
                disabled={saving}
              >
                ×
              </button>
            </div>
            <p className="modal-desc">
              Preencha os dados do atendimento. Eles serão incluídos no PDF da ordem.
            </p>
            <label>Diagnóstico técnico
              <textarea
                rows={4}
                maxLength={5000}
                value={diagnosisDraft}
                onChange={event => setDiagnosisDraft(event.target.value)}
                placeholder="Descreva a causa identificada e os testes realizados"
              />
            </label>
            <label>Serviço executado
              <textarea
                rows={4}
                maxLength={5000}
                value={serviceDraft}
                onChange={event => setServiceDraft(event.target.value)}
                placeholder="Descreva o reparo ou serviço realizado"
              />
            </label>
            <label>Observações
              <textarea
                rows={3}
                maxLength={5000}
                value={notesDraft}
                onChange={event => setNotesDraft(event.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => setEditingOrder(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button className="primary" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar detalhes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {modal && (
        <div className="backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget) setModal(false);
        }}>
          <form className="modal" role="dialog" aria-modal="true" onSubmit={saveOrder}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">ATENDIMENTO</p>
                <h2>Nova ordem de serviço</h2>
              </div>
              <button className="close" type="button" onClick={() => setModal(false)}>×</button>
            </div>
            {clients.length === 0 && (
              <p className="modal-desc">
                Cadastre um cliente e o equipamento dele antes de abrir uma OS.
                <button
                  className="link-button"
                  type="button"
                  onClick={() => {
                    setModal(false);
                    setSection('Clientes');
                  }}
                >
                  Ir para clientes
                </button>
              </p>
            )}
            <label>Cliente
              <select
                required
                value={orderClientId}
                onChange={event => {
                  setOrderClientId(event.target.value);
                  setOrderEquipmentId('');
                }}
              >
                <option value="">Selecione um cliente</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.nome}</option>)}
              </select>
            </label>
            <label>Equipamento
              <select required value={orderEquipmentId} onChange={event => setOrderEquipmentId(event.target.value)}>
                <option value="">Selecione um equipamento</option>
                {equipments
                  .filter(item => String(item.cliente_id) === orderClientId)
                  .map(item => (
                    <option key={item.id} value={item.id}>
                      {[item.tipo, item.marca, item.modelo].filter(Boolean).join(' · ')}
                    </option>
                  ))}
              </select>
            </label>
            <label>Defeito relatado
              <textarea rows={3} value={orderProblem} onChange={event => setOrderProblem(event.target.value)} />
            </label>
            <div className="form-grid">
              <label>Prioridade
                <select value={orderPriority} onChange={event => setOrderPriority(event.target.value)}>
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </label>
              <label>Previsão de entrega<input type="date" value={orderDueDate} onChange={event => setOrderDueDate(event.target.value)} /></label>
              <label>Mão de obra (R$)<input type="number" min="0" step="0.01" value={orderLabor} onChange={event => setOrderLabor(event.target.value)} /></label>
              <label>Desconto (R$)<input type="number" min="0" step="0.01" value={orderDiscount} onChange={event => setOrderDiscount(event.target.value)} /></label>
            </div>

            <div className="modal-actions">
              <button className="secondary" type="button" onClick={() => setModal(false)}>Cancelar</button>
              <button className="primary" type="submit" disabled={saving || clients.length === 0}>
                {saving ? 'Salvando...' : 'Criar ordem'}
              </button>
            </div>
          </form>
        </div>
      )}

      {stockMoveItem && (
        <div className="backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget) setStockMoveItem(null);
        }}>
          <form className="modal" role="dialog" aria-modal="true" onSubmit={saveStockMovement}>
            <div className="modal-head">
              <div><p className="eyebrow">ESTOQUE</p><h2>Movimentar peça</h2></div>
              <button className="close" type="button" onClick={() => setStockMoveItem(null)}>×</button>
            </div>
            <p className="modal-desc">
              {stockMoveItem.nome}: saldo atual {Number(stockMoveItem.quantidade_atual)} {stockMoveItem.unidade}.
            </p>
            <label>Tipo
              <select value={stockMoveType} onChange={event => setStockMoveType(event.target.value as 'entrada' | 'saida')}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </label>
            <label>Quantidade
              <input type="number" min="0.001" step="0.001" required value={stockMoveQuantity} onChange={event => setStockMoveQuantity(event.target.value)} />
            </label>
            <label>Motivo<input maxLength={500} value={stockMoveReason} onChange={event => setStockMoveReason(event.target.value)} /></label>
            <div className="modal-actions">
              <button className="secondary" type="button" onClick={() => setStockMoveItem(null)}>Cancelar</button>
              <button className="primary" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}