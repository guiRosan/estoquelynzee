const API_URL = "http://localhost:3000/api";

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

        document
            .querySelector(`#${sectionName}`)
            .classList.add("active");

        document.querySelector("#pageTitle").textContent =
            item.textContent.trim();

        if (sectionName === "produtos") {
            carregarProdutos();
        }

        if (sectionName === "movimentacoes") {
            carregarMovimentacoes();
        }

    });

});

// ======================================================
// VERIFICAR BACKEND
// ======================================================

async function verificarBackend() {

    try {

        const resposta = await fetch(
            `${API_URL}/status`
        );

        if (!resposta.ok) {
            throw new Error();
        }

        document
            .querySelector("#connectionDot")
            .classList.remove("offline");

        document
            .querySelector("#connectionDot")
            .classList.add("online");

        document
            .querySelector("#connectionText")
            .textContent = "Sistema online";

    } catch (erro) {

        document
            .querySelector("#connectionDot")
            .classList.remove("online");

        document
            .querySelector("#connectionDot")
            .classList.add("offline");

        document
            .querySelector("#connectionText")
            .textContent = "Servidor offline";

    }

}

// ======================================================
// CARREGAR PRODUTOS
// ======================================================

async function carregarProdutos() {

    try {

        const resposta = await fetch(
            `${API_URL}/produtos`
        );

        if (!resposta.ok) {
            throw new Error(
                "Não foi possível carregar os produtos."
            );
        }

        const produtos = await resposta.json();

        mostrarProdutos(produtos);

        atualizarDashboard(produtos);

    } catch (erro) {

        console.error(erro);

    }

}

// ======================================================
// MOSTRAR PRODUTOS
// ======================================================

function mostrarProdutos(produtos) {

    const tabela =
        document.querySelector("#productsTable");

    const recentes =
        document.querySelector("#recentProductsTable");

    tabela.innerHTML = "";
    recentes.innerHTML = "";

    produtos.forEach(produto => {

        const estoque =
            Number(produto.estoque_atual);

        const minimo =
            Number(produto.estoque_minimo);

        const estoqueBaixo =
            estoque <= minimo;

        const linha = `
            <tr>

                <td>
                    ${produto.codigo_barras}
                </td>

                <td>
                    ${produto.nome}
                </td>

                <td>
                    R$ ${formatarPreco(produto.preco)}
                </td>

                <td>
                    R$ ${formatarPreco(produto.custo)}
                </td>

                <td>
                    ${produto.fornecedor || "-"}
                </td>

                <td>
                    ${estoque}
                </td>

                <td>
                    ${minimo}
                </td>

                <td>

                    <span class="status ${estoqueBaixo ? "low" : "ok"}">

                        ${estoqueBaixo
                            ? "Estoque baixo"
                            : "Normal"
                        }

                    </span>

                </td>

            </tr>
        `;

        tabela.innerHTML += linha;

    });

    // Apenas os primeiros 5 produtos

    produtos
        .slice(0, 5)
        .forEach(produto => {

            const linha = `
                <tr>

                    <td>
                        ${produto.codigo_barras}
                    </td>

                    <td>
                        ${produto.nome}
                    </td>

                    <td>
                        R$ ${formatarPreco(produto.preco)}
                    </td>

                    <td>
                        ${produto.fornecedor || "-"}
                    </td>

                    <td>
                        ${produto.estoque_atual}
                    </td>

                    <td>
                        ${produto.estoque_minimo}
                    </td>

                </tr>
            `;

            recentes.innerHTML += linha;

        });

}

// ======================================================
// DASHBOARD
// ======================================================

function atualizarDashboard(produtos) {

    const totalProdutos =
        produtos.length;

    const totalEstoque =
        produtos.reduce(
            (total, produto) =>
                total + Number(produto.estoque_atual),
            0
        );

    const estoqueBaixo =
        produtos.filter(produto =>
            Number(produto.estoque_atual)
            <= Number(produto.estoque_minimo)
        ).length;

    document.querySelector("#totalProdutos")
        .textContent = totalProdutos;

    document.querySelector("#totalEstoque")
        .textContent = totalEstoque;

    document.querySelector("#estoqueBaixo")
        .textContent = estoqueBaixo;

}

// ======================================================
// BUSCAR CÓDIGO DE BARRAS
// ======================================================

async function buscarCodigoBarras() {

    const codigo =
        barcodeInput.value.trim();

    if (!codigo) {
        return;
    }

    try {

        const resposta = await fetch(
            `${API_URL}/produtos/${codigo}`
        );

        if (resposta.status === 404) {

            mostrarProdutoNaoEncontrado(codigo);

            return;
        }

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar produto."
            );
        }

        const produto =
            await resposta.json();

        mostrarProdutoEncontrado(produto);

    } catch (erro) {

        console.error(erro);

        scannerResult.innerHTML = `
            <div class="status low">
                Erro ao consultar o produto.
            </div>
        `;

    }

}

// ==========================================
// LER RESPOSTA DA API
// ==========================================

async function lerRespostaAPI(resposta) {

    const texto = await resposta.text();

    try {

        return JSON.parse(texto);

    } catch {

        throw new Error(
            `O servidor respondeu algo que não é JSON. Status: ${resposta.status}`
        );

    }

}

// ======================================================
// PRODUTO ENCONTRADO
// ======================================================

function mostrarProdutoEncontrado(produto) {

    scannerResult.innerHTML = `

        <div class="scanner-product">

            <h3>
                ${produto.nome}
            </h3>

            <p>
                Código:
                <strong>
                    ${produto.codigo_barras}
                </strong>
            </p>

            <p>
                Estoque atual:
                <strong>
                    ${produto.estoque_atual}
                </strong>
            </p>

            <p>
                Preço:
                <strong>
                    R$ ${formatarPreco(produto.preco)}
                </strong>
            </p>

            <div style="margin-top: 15px; display:flex; gap:10px;">

                <button
                    class="button primary"
                    id="entryButton"
                >
                    + Entrada
                </button>

                <button
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
            () => abrirMovimentacao(
                produto,
                "ENTRADA"
            )
        );


    document
        .querySelector("#exitButton")
        .addEventListener(
            "click",
            () => abrirMovimentacao(
                produto,
                "SAIDA"
            )
        );

}

// ======================================================
// PRODUTO NÃO ENCONTRADO
// ======================================================

function mostrarProdutoNaoEncontrado(codigo) {

    scannerResult.innerHTML = `

        <div>

            <p>
                Produto não cadastrado.
            </p>

            <br>

            <button
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

                document
                    .querySelector("#productBarcode")
                    .value = codigo;

                document
                    .querySelector("#productName")
                    .focus();

            }
        );

}

// ======================================================
// LEITOR TANCA
// ======================================================

barcodeInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            buscarCodigoBarras();

        }

    }
);

searchBarcodeButton.addEventListener(
    "click",
    buscarCodigoBarras
);

// ======================================================
// CADASTRO DE PRODUTO
// ======================================================

function abrirProdutoModal() {

    productModal.classList.add("active");

    document
        .querySelector("#productBarcode")
        .focus();

}

function fecharProdutoModal() {

    productModal.classList.remove("active");

    productForm.reset();

    document
        .querySelector("#productMinimumStock")
        .value = 5;

}

document
    .querySelector("#newProductButton")
    .addEventListener(
        "click",
        abrirProdutoModal
    );


document
    .querySelector("#newProductButton2")
    .addEventListener(
        "click",
        abrirProdutoModal
    );

document
    .querySelector("#closeProductModal")
    .addEventListener(
        "click",
        fecharProdutoModal
    );


document
    .querySelector("#cancelProduct")
    .addEventListener(
        "click",
        fecharProdutoModal
    );

// ======================================================
// ENVIAR PRODUTO
// ======================================================

productForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const produto = {

            codigo_barras:
                document
                    .querySelector("#productBarcode")
                    .value
                    .trim(),

            nome:
                document
                    .querySelector("#productName")
                    .value
                    .trim(),

            preco:
                Number(
                    document
                        .querySelector("#productPrice")
                        .value
                ),
            custo:
                Number(
                    document
                        .querySelector("#productCost")
                        .value
                ),
            fornecedor:
                document
                    .querySelector("#productSupplier")
                    .value
                    .trim(),

            quantidade_inicial:
                Number(
                    document
                        .querySelector("#productInitialQuantity")
                        .value
                ),

            estoque_minimo:
                Number(
                    document
                        .querySelector("#productMinimumStock")
                        .value
                )

        };

        try {

            const resposta = await fetch(
                `${API_URL}/produtos`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(produto)
                }
            );


            const dados = await lerRespostaAPI(resposta);

            if (!resposta.ok) {

                throw new Error(
                dados.mensagem ||
                "Erro ao cadastrar produto."
                );

            };


            fecharProdutoModal();

            await carregarProdutos();

            alert(
                "Produto cadastrado com sucesso!"
            );


        } catch (erro) {

            alert(erro.message);

        }

    }
);

// ======================================================
// MOVIMENTAÇÃO
// ======================================================

function abrirMovimentacao(
    produto,
    tipo
) {

    movementModal.classList.add("active");

    document
        .querySelector("#movementType")
        .value = tipo;

    document
        .querySelector("#movementBarcode")
        .value = produto.codigo_barras;

    document
        .querySelector("#movementProductName")
        .textContent =
        `${produto.nome} — Estoque atual: ${produto.estoque_atual}`;

    document
        .querySelector("#movementTitle")
        .textContent =
        tipo === "ENTRADA"
            ? "Entrada de estoque"
            : "Saída de estoque";

    document
        .querySelector("#movementQuantity")
        .value = "";

    document
        .querySelector("#movementObservation")
        .value = "";

    document
        .querySelector("#movementQuantity")
        .focus();

}


function fecharMovimentacao() {

    movementModal.classList.remove("active");

    movementForm.reset();

}


document
    .querySelector("#closeMovementModal")
    .addEventListener(
        "click",
        fecharMovimentacao
    );


document
    .querySelector("#cancelMovement")
    .addEventListener(
        "click",
        fecharMovimentacao
    );

// ======================================================
// REGISTRAR MOVIMENTAÇÃO
// ======================================================

movementForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const tipo =
            document
                .querySelector("#movementType")
                .value;

        const movimento = {

            codigo_barras:
                document
                    .querySelector("#movementBarcode")
                    .value,

            quantidade:
                Number(
                    document
                        .querySelector("#movementQuantity")
                        .value
                ),

            tipo,

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
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(movimento)
                }
            );


            if (!resposta.ok) {

                const erro =
                    await resposta.json();

                throw new Error(
                    erro.mensagem ||
                    "Erro ao registrar movimentação."
                );

            }


            fecharMovimentacao();

            barcodeInput.value =
                movimento.codigo_barras;

            await buscarCodigoBarras();

            await carregarProdutos();

            await carregarMovimentacoes();

            alert(
                "Movimentação registrada com sucesso!"
            );


        } catch (erro) {

            alert(erro.message);

        }

    }
);

// ======================================================
// CARREGAR MOVIMENTAÇÕES
// ======================================================

async function carregarMovimentacoes() {

    try {

        const resposta = await fetch(
            `${API_URL}/movimentacoes`
        );

        if (!resposta.ok) {
            throw new Error();
        }

        const movimentacoes =
            await resposta.json();

        mostrarMovimentacoes(
            movimentacoes
        );

        document
            .querySelector("#totalMovimentacoes")
            .textContent =
            movimentacoes.length;

    } catch (erro) {

        console.error(erro);

    }

}


// ======================================================
// MOSTRAR MOVIMENTAÇÕES
// ======================================================

function mostrarMovimentacoes(
    movimentacoes
) {

    const tabela =
        document.querySelector(
            "#movementsTable"
        );

    const recentes =
        document.querySelector(
            "#recentMovementsTable"
        );

    tabela.innerHTML = "";
    recentes.innerHTML = "";


    movimentacoes.forEach(
        movimentacao => {

            const entrada =
                movimentacao.tipo === "ENTRADA";

            const linha = `

                <tr>

                    <td>
                        ${formatarData(
                            movimentacao.data_movimentacao
                        )}
                    </td>

                    <td>
                        ${movimentacao.codigo_barras}
                    </td>

                    <td>
                        ${movimentacao.produto}
                    </td>

                    <td>

                        <span class="${
                            entrada
                                ? "movement-entry"
                                : "movement-exit"
                        }">

                            ${
                                entrada
                                    ? "ENTRADA"
                                    : "SAÍDA"
                            }

                        </span>

                    </td>

                    <td>
                        ${movimentacao.quantidade}
                    </td>

                    <td>
                        ${movimentacao.observacao || "-"}
                    </td>

                </tr>
            `;

            tabela.innerHTML += linha;

        }
    );

    movimentacoes
        .slice(0, 5)
        .forEach(
            movimentacao => {

                const entrada =
                    movimentacao.tipo === "ENTRADA";

                const linha = `

                    <tr>

                        <td>
                            ${formatarData(
                                movimentacao.data_movimentacao
                            )}
                        </td>

                        <td>
                            ${movimentacao.produto}
                        </td>

                        <td>

                            <span class="${
                                entrada
                                    ? "movement-entry"
                                    : "movement-exit"
                            }">

                                ${
                                    entrada
                                        ? "ENTRADA"
                                        : "SAÍDA"
                                }

                            </span>

                        </td>

                        <td>
                            ${movimentacao.quantidade}
                        </td>

                        <td>
                            ${movimentacao.observacao || "-"}
                        </td>

                    </tr>

                `;

                recentes.innerHTML += linha;

            }
        );

}

// ======================================================
// PESQUISA
// ======================================================

document
    .querySelector("#productSearch")
    .addEventListener(
        "input",
        event => {

            const termo =
                event.target.value
                    .toLowerCase();

            const linhas =
                document.querySelectorAll(
                    "#productsTable tr"
                );

            linhas.forEach(linha => {

                const texto =
                    linha.textContent
                        .toLowerCase();

                linha.style.display =
                    texto.includes(termo)
                        ? ""
                        : "none";

            });

        }
    );

// ======================================================
// FORMATAÇÃO
// ======================================================

function formatarPreco(valor) {

    return Number(valor)
        .toFixed(2)
        .replace(".", ",");

}

function formatarData(data) {

    if (!data) {
        return "-";
    }

    return new Date(data)
        .toLocaleString("pt-BR");

}

// ======================================================
// INICIALIZAÇÃO
// ======================================================

async function iniciar() {

    await verificarBackend();

    await carregarProdutos();

    await carregarMovimentacoes();

    barcodeInput.focus();

}

iniciar();