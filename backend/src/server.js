
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import produtosRoutes from "./routes/produtos.js";
import pool from "./config/database.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

// ==========================================
// Configuração do ES Modules
// ==========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// Middlewares
// ==========================================

app.use(cors());

app.use(express.json());

// ==========================================
// rotas de produtos
// ==========================================

app.use("/api/produtos", produtosRoutes);



// ==========================================
// Servir o Frontend
// ==========================================

// Caminho para a pasta frontend
const frontendPath = path.join(__dirname, "../../frontend");

// Permite acessar CSS, JavaScript e imagens
app.use(express.static(frontendPath));

// ==========================================
// Rota principal
// ==========================================

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// ==========================================
// Rota para testar o Backend
// ==========================================

app.get("/api/status", (req, res) => {
    res.json({
        sistema: "Sistema de Estoque",
        status: "online"
    });
});

// ==========================================
// Teste do MySQL
// ==========================================

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
        console.error("Erro ao conectar ao MySQL:", erro.message);

        res.status(500).json({
            banco: "MySQL",
            status: "erro",
            mensagem: erro.message
        });
    }
});

// ==========================================
// Iniciar o servidor
// ==========================================

app.listen(PORT, () => {

    console.log("");

    console.log("====================================");
    console.log("       SISTEMA DE ESTOQUE LYNZEE");
    console.log("====================================");

    console.log(`Servidor: http://localhost:${PORT}`);

    console.log("====================================");

    console.log("");

});