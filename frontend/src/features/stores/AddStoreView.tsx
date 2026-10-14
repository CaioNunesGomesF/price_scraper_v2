import { useState, type FormEvent } from "react";
import Icon from "../../shared/Icon";
import type { StoreSubmission } from "./stores.api";

type Props = {
  busy: boolean;
  error: string;
  success: string;
  onSubmit: (data: StoreSubmission) => void;
  onViewStores?: () => void;
};

type ProductForm = { title: string; productUrl: string; imageUrl: string; price: string; inStock: boolean };
const newProduct = (): ProductForm => ({ title: "", productUrl: "", imageUrl: "", price: "", inStock: true });

export default function AddStoreView({ busy, error, success, onSubmit, onViewStores }: Props) {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [products, setProducts] = useState<ProductForm[]>([newProduct()]);

  function updateProduct(index: number, changes: Partial<ProductForm>) {
    setProducts((current) => current.map((product, itemIndex) => (itemIndex === index ? { ...product, ...changes } : product)));
  }

  function resetForm() {
    setName("");
    setWebsiteUrl("");
    setContactEmail("");
    setDescription("");
    setCity("");
    setState("");
    setProducts([newProduct()]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      name,
      websiteUrl,
      contactEmail,
      description: description || undefined,
      city: city || undefined,
      state: state || undefined,
      products: products.map((product) => ({
        title: product.title,
        productUrl: product.productUrl,
        imageUrl: product.imageUrl || null,
        price: Number(product.price),
        inStock: product.inStock,
      })),
    });
  }

  return (
    <section className="view add-store-view">
      <div className="view-heading">
        <p>Integração de Parceiros • PostgreSQL</p>
        <h1>Cadastrar Loja Parceira</h1>
        <span>
          Cadastre sua loja e catálogo de produtos. As ofertas cadastradas são salvas no banco de dados e entram
          automaticamente no comparador de preços e no Dashboard!
        </span>
      </div>

      {success ? (
        <div className="store-submission-success" role="status">
          <span className="success-check">✓</span>
          <div>
            <h2>Loja cadastrada com sucesso no Banco!</h2>
            <p>{success}</p>
            <span>Sua loja e ofertas já estão disponíveis na comparação de preços e nos gráficos do Dashboard.</span>

            <div className="success-actions-row" style={{ marginTop: 20, display: "flex", gap: 12 }}>
              {onViewStores && (
                <button type="button" className="btn-profile-primary" onClick={onViewStores}>
                  <Icon name="search" />
                  <span>Ver Minha Loja em "Lojas"</span>
                </button>
              )}
              <button type="button" className="btn-profile-secondary" onClick={resetForm}>
                <Icon name="plus" />
                <span>Cadastrar Outra Loja</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form className="store-form" onSubmit={submit}>
          <fieldset>
            <legend>Informações da Loja</legend>
            <label>
              Nome da loja
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={160}
                placeholder="Ex.: Pichau Informática, KaBuM!, Terabyte..."
              />
            </label>
            <label>
              Endereço do Site (URL completa)
              <input
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                required
                placeholder="https://www.sualoja.com.br"
              />
            </label>
            <label>
              E-mail de Contato
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                required
                placeholder="contato@sualoja.com.br"
              />
            </label>
            <label>
              Descrição <span className="optional-label">opcional</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Conte brevemente os diferenciais ou categorias principais de produtos da loja"
              />
            </label>
            <div className="store-location-fields">
              <label>
                Cidade <span className="optional-label">opcional</span>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  maxLength={100}
                  placeholder="Ex.: São Paulo"
                />
              </label>
              <label>
                Estado (UF) <span className="optional-label">opcional</span>
                <input
                  value={state}
                  onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                  placeholder="SP"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="product-fieldset">
            <legend>Produtos e Ofertas Iniciais</legend>
            <div className="product-legend">
              <span>Adicione os produtos e preços reais para alimentar o Scraper e os gráficos (1 a 20 itens).</span>
              <button
                type="button"
                disabled={products.length >= 20}
                onClick={() => setProducts((current) => [...current, newProduct()])}
              >
                + Adicionar Outro Produto
              </button>
            </div>

            {products.map((product, index) => (
              <div className="product-form-row" key={index}>
                <div className="product-form-heading">
                  <strong>Produto #{index + 1}</strong>
                  {products.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remover produto ${index + 1}`}
                      onClick={() => setProducts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      Remover
                    </button>
                  )}
                </div>
                <label>
                  Título do Produto
                  <input
                    value={product.title}
                    onChange={(event) => updateProduct(index, { title: event.target.value })}
                    required
                    minLength={2}
                    maxLength={255}
                    placeholder="Ex.: Monitor Gamer 27 144Hz"
                  />
                </label>
                <label>
                  Link do Produto na sua Loja
                  <input
                    type="url"
                    value={product.productUrl}
                    onChange={(event) => updateProduct(index, { productUrl: event.target.value })}
                    required
                    placeholder="https://www.sualoja.com.br/produto-x"
                  />
                </label>
                <div className="product-price-row">
                  <label>
                    Preço à vista (R$)
                    <input
                      type="number"
                      value={product.price}
                      onChange={(event) => updateProduct(index, { price: event.target.value })}
                      required
                      min="0.01"
                      max="20000000"
                      step="0.01"
                      placeholder="999.90"
                    />
                  </label>
                  <label>
                    URL da Imagem <span className="optional-label">opcional</span>
                    <input
                      type="url"
                      value={product.imageUrl}
                      onChange={(event) => updateProduct(index, { imageUrl: event.target.value })}
                      placeholder="https://.../foto.jpg"
                    />
                  </label>
                </div>
                <label className="stock-check">
                  <input
                    type="checkbox"
                    checked={product.inStock}
                    onChange={(event) => updateProduct(index, { inStock: event.target.checked })}
                  />{" "}
                  Produto disponível em estoque
                </label>
              </div>
            ))}
          </fieldset>

          {error && (
            <div className="auth-alert error" role="alert">
              <Icon name="close" />
              <span>{error}</span>
            </div>
          )}

          <div className="store-form-footer">
            <span>Ao cadastrar, os produtos serão salvos e exibidos no banco de dados.</span>
            <button type="submit" disabled={busy} className="auth-submit-btn" style={{ maxWidth: 240 }}>
              {busy ? "Salvando no Banco..." : "Cadastrar e Ativar Loja"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
