import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "../../shared/money";
import type { Offer } from "./search.types";

type Props = { query: string; offers: Offer[] | null; onSearch: () => void };

export default function Dashboard({ query, offers, onSearch }: Props) {
  const prices = [...(offers ?? [])].filter((offer) => Number.isFinite(offer.price)).sort((a, b) => a.price - b.price);
  const values = prices.map((offer) => offer.price);
  const average = values.length ? values.reduce((sum, price) => sum + price, 0) / values.length : 0;
  const chartData = prices.slice(0, 12).map((offer, index) => ({ label: `Oferta ${index + 1}`, price: offer.price, title: offer.title }));

  return <section className="view dashboard-view">
    <div className="view-heading"><p>Visão da busca atual</p><h1>Dashboard</h1><span>{query ? `Resultado para “${query}”` : "Os dados aparecem depois de uma busca concluída."}</span></div>
    {!offers ? <div className="empty-view"><h2>Faça uma busca para ver a comparação.</h2><p>O gráfico usará os preços reais das ofertas encontradas nessa busca.</p><button type="button" onClick={onSearch}>Começar busca</button></div> : prices.length === 0 ? <div className="empty-view"><h2>Nenhuma oferta para analisar.</h2><p>Tente outra descrição ou amplie o orçamento.</p><button type="button" onClick={onSearch}>Refazer busca</button></div> : <>
      <div className="metric-strip"><div><span>Ofertas</span><strong>{prices.length}</strong></div><div><span>Menor preço</span><strong>{money(prices[0].price)}</strong></div><div><span>Preço médio</span><strong>{money(average)}</strong></div><div><span>Maior preço</span><strong>{money(prices[prices.length - 1].price)}</strong></div></div>
      <div className="chart-section"><div className="chart-title"><h2>Preços encontrados</h2><span>{chartData.length < prices.length ? `Mostrando as ${chartData.length} menores ofertas` : "Da menor para a maior oferta"}</span></div><div className="chart-wrap" role="img" aria-label={`Gráfico de ${chartData.length} ofertas, da menor em ${money(prices[0].price)} até ${money(chartData[chartData.length - 1].price)}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 5 }} accessibilityLayer><CartesianGrid vertical={false} stroke="#e9eeea" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#7f8a81", fontSize: 11 }} /><YAxis tickFormatter={(value: number) => `R$ ${Math.round(value).toLocaleString("pt-BR")}`} tickLine={false} axisLine={false} tick={{ fill: "#7f8a81", fontSize: 11 }} width={82} /><Tooltip contentStyle={{ border: "1px solid #e3e9e3", borderRadius: 8, fontSize: 12 }} /><Bar dataKey="price" name="Preço" fill="#286145" radius={[3, 3, 0, 0]} maxBarSize={52} /></BarChart></ResponsiveContainer></div><p>Comparação pontual dos preços recebidos agora. Isto não representa histórico de preço.</p></div>
      <div className="dashboard-list"><h2>Ofertas no gráfico</h2>{chartData.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.title}</strong><b>{money(item.price)}</b></div>)}</div>
    </>}
  </section>;
}
