import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Icon from "../../shared/Icon";
import { money } from "../../shared/money";
import { getCatalog, type CatalogProduct } from "../stores/stores.api";
import { getDashboardData } from "./search.api";
import type { Offer } from "./search.types";

type Props = {
  query: string;
  offers: Offer[] | null;
  token?: string;
  onSearch: () => void;
  onSelectOffer?: (offer: Offer) => void;
};

type NormalizedItem = {
  id: string;
  title: string;
  price: number;
  source: string;
  seller?: string | null;
  permalink?: string;
  thumbnail?: string | null;
};

export default function Dashboard({ query, offers, token, onSearch, onSelectOffer }: Props) {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [dashboardOffers, setDashboardOffers] = useState<Offer[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [viewSource, setViewSource] = useState<"search" | "catalog">(offers && offers.length > 0 ? "search" : "catalog");

  useEffect(() => {
    let active = true;
    setLoadingCatalog(true);
    Promise.allSettled([getCatalog(), getDashboardData(token)])
      .then(([catalogResult, dashboardResult]) => {
        if (!active) return;
        if (catalogResult.status === "fulfilled") setCatalog(catalogResult.value);
        if (dashboardResult.status === "fulfilled") setDashboardOffers(dashboardResult.value.offers);
      })
      .finally(() => {
        if (active) setLoadingCatalog(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  // Sync view mode if offers change
  useEffect(() => {
    if (offers && offers.length > 0) {
      setViewSource("search");
    }
  }, [offers]);

  const catalogItems: NormalizedItem[] = dashboardOffers.length > 0
    ? dashboardOffers.filter((o) => Number.isFinite(o.price)).map((o) => ({
        id: o.id,
        title: o.title,
        price: o.price,
        source: o.source,
        seller: o.seller,
        permalink: o.permalink,
        thumbnail: o.thumbnail,
      }))
    : catalog.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        source: p.storeName,
        seller: p.storeName,
        permalink: p.productUrl,
        thumbnail: p.imageUrl,
      }));

  const activeItems: NormalizedItem[] =
    viewSource === "search" && offers && offers.length > 0
      ? offers.filter((o) => Number.isFinite(o.price)).map((o) => ({
          id: o.id,
          title: o.title,
          price: o.price,
          source: o.source,
          seller: o.seller,
          permalink: o.permalink,
          thumbnail: o.thumbnail,
        }))
      : catalogItems;

  const catalogCount = catalogItems.length;

  const sortedItems = [...activeItems].sort((a, b) => a.price - b.price);
  const prices = sortedItems.map((item) => item.price);
  const average = prices.length ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0;
  const minPrice = prices.length ? prices[0] : 0;
  const maxPrice = prices.length ? prices[prices.length - 1] : 0;
  const savings = maxPrice - minPrice;

  // Chart 1 data: Top items sorted by price
  const chartData = sortedItems.slice(0, 10).map((item, index) => ({
    name: item.title.length > 20 ? item.title.slice(0, 20) + "…" : item.title,
    fullTitle: item.title,
    price: item.price,
    source: item.source,
    label: `#${index + 1}`,
  }));

  // Chart 2 data: Distribution by price brackets
  const brackets = [
    { label: "Até R$ 250", min: 0, max: 250 },
    { label: "R$ 250 - R$ 500", min: 250, max: 500 },
    { label: "R$ 500 - R$ 1.000", min: 500, max: 1000 },
    { label: "R$ 1.000 - R$ 2.000", min: 1000, max: 2000 },
    { label: "Acima de R$ 2.000", min: 2000, max: Infinity },
  ];

  const distributionData = brackets.map((b) => ({
    faixa: b.label,
    quantidade: sortedItems.filter((i) => i.price >= b.min && i.price < b.max).length,
  }));

  // Store distribution data
  const storeCounts: Record<string, number> = {};
  sortedItems.forEach((i) => {
    storeCounts[i.source] = (storeCounts[i.source] || 0) + 1;
  });
  const storeData = Object.entries(storeCounts).map(([store, count]) => ({
    store,
    count,
  }));

  return (
    <section className="view dashboard-view">
      <div className="view-heading">
        <div className="dashboard-header-flex">
          <div>
            <p>Estatísticas e Análise em Tempo Real</p>
            <h1>Dashboard de Preços</h1>
            <span>
              {viewSource === "search" && query
                ? `Análise comparativa da busca: “${query}”`
                : "Dados consolidados do catálogo real de produtos e lojas parceiras."}
            </span>
          </div>

          <div className="dashboard-source-toggle">
            <button
              type="button"
              className={viewSource === "search" ? "is-active" : ""}
              disabled={!offers || offers.length === 0}
              onClick={() => setViewSource("search")}
            >
              <Icon name="search" />
              <span>Busca Atual {offers && `(${offers.length})`}</span>
            </button>
            <button
              type="button"
              className={viewSource === "catalog" ? "is-active" : ""}
              onClick={() => setViewSource("catalog")}
            >
              <Icon name="chart" />
              <span>Catálogo Geral ({catalogCount})</span>
            </button>
          </div>
        </div>
      </div>

      {loadingCatalog && sortedItems.length === 0 ? (
        <div className="account-checking-card">
          <div className="auth-spinner" />
          <p>Carregando dados reais do catálogo...</p>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="empty-view">
          <h2>Nenhum dado disponível no momento.</h2>
          <p>Faça uma busca de produtos ou cadastre sua loja para gerar análises gráficas.</p>
          <button type="button" onClick={onSearch}>
            Fazer uma Busca
          </button>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="metric-strip dashboard-metrics-grid">
            <div>
              <span>Ofertas Analisadas</span>
              <strong>{sortedItems.length}</strong>
              <small className="metric-hint">produtos na amostra</small>
            </div>
            <div>
              <span>Menor Preço</span>
              <strong className="text-highlight-green">{money(minPrice)}</strong>
              <small className="metric-hint">melhor oferta</small>
            </div>
            <div>
              <span>Preço Médio</span>
              <strong>{money(average)}</strong>
              <small className="metric-hint">média geral</small>
            </div>
            <div>
              <span>Variação de Preço</span>
              <strong className="text-highlight-orange">{money(savings)}</strong>
              <small className="metric-hint">economia máxima</small>
            </div>
          </div>

          {/* Main Chart Section */}
          <div className="chart-section">
            <div className="chart-title">
              <div>
                <h2>Comparativo das Menores Ofertas</h2>
                <small>Gráfico interativo gerado via Recharts com preços reais</small>
              </div>
              <span className="chart-badge-source">
                {viewSource === "search" ? "Busca atual" : "Ofertas armazenadas"}
              </span>
            </div>

            <div className="chart-wrap" style={{ height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid vertical={false} stroke="#e4ece5" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={{ stroke: "#d5ded6" }}
                    tick={{ fill: "#607264", fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tickFormatter={(val: number) => `R$ ${Math.round(val).toLocaleString("pt-BR")}`}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#7a8a7e", fontSize: 11 }}
                    width={85}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(40, 97, 69, 0.06)", radius: 6 }}
                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2).replace(".", ",")}`, "Preço"]}
                    labelFormatter={(_label: any, payload: any) => {
                      if (payload && payload[0]) return payload[0].payload.fullTitle;
                      return "";
                    }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #c9d7cc",
                      borderRadius: 10,
                      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                      fontSize: 12,
                    }}
                  />
                  <ReferenceLine
                    y={average}
                    stroke="#e1874d"
                    strokeDasharray="4 4"
                    label={{
                      value: `Média: ${money(average)}`,
                      fill: "#c26d36",
                      fontSize: 11,
                      position: "insideTopRight",
                    }}
                  />
                  <Bar dataKey="price" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? "#1b7a48" : "#286145"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend-row">
              <span className="legend-indicator" style={{ backgroundColor: "#1b7a48" }} /> Menor preço
              <span className="legend-indicator" style={{ backgroundColor: "#286145", marginLeft: 16 }} /> Outras ofertas
              <span className="legend-indicator" style={{ backgroundColor: "#e1874d", marginLeft: 16 }} /> Linha de Preço Médio
            </div>
          </div>

          {/* Dual sub-charts */}
          <div className="dashboard-subcharts-grid">
            <div className="subchart-card">
              <h3>Distribuição por Faixa de Preço</h3>
              <p>Volume de ofertas agrupadas por faixas de valor em R$</p>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#edf2ee" />
                    <XAxis dataKey="faixa" tick={{ fill: "#687a6c", fontSize: 10 }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#687a6c", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(40, 97, 69, 0.06)", radius: 4 }}
                      formatter={(val: any) => [`${val} ofertas`, "Quantidade"]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="quantidade" fill="#437d5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="subchart-card">
              <h3>Ofertas por Loja / Canal</h3>
              <p>Representatividade de cada fonte no catálogo monitorado</p>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storeData} layout="vertical" margin={{ top: 15, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="#edf2ee" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#687a6c", fontSize: 10 }} />
                    <YAxis dataKey="store" type="category" tick={{ fill: "#364739", fontSize: 11 }} width={90} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(40, 97, 69, 0.06)", radius: 4 }}
                      formatter={(val: any) => [`${val} produtos`, "Total"]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill="#2d523e" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* List of ranked items */}
          <div className="dashboard-list">
            <div className="dashboard-list-header">
              <h2>Lista de Produtos Monitorados</h2>
              <span>Ordenado da menor para a maior oferta</span>
            </div>
            {sortedItems.slice(0, 15).map((item, index) => (
              <div
                key={item.id}
                className="dashboard-item-row"
                onClick={() => {
                  if (onSelectOffer) {
                    onSelectOffer({
                      id: item.id,
                      source: item.source,
                      title: item.title,
                      price: item.price,
                      originalPrice: null,
                      currency: "BRL",
                      freeShipping: false,
                      seller: item.seller || item.source,
                      location: null,
                      permalink: item.permalink || "#",
                      thumbnail: item.thumbnail || null,
                      updatedAt: new Date().toISOString(),
                    });
                  }
                }}
              >
                <span className="dashboard-item-rank">#{index + 1}</span>
                <span className="dashboard-item-source">{item.source}</span>
                <strong className="dashboard-item-title" title={item.title}>
                  {item.title}
                </strong>
                <b className="dashboard-item-price">{money(item.price)}</b>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
