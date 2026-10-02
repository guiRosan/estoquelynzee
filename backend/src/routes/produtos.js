import express from "express";
import pool from "../config/database.js";
const router = express.Router();

const consultaEstoque = `
 SELECT p.id AS codigo_barras, p.nome, p.preco, p.custo, p.fornecedor,
 p.quantidade_inicial, p.estoque_minimo, p.data_cadastro, p.data_atualizacao,
 p.quantidade_inicial + COALESCE((
   SELECT SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade
                   WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE 0 END)
   FROM movimentacao m WHERE m.codigo_barras=p.id
 ),0) AS estoque_atual
 FROM produtos p`;

router.get("/", async (req,res)=>{
 try { const r=await pool.query(`${consultaEstoque} ORDER BY p.data_cadastro DESC`); res.json(r.rows); }
 catch(e){ console.error(e); res.status(500).json({mensagem:"Erro ao buscar produtos.",erro:e.message}); }
});

router.get("/:codigo", async (req,res)=>{
 try {
   const r=await pool.query(`${consultaEstoque} WHERE p.id=$1`,[req.params.codigo]);
   if(!r.rows.length) return res.status(404).json({mensagem:"Produto não encontrado."});
   res.json(r.rows[0]);
 } catch(e){ console.error(e); res.status(500).json({mensagem:"Erro ao buscar produto.",erro:e.message}); }
});

router.post("/", async (req,res)=>{
 const {codigo_barras,nome,preco,custo,fornecedor,quantidade_inicial,estoque_minimo}=req.body;
 if(!codigo_barras||!String(codigo_barras).trim()) return res.status(400).json({mensagem:"O código de barras é obrigatório."});
 if(!nome||!String(nome).trim()) return res.status(400).json({mensagem:"O nome do produto é obrigatório."});
 const pr=Number(preco??0), cu=Number(custo??0), qi=Number(quantidade_inicial??0), em=Number(estoque_minimo??5);
 if(!Number.isFinite(pr)||pr<0) return res.status(400).json({mensagem:"O preço deve ser válido e maior ou igual a zero."});
 if(!Number.isFinite(cu)||cu<0) return res.status(400).json({mensagem:"O custo deve ser válido e maior ou igual a zero."});
 if(!Number.isInteger(qi)||qi<0) return res.status(400).json({mensagem:"A quantidade inicial deve ser inteira e maior ou igual a zero."});
 if(!Number.isInteger(em)||em<0) return res.status(400).json({mensagem:"O estoque mínimo deve ser inteiro e maior ou igual a zero."});
 try {
   const r=await pool.query(`INSERT INTO produtos
    (id,nome,preco,custo,fornecedor,quantidade_inicial,estoque_minimo)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id AS codigo_barras`,
    [String(codigo_barras).trim(),String(nome).trim(),pr,cu,fornecedor?String(fornecedor).trim():null,qi,em]);
   res.status(201).json({mensagem:"Produto cadastrado com sucesso.",codigo_barras:r.rows[0].codigo_barras});
 } catch(e){
   console.error(e);
   if(e.code==="23505") return res.status(409).json({mensagem:"Já existe um produto cadastrado com este código de barras."});
   res.status(500).json({mensagem:"Erro ao cadastrar produto.",erro:e.message});
 }
});
export default router;
