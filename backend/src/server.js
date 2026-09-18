import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import pool from "./config/database.js";
import produtosRoutes from "./routes/produtos.js";
import movimentacoesRoutes from "./routes/movimentacoes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Middlewares
app.use(cors());
app.use(express.json());


// Rotas da API
app.use("/api/produtos", produtosRoutes);
app.use("/api/movimentacoes", movimentacoesRoutes);


// Status do sistema
app.get("/api/status", (req, res) => {
    res.json({
        sistema: "Sistema de Estoque Lynzee",
        status: "online"
    });
});


// Teste de conexão com o banco
app.get("/api/database", async (req, res) => {
    try {
        const [resultado] = await pool.query(
            "SELECT 1 AS conectado"
        );

        res.json({
            banco: "MySQL",
            status: "conectado",
            resultado
        });
    } catch (erro) {
        console.error(
            "Erro ao conectar ao MySQL:",
            erro.message
        );

        res.status(500).json({
            banco: "MySQL",
            status: "erro",
            mensagem: erro.message
        });
    }
});


// Rota para APIs inexistentes
app.use("/api", (req, res) => {
    res.status(404).json({
        mensagem: "Rota da API não encontrada."
    });
});


// Arquivos do frontend
const frontendPath = path.join(__dirname, "../../frontend");

app.use(express.static(frontendPath));


// Página inicial
app.get("/", (req, res) => {
    res.sendFile(
        path.join(frontendPath, "index.html")
    );
});


// Tratamento geral de erros
app.use((erro, req, res, next) => {
    console.error("Erro interno:", erro);

    res.status(500).json({
        mensagem: "Erro interno do servidor."
    });
});


// Inicialização
app.listen(PORT, () => {
    console.log("");
    console.log("====================================");
    console.log("       SISTEMA DE ESTOQUE LYNZEE");
    console.log("====================================");
    console.log(`Servidor: http://localhost:${PORT}`);
    console.log("====================================");
    console.log("");
});