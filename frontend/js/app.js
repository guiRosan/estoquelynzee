const API_URL = "/api";

// ======================================================
// ELEMENTOS
// ======================================================

const barcodeInput = document.querySelector("#barcodeInput");
const searchBarcodeButton = document.querySelector("#searchBarcodeButton");
const scannerResult = document.querySelector("#scannerResult");

const productModal = document.querySelector("#productModal");
const movementModal = document.querySelector("#movementModal");

const productForm = document.querySelector("#productForm");
const movementForm = document.querySelector("#movementForm");

// ======================================================
// API
// ======================================================

async function lerRespostaAPI(resposta) {
    const texto = await resposta.text();

    if (!texto) {
        return {};
    }

    try {
        return JSON.parse(texto);
    } catch {
        throw new Error(
            `Resposta inválida do servidor. HTTP ${resposta.status}.`
        );
    }
}

async function verificarStatusAPI() {
    const connectionDot = document.querySelector("#connectionDot");
    const connectionText = document.querySelector("#connectionText");

    if (!connectionDot || !connectionText) {
        return;
    }

    connectionText.textContent = "Verificando...";

    try {
        const resposta = await fetch(`${API_URL}/status`, {
            headers: {
                Accept: "application/json"
            }
        });

        const dados = await lerRespostaAPI(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || "A API retornou um erro."
            );
        }

        connectionText.textContent = "Online";
        connectionDot.classList.remove("offline");
        connectionDot.classList.add("online");
    } catch (erro) {
        connectionText.textContent = "Offline";
        connectionDot.classList.remove("online");
        connectionDot.classList.add("offline");

        console.error("Erro ao verificar a API:", erro);
    }
}

// ======================================================
// NAVEGAÇÃO
// ======================================================

const menuItems = document.querySelectorAll(".menu-item");
const sections = document.querySelectorAll(".section");

menuItems.forEach(item => {
    item.addEventListener("click", () => {
        const sectionName = item.dataset.section;

        menuItems.forEach(menu => {
            menu.classList.remove("active");
        });

        item.classList.add("active");

        sections.forEach(section => {
            section.classList.remove("active");
        });

        const section = document.querySelector(`#${sectionName}`);

        if (section) {
            section.classList.add("active");
        }

        const pageTitle = document.querySelector("#pageTitle");

        if (pageTitle) {
            pageTitle.textContent = item.textContent.trim();
        }

        if (sectionName === "produtos") {
            carregarProdutos();
        }

        if (sectionName === "movimentacoes") {
            carregarMovimentacoes();
        }
    });
});

// ======================================================
// PRODUTOS
// ======================================================

async function carregarProdutos() {
    try {
        const resposta = await fetch(`${API_URL}/produtos`);
        const dados = await lerRespostaAPI(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || "Não foi possível carregar os produtos."
            );
        }

        const produtos = Array.isArray(dados) ? dados : [];

        mostrarProdutos(produtos);
        atualizarDashboard(produtos);
    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);
    }
}

function mostrarProdutos(produtos) {
    const tabela = document.querySelector("#productsTable");
    const recentes = document.querySelector("#recentProductsTable");

    if (!tabela || !recentes) {
        return;
    }

    tabela.innerHTML = "";
    recentes.innerHTML = "";

    produtos.forEach(produto => {
        const estoque = Number(produto.estoque_atual);
        const minimo = Number(produto.estoque_minimo);
        const estoqueBaixo = estoque <= minimo;

        tabela.insertAdjacentHTML(
            "beforeend",
            `
                <tr>
                    <td>${escaparHTML(produto.codigo_barras)}</td>
                    <td>${escaparHTML(produto.nome)}</td>
                    <td>R$ ${formatarPreco(produto.preco)}</td>
                    <td>R$ ${formatarPreco(produto.custo)}</td>
                    <td>${escaparHTML(produto.fornecedor || "-")}</td>
                    <td>${estoque}</td>
                    <td>${minimo}</td>
                    <td>
                        <span class="status ${estoqueBaixo ? "low" : "ok"}">
                            ${estoqueBaixo ? "Estoque baixo" : "Normal"}
                        </span>
                    </td>
                </tr>
            `
        );
    });

    produtos.slice(0, 5).forEach(produto => {
        recentes.insertAdjacentHTML(
            "beforeend",
            `
                <tr>
                    <td>${escaparHTML(produto.codigo_barras)}</td>
                    <td>${escaparHTML(produto.nome)}</td>
                    <td>R$ ${formatarPreco(produto.preco)}</td>
                    <td>R$ ${formatarPreco(produto.custo)}</td>
                    <td>${escaparHTML(produto.fornecedor || "-")}</td>
                    <td>${Number(produto.estoque_atual)}</td>
                    <td>${Number(produto.estoque_minimo)}</td>
                </tr>
            `
        );
    });
}

function atualizarDashboard(produtos) {
    const totalProdutos = produtos.length;

    const totalEstoque = produtos.reduce(
        (total, produto) =>
            total + Number(produto.estoque_atual || 0),
        0
    );

    const estoqueBaixo = produtos.filter(
        produto =>
            Number(produto.estoque_atual) <=
            Number(produto.estoque_minimo)
    ).length;

    document.querySelector("#totalProdutos").textContent = totalProdutos;
    document.querySelector("#totalEstoque").textContent = totalEstoque;
    document.querySelector("#estoqueBaixo").textContent = estoqueBaixo;
}

// ======================================================
// LEITOR / BUSCA POR CÓDIGO
// ======================================================

async function buscarCodigoBarras() {
    const codigo = barcodeInput.value.trim();

    if (!codigo) {
        return;
    }

    try {
        const resposta = await fetch(
            `${API_URL}/produtos/${encodeURIComponent(codigo)}`
        );

        const dados = await lerRespostaAPI(resposta);

        if (resposta.status === 404) {
            mostrarProdutoNaoEncontrado(codigo);
            return;
        }

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || "Erro ao buscar produto."
            );
        }

        mostrarProdutoEncontrado(dados);
    } catch (erro) {
        console.error("Erro ao consultar produto:", erro);

        scannerResult.innerHTML = `
            <div class="status low">
                Erro ao consultar o produto.
            </div>
        `;
    }
}

function mostrarProdutoEncontrado(produto) {
    scannerResult.innerHTML = `
        <div class="scanner-product">
            <h3>${escaparHTML(produto.nome)}</h3>

            <p>
                Código:
                <strong>${escaparHTML(produto.codigo_barras)}</strong>
            </p>

            <p>
                Estoque atual:
                <strong>${Number(produto.estoque_atual)}</strong>
            </p>

            <p>
                Preço:
                <strong>R$ ${formatarPreco(produto.preco)}</strong>
            </p>

            <div style="margin-top: 15px; display:flex; gap:10px;">
                <button
                    type="button"
                    class="button primary"
                    id="entryButton"
                >
                    + Entrada
                </button>

                <button
                    type="button"
                    class="button secondary"
                    id="exitButton"
                >
                    - Saída
                </button>
            </div>
        </div>
    `;

    document
        .querySelector("#entryButton")
        .addEventListener(
            "click",
            () => abrirMovimentacao(produto, "ENTRADA")
        );

    document
        .querySelector("#exitButton")
        .addEventListener(
            "click",
            () => abrirMovimentacao(produto, "SAIDA")
        );
}

function mostrarProdutoNaoEncontrado(codigo) {
    scannerResult.innerHTML = `
        <div>
            <p>Produto não cadastrado.</p>

            <br>

            <button
                type="button"
                class="button primary"
                id="registerScannedProduct"
            >
                Cadastrar este produto
            </button>
        </div>
    `;

    document
        .querySelector("#registerScannedProduct")
        .addEventListener(
            "click",
            () => {
                abrirProdutoModal();

                document.querySelector("#productBarcode").value =
                    codigo;

                document.querySelector("#productName").focus();
            }
        );
}

barcodeInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        buscarCodigoBarras();
    }
});

searchBarcodeButton.addEventListener(
    "click",
    buscarCodigoBarras
);

// ======================================================
// CADASTRO DE PRODUTO
// ======================================================

function abrirProdutoModal() {
    productModal.classList.add("active");
    document.querySelector("#productBarcode").focus();
}

function fecharProdutoModal() {
    productModal.classList.remove("active");
    productForm.reset();
    document.querySelector("#productMinimumStock").value = 5;
}

document
    .querySelector("#newProductButton")
    .addEventListener("click", abrirProdutoModal);

document
    .querySelector("#newProductButton2")
    .addEventListener("click", abrirProdutoModal);

document
    .querySelector("#closeProductModal")
    .addEventListener("click", fecharProdutoModal);

productForm.addEventListener("submit", async event => {
    event.preventDefault();

    const produto = {
        codigo_barras:
            document.querySelector("#productBarcode").value.trim(),

        nome:
            document.querySelector("#productName").value.trim(),

        preco:
            Number(document.querySelector("#productPrice").value),

        custo:
            Number(document.querySelector("#productCost").value),

        fornecedor:
            document.querySelector("#productSupplier").value.trim(),

        quantidade_inicial:
            Number(
                document.querySelector("#productInitialQuantity").value
            ),

        estoque_minimo:
            Number(
                document.querySelector("#productMinimumStock").value
            )
    };

    try {
        const resposta = await fetch(`${API_URL}/produtos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(produto)
        });

        const dados = await lerRespostaAPI(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || "Erro ao cadastrar produto."
            );
        }

        fecharProdutoModal();
        await carregarProdutos();

        alert("Produto cadastrado com sucesso!");
        barcodeInput.focus();
    } catch (erro) {
        alert(erro.message);
    }
});

// ======================================================
// MOVIMENTAÇÕES
// ======================================================

function abrirMovimentacao(produto, tipo) {
    movementModal.classList.add("active");

    document.querySelector("#movementType").value = tipo;
    document.querySelector("#movementBarcode").value =
        produto.codigo_barras;

    document.querySelector("#movementProductName").textContent =
        `${produto.nome} — Estoque atual: ${produto.estoque_atual}`;

    document.querySelector("#movementTitle").textContent =
        tipo === "ENTRADA"
            ? "Entrada de estoque"
            : "Saída de estoque";

    document.querySelector("#movementQuantity").value = "";
    document.querySelector("#movementObservation").value = "";
    document.querySelector("#movementQuantity").focus();
}

function fecharMovimentacao() {
    movementModal.classList.remove("active");
    movementForm.reset();
}

document
    .querySelector("#closeMovementModal")
    .addEventListener("click", fecharMovimentacao);

document
    .querySelector("#cancelMovement")
    .addEventListener("click", fecharMovimentacao);

movementForm.addEventListener("submit", async event => {
    event.preventDefault();

    const movimento = {
        codigo_barras:
            document.querySelector("#movementBarcode").value,

        quantidade:
            Number(document.querySelector("#movementQuantity").value),

        tipo:
            document.querySelector("#movementType").value,

        observacao:
            document
                .querySelector("#movementObservation")
                .value
                .trim()
    };

    try {
        const resposta = await fetch(
            `${API_URL}/movimentacoes`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(movimento)
            }
        );

        const dados = await lerRespostaAPI(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || "Erro ao realizar operação."
            );
        }

        fecharMovimentacao();

        barcodeInput.value = movimento.codigo_barras;

        await buscarCodigoBarras();
        await carregarProdutos();
        await carregarMovimentacoes();

        alert("Movimentação registrada com sucesso!");
    } catch (erro) {
        alert(erro.message);
    }
});

async function carregarMovimentacoes() {
    try {
        const resposta = await fetch(
            `${API_URL}/movimentacoes`
        );

        const dados = await lerRespostaAPI(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem ||
                "Não foi possível carregar as movimentações."
            );
        }

        const movimentacoes = Array.isArray(dados) ? dados : [];

        mostrarMovimentacoes(movimentacoes);

        document.querySelector("#totalMovimentacoes").textContent =
            movimentacoes.length;
    } catch (erro) {
        console.error("Erro ao carregar movimentações:", erro);
    }
}

function mostrarMovimentacoes(movimentacoes) {
    const tabela = document.querySelector("#movementsTable");
    const recentes = document.querySelector(
        "#recentMovementsTable"
    );

    if (!tabela || !recentes) {
        return;
    }

    tabela.innerHTML = "";
    recentes.innerHTML = "";

    movimentacoes.forEach(movimentacao => {
        const entrada = movimentacao.tipo === "ENTRADA";

        tabela.insertAdjacentHTML(
            "beforeend",
            `
                <tr>
                    <td>${formatarData(movimentacao.data_movimentacao)}</td>
                    <td>${escaparHTML(movimentacao.codigo_barras)}</td>
                    <td>${escaparHTML(movimentacao.produto)}</td>
                    <td>
                        <span class="${
                            entrada
                                ? "movement-entry"
                                : "movement-exit"
                        }">
                            ${entrada ? "ENTRADA" : "SAÍDA"}
                        </span>
                    </td>
                    <td>${Number(movimentacao.quantidade)}</td>
                    <td>${escaparHTML(movimentacao.observacao || "-")}</td>
                </tr>
            `
        );
    });

    movimentacoes.slice(0, 5).forEach(movimentacao => {
        const entrada = movimentacao.tipo === "ENTRADA";

        recentes.insertAdjacentHTML(
            "beforeend",
            `
                <tr>
                    <td>${formatarData(movimentacao.data_movimentacao)}</td>
                    <td>${escaparHTML(movimentacao.produto)}</td>
                    <td>
                        <span class="${
                            entrada
                                ? "movement-entry"
                                : "movement-exit"
                        }">
                            ${entrada ? "ENTRADA" : "SAÍDA"}
                        </span>
                    </td>
                    <td>${Number(movimentacao.quantidade)}</td>
                    <td>${escaparHTML(movimentacao.observacao || "-")}</td>
                </tr>
            `
        );
    });
}

// ======================================================
// PESQUISA
// ======================================================

document
    .querySelector("#productSearch")
    .addEventListener("input", event => {
        const termo = event.target.value.toLowerCase();

        const linhas = document.querySelectorAll(
            "#productsTable tr"
        );

        linhas.forEach(linha => {
            const texto = linha.textContent.toLowerCase();

            linha.style.display =
                texto.includes(termo) ? "" : "none";
        });
    });

// ======================================================
// MODAIS
// ======================================================

productModal.addEventListener("click", event => {
    if (event.target === productModal) {
        fecharProdutoModal();
    }
});

movementModal.addEventListener("click", event => {
    if (event.target === movementModal) {
        fecharMovimentacao();
    }
});

document.addEventListener("keydown", event => {
    if (event.key !== "Escape") {
        return;
    }

    if (productModal.classList.contains("active")) {
        fecharProdutoModal();
    }

    if (movementModal.classList.contains("active")) {
        fecharMovimentacao();
    }
});

// ======================================================
// FORMATAÇÃO / SEGURANÇA
// ======================================================

function formatarPreco(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return "0,00";
    }

    return numero.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarData(data) {
    if (!data) {
        return "-";
    }

    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) {
        return "-";
    }

    return dataConvertida.toLocaleString("pt-BR");
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ======================================================
// INICIALIZAÇÃO
// ======================================================

async function iniciar() {
    await verificarStatusAPI();

    await Promise.all([
        carregarProdutos(),
        carregarMovimentacoes()
    ]);

    barcodeInput.focus();
}

iniciar();
