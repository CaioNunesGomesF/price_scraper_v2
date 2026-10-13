import { useState, type FormEvent } from "react";
import type { StoreSubmission } from "./stores.api";

type Props = { busy: boolean; error: string; success: string; onSubmit: (data: StoreSubmission) => void };
type ProductForm = { title: string; productUrl: string; imageUrl: string; price: string; inStock: boolean };
const newProduct = (): ProductForm => ({ title: "", productUrl: "", imageUrl: "", price: "", inStock: true });

export default function AddStoreView({ busy, error, success, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [products, setProducts] = useState<ProductForm[]>([newProduct()]);

  function updateProduct(index: number, changes: Partial<ProductForm>) {
    setProducts((current) => current.map((product, itemIndex) => itemIndex === index ? { ...product, ...changes } : product));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      name, websiteUrl, contactEmail, description: description || undefined, city: city || undefined, state: state || undefined,
      products: products.map((product) => ({ title: product.title, productUrl: product.productUrl, imageUrl: product.imageUrl || null, price: Number(product.price), inStock: product.inStock })),
    });
  }

  return <section className="view add-store-view">
    <div className="view-heading"><p>Cadastro aberto</p><h1>Adicione sua loja</h1><span>Informe os dados da loja e pelo menos um produto. A equipe revisará as informações antes de publicar as ofertas.</span></div>
    {success ? <div className="store-submission-success" role="status"><span className="success-check">✓</span><div><h2>Recebemos seu cadastro.</h2><p>{success}</p><span>A loja e os produtos aparecerão nas buscas depois da aprovação.</span></div></div> : <form className="store-form" onSubmit={submit}>
      <fieldset><legend>Sobre a loja</legend>
        <label>Nome da loja<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={160} placeholder="Ex.: Loja do Bairro" /></label>
        <label>Site da loja<input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} required placeholder="https://sualoja.com.br" /></label>
        <label>E-mail para contato<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} required placeholder="voce@sualoja.com.br" /></label>
        <label>Descrição <span className="optional-label">opcional</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} placeholder="Conte brevemente o que sua loja vende" /></label>
        <div className="store-location-fields"><label>Cidade <span className="optional-label">opcional</span><input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} /></label><label>Estado <span className="optional-label">opcional</span><input value={state} onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="SE" /></label></div>
      </fieldset>
      <fieldset className="product-fieldset"><legend>Produtos iniciais</legend><div className="product-legend"><span>Cadastre de 1 a 20 produtos.</span><button type="button" disabled={products.length >= 20} onClick={() => setProducts((current) => [...current, newProduct()])}>+ Adicionar produto</button></div>
        {products.map((product, index) => <div className="product-form-row" key={index}>
          <div className="product-form-heading"><strong>Produto {index + 1}</strong>{products.length > 1 && <button type="button" aria-label={`Remover produto ${index + 1}`} onClick={() => setProducts((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remover</button>}</div>
          <label>Nome do produto<input value={product.title} onChange={(event) => updateProduct(index, { title: event.target.value })} required minLength={2} maxLength={255} placeholder="Ex.: Fone Bluetooth X" /></label>
          <label>Link do produto<input type="url" value={product.productUrl} onChange={(event) => updateProduct(index, { productUrl: event.target.value })} required placeholder="https://sualoja.com.br/produto" /></label>
          <div className="product-price-row"><label>Preço à vista (R$)<input type="number" value={product.price} onChange={(event) => updateProduct(index, { price: event.target.value })} required min="0.01" max="20000000" step="0.01" placeholder="0,00" /></label><label>Imagem <span className="optional-label">opcional</span><input type="url" value={product.imageUrl} onChange={(event) => updateProduct(index, { imageUrl: event.target.value })} placeholder="https://..." /></label></div>
          <label className="stock-check"><input type="checkbox" checked={product.inStock} onChange={(event) => updateProduct(index, { inStock: event.target.checked })} /> Disponível em estoque</label>
        </div>)}
      </fieldset>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="store-form-footer"><span>Cadastro gratuito. Os dados serão revisados antes de aparecerem na busca.</span><button type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar para análise"}</button></div>
    </form>}
  </section>;
}
