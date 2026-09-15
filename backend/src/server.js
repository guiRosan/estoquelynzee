import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import pool from "./config/database.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

// ==========================================
// Midwares
// ==========================================

app.use(cors());

app.use(express.json());

// ==========================================
// Rota pricipal
// ==========================================

app.get("/", (req, res) => {
    res.send("Sistema de Estoque funcionando!");
});

// ==========================================
// Rota pra testar
// ==========================================

app.get("/api/status", (req, res) => {

    res.json({
        sistema: "Sistema de Estoque",
        status: "online"
    });

});

// ==========================================
// Teste do mysql
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

        console.error(erro);

        res.status(500).json({
            banco: "MySQL",
            status: "erro",
            mensagem: erro.message
        });

    }

});

// ==========================================
// Iniciar o servidor eba
// ==========================================

app.listen(PORT, () => {

    console.log("");
    console.log("====================================");
    console.log("     SISTEMA DE ESTOQUE");
    console.log("====================================");
    console.log(`Servidor: http://localhost:${PORT}`);
    console.log("====================================");
    console.log("");

});