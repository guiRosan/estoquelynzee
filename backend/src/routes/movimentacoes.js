import express from "express";
import pool from "../config/database.js";
const router=express.Router();

router.get("/",async(req,res)=>{
 try{
  const r=await pool.query(`SELECT m.id,m.codigo_barras,p.nome AS produto,m.tipo,m.quantidade,m.observacao,m.data_movimentacao
   FROM movimentacao m INNER JOIN produtos p ON p.id=m.codigo_barras
   ORDER BY m.data_movimentacao DESC,m.id DESC`);
  res.json(r.rows);
 }catch(e){console.error(e);res.status(500).json({mensagem:"Erro ao buscar movimentações.",erro:e.message});}
});

router.post("/",async(req,res)=>{
 const {codigo_barras,quantidade,tipo,observacao}=req.body;
 if(!codigo_barras||!String(codigo_barras).trim()) return res.status(400).json({mensagem:"O código de barras é obrigatório."});
 const q=Number(quantidade), t=String(tipo||"").toUpperCase(), codigo=String(codigo_barras).trim();
 if(!Number.isInteger(q)||q<=0) return res.status(400).json({mensagem:"A quantidade deve ser um inteiro maior que zero."});
 if(!["ENTRADA","SAIDA"].includes(t)) return res.status(400).json({mensagem:"O tipo deve ser ENTRADA ou SAIDA."});
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  const lock=await client.query("SELECT id,nome FROM produtos WHERE id=$1 FOR UPDATE",[codigo]);
  if(!lock.rows.length){await client.query("ROLLBACK");return res.status(404).json({mensagem:"Produto não encontrado."});}
  const er=await client.query(`SELECT p.id,p.nome,p.quantidade_inicial+COALESCE((
    SELECT SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE 0 END)
    FROM movimentacao m WHERE m.codigo_barras=p.id),0) AS estoque_atual
    FROM produtos p WHERE p.id=$1`,[codigo]);
  const produto=er.rows[0], estoque=Number(er.rows[0].estoque_atual);
  if(t==="SAIDA"&&q>estoque){await client.query("ROLLBACK");return res.status(400).json({mensagem:`Estoque insuficiente. Estoque atual: ${estoque}.`});}
  const ins=await client.query(`INSERT INTO movimentacao(codigo_barras,tipo,quantidade,observacao)
    VALUES($1,$2,$3,$4) RETURNING id,data_movimentacao`,[codigo,t,q,observacao?String(observacao).trim():null]);
  await client.query("COMMIT");
  res.status(201).json({mensagem:"Movimentação registrada com sucesso.",id:ins.rows[0].id,produto:produto.nome,codigo_barras:codigo,tipo:t,quantidade:q});
 }catch(e){
  try{await client.query("ROLLBACK");}catch{}
  console.error(e);res.status(500).json({mensagem:"Erro ao registrar movimentação.",erro:e.message});
 }finally{client.release();}
});
export default router;
