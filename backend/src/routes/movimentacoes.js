import express from "express";
import pool from "../config/database.js";

const router = express.Router();


/*
    GET /api/movimentacoes

    Lista as movimentações mais recentes.
*/
router.get("/", async (req, res) => {
    try {
        const [movimentacoes] = await pool.query(`
            SELECT
                m.id,
                m.codigo_barras,
                p.nome AS produto,
                m.tipo,
                m.quantidade,
                m.observacao,
                m.data_movimentacao

            FROM movimentacao m

            INNER JOIN produtos p
                ON p.id = m.codigo_barras

            ORDER BY
                m.data_movimentacao DESC,
                m.id DESC
        `);

        res.json(movimentacoes);
    } catch (erro) {
        console.error("Erro ao buscar movimentações:", erro.message);

        res.status(500).json({
            mensagem: "Erro ao buscar movimentações.",
            erro: erro.message
        });
    }
});


/*
    POST /api/movimentacoes

    Registra uma entrada ou saída de estoque.
*/
router.post("/", async (req, res) => {
    const {
        codigo_barras,
        quantidade,
        tipo,
        observacao
    } = req.body;

    if (!codigo_barras || !String(codigo_barras).trim()) {
        return res.status(400).json({
            mensagem: "O código de barras é obrigatório."
        });
    }

    const quantidadeNumerica = Number(quantidade);

    if (
        !Number.isInteger(quantidadeNumerica) ||
        quantidadeNumerica <= 0
    ) {
        return res.status(400).json({
            mensagem: "A quantidade deve ser um número inteiro maior que zero."
        });
    }

    const tipoNormalizado = String(tipo || "").toUpperCase();

    if (!["ENTRADA", "SAIDA"].includes(tipoNormalizado)) {
        return res.status(400).json({
            mensagem: "O tipo deve ser ENTRADA ou SAIDA."
        });
    }

    const conexao = await pool.getConnection();

    try {
        await conexao.beginTransaction();

        const [produtos] = await conexao.query(
            `
                SELECT
                    p.id,
                    p.nome,
                    p.quantidade_inicial
                    + COALESCE((
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

                WHERE p.id = ?

                FOR UPDATE
            `,
            [String(codigo_barras).trim()]
        );

        if (produtos.length === 0) {
            await conexao.rollback();

            return res.status(404).json({
                mensagem: "Produto não encontrado."
            });
        }

        const produto = produtos[0];
        const estoqueAtual = Number(produto.estoque_atual);

        if (
            tipoNormalizado === "SAIDA" &&
            quantidadeNumerica > estoqueAtual
        ) {
            await conexao.rollback();

            return res.status(400).json({
                mensagem: `Estoque insuficiente. Estoque atual: ${estoqueAtual}.`
            });
        }

        await conexao.query(
            `
                INSERT INTO movimentacao
                (
                    codigo_barras,
                    tipo,
                    quantidade,
                    observacao
                )
                VALUES (?, ?, ?, ?)
            `,
            [
                String(codigo_barras).trim(),
                tipoNormalizado,
                quantidadeNumerica,
                observacao ? String(observacao).trim() : null
            ]
        );

        await conexao.commit();

        res.status(201).json({
            mensagem: "Movimentação registrada com sucesso.",
            produto: produto.nome,
            codigo_barras: codigo_barras,
            tipo: tipoNormalizado,
            quantidade: quantidadeNumerica
        });
    } catch (erro) {
        await conexao.rollback();

        console.error("Erro ao registrar movimentação:", erro.message);

        res.status(500).json({
            mensagem: "Erro ao registrar movimentação.",
            erro: erro.message
        });
    } finally {
        conexao.release();
    }
});

export default router;