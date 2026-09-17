
import express from "express";

import pool from "../config/database.js";

const router = express.Router();

// ==========================================
// LISTAR TODOS OS PRODUTOS
// ==========================================
router.get("/", async (req, res) => {

    try {

        const [produtos] = await pool.query(`
            SELECT
                ID AS codigo_barras,
                nome,
                preco,
                custo,
                fornecedor,
                quantidade_inicial,
                quantidade_inicial AS estoque_atual,
                estoque_minimo 
            FROM produtos
            ORDER BY ID DESC
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

// ==========================================
// BUSCAR PRODUTO PELO CÓDIGO DE BARRAS
// ==========================================

router.get("/:codigo", async (req, res) => {

    try {

        const { codigo } = req.params;

        const [produtos] = await pool.query(`
            SELECT
                ID AS codigo_barras,
                nome,
                preco,
                custo,
                fornecedor,
                quantidade_inicial,
                quantidade_inicial AS estoque_atual,
                estoque_minimo
            FROM produtos
            WHERE ID = ?
        `, [codigo]);

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

// ==========================================
// CADASTRAR NOVO PRODUTO
// ==========================================

router.post("/", async (req, res) => {

    try {

        const {
            codigo_barras,
            nome,
            preco,
            custo,
            fornecedor,
            quantidade_inicial,
            estoque_minimo
        } = req.body;

        // Validação dos campos obrigatórios

        if (
            !codigo_barras ||
            !nome ||
            preco === undefined ||
            custo === undefined ||
            quantidade_inicial === undefined
        ) {

            return res.status(400).json({
                mensagem: "Preencha todos os campos obrigatórios."
            });

        }

        const minimo = estoque_minimo ?? 5;

        // Verificar se o código já existe

        const [existente] = await pool.query(
            "SELECT ID FROM produtos WHERE ID = ?",
            [codigo_barras]
        );

        if (existente.length > 0) {

            return res.status(409).json({
                mensagem: "Já existe um produto com este código de barras."
            });

        }

        // Inserir produto

        await pool.query(`
            INSERT INTO produtos
            (
                ID,
                nome,
                preco,
                custo,
                fornecedor,
                quantidade_inicial,
                estoque_minimo
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            codigo_barras,
            nome,
            preco,
            custo,
            fornecedor || null,
            quantidade_inicial,
            minimo
        ]);

        res.status(201).json({

            mensagem: "Produto cadastrado com sucesso!",

            produto: {
                codigo_barras,
                nome,
                preco,
                custo,
                fornecedor,
                quantidade_inicial,
                estoque_minimo: minimo ?? 5
            }

        });

    } catch (erro) {

        console.error("Erro ao cadastrar produto:", erro.message);

        res.status(500).json({

            mensagem: "Erro ao cadastrar produto.",

            erro: erro.message

        });

    }

});

export default router;