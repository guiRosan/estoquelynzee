import express from "express";
import pool from "../config/database.js";

const router = express.Router();

/*
    Consulta utilizada para calcular o estoque atual:

    estoque atual =
    quantidade inicial
    + entradas
    - saídas
*/
const consultaEstoque = `
    SELECT
        p.id AS codigo_barras,
        p.nome,
        p.preco,
        p.custo,
        p.fornecedor,
        p.quantidade_inicial,
        p.estoque_minimo,
        p.data_cadastro,
        p.data_atualizacao,

        p.quantidade_inicial + COALESCE((
            SELECT SUM(
                CASE
                    WHEN m.tipo = 'ENTRADA' THEN m.quantidade
                    WHEN m.tipo = 'SAIDA' THEN -m.quantidade
                    ELSE 0
                END
            )
            FROM movimentacao m
            WHERE m.codigo_barras = p.id
        ), 0) AS estoque_atual

    FROM produtos p
`;


/*
    GET /api/produtos

    Lista todos os produtos.
*/
router.get("/", async (req, res) => {
    try {
        const [produtos] = await pool.query(`
            ${consultaEstoque}
            ORDER BY p.data_cadastro DESC
        `);

        res.json(produtos);
    } catch (erro) {
        console.error("Erro ao buscar produtos:", erro.message);

        res.status(500).json({
            mensagem: "Erro ao buscar produtos.",
            erro: erro.message
        });
    }
});


/*
    GET /api/produtos/:codigo

    Busca um produto pelo código de barras.
*/
router.get("/:codigo", async (req, res) => {
    const { codigo } = req.params;

    try {
        const [produtos] = await pool.query(
            `
                ${consultaEstoque}
                WHERE p.id = ?
            `,
            [codigo]
        );

        if (produtos.length === 0) {
            return res.status(404).json({
                mensagem: "Produto não encontrado."
            });
        }

        res.json(produtos[0]);
    } catch (erro) {
        console.error("Erro ao buscar produto:", erro.message);

        res.status(500).json({
            mensagem: "Erro ao buscar produto.",
            erro: erro.message
        });
    }
});


/*
    POST /api/produtos

    Cadastra um novo produto.
*/
router.post("/", async (req, res) => {
    const {
        codigo_barras,
        nome,
        preco,
        custo,
        fornecedor,
        quantidade_inicial,
        estoque_minimo
    } = req.body;

    if (!codigo_barras || !String(codigo_barras).trim()) {
        return res.status(400).json({
            mensagem: "O código de barras é obrigatório."
        });
    }

    if (!nome || !String(nome).trim()) {
        return res.status(400).json({
            mensagem: "O nome do produto é obrigatório."
        });
    }

    const precoNumerico = Number(preco ?? 0);
    const custoNumerico = Number(custo ?? 0);
    const quantidadeInicialNumerica = Number(quantidade_inicial ?? 0);
    const estoqueMinimoNumerico = Number(estoque_minimo ?? 5);

    if (
        !Number.isFinite(precoNumerico) ||
        precoNumerico < 0
    ) {
        return res.status(400).json({
            mensagem: "O preço deve ser um número válido maior ou igual a zero."
        });
    }

    if (
        !Number.isFinite(custoNumerico) ||
        custoNumerico < 0
    ) {
        return res.status(400).json({
            mensagem: "O custo deve ser um número válido maior ou igual a zero."
        });
    }

    if (
        !Number.isInteger(quantidadeInicialNumerica) ||
        quantidadeInicialNumerica < 0
    ) {
        return res.status(400).json({
            mensagem: "A quantidade inicial deve ser um número inteiro maior ou igual a zero."
        });
    }

    if (
        !Number.isInteger(estoqueMinimoNumerico) ||
        estoqueMinimoNumerico < 0
    ) {
        return res.status(400).json({
            mensagem: "O estoque mínimo deve ser um número inteiro maior ou igual a zero."
        });
    }

    try {
        const [resultado] = await pool.query(
            `
                INSERT INTO produtos
                (
                    id,
                    nome,
                    preco,
                    custo,
                    fornecedor,
                    quantidade_inicial,
                    estoque_minimo
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                String(codigo_barras).trim(),
                String(nome).trim(),
                precoNumerico,
                custoNumerico,
                fornecedor ? String(fornecedor).trim() : null,
                quantidadeInicialNumerica,
                estoqueMinimoNumerico
            ]
        );

        res.status(201).json({
            mensagem: "Produto cadastrado com sucesso.",
            codigo_barras: codigo_barras,
            id: resultado.insertId
        });
    } catch (erro) {
        console.error("Erro ao cadastrar produto:", erro.message);

        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "Já existe um produto cadastrado com este código de barras."
            });
        }

        res.status(500).json({
            mensagem: "Erro ao cadastrar produto.",
            erro: erro.message
        });
    }
});

export default router;