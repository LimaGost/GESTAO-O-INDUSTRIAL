import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Gera um vídeo de demonstração com IA quando um novo produto é cadastrado.
// Acionada por automação de entidade (Produto → create).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const produtoId = payload?.event?.entity_id;
    let produto = payload?.data;
    if (!produtoId) return Response.json({ error: 'entity_id ausente' }, { status: 400 });

    if (!produto) {
      produto = await base44.asServiceRole.entities.Produto.get(produtoId);
    }
    if (!produto) return Response.json({ error: 'Produto não encontrado' }, { status: 404 });

    // Evita gerar de novo se já existir vídeo
    if (produto.video_demo_url) {
      return Response.json({ skipped: true, motivo: 'Produto já possui vídeo' });
    }

    const nome = produto.nome || 'Produto';
    const categoria = produto.categoria || '';
    const descricao = produto.descricao || '';

    const prompt = `Vídeo de demonstração de produto para catálogo comercial: ${nome}${categoria ? `, categoria ${categoria}` : ''}. ${descricao}. ` +
      `Cena de estúdio profissional com fundo elegante em tons de azul-petróleo escuro e dourado, iluminação suave e quente, ` +
      `câmera girando lentamente ao redor do produto em destaque sobre uma superfície refletiva, estilo cinematográfico, close-up detalhado, atmosfera premium.`;

    const result = await base44.asServiceRole.integrations.Core.GenerateVideo({
      prompt,
      duration: 6,
      aspect_ratio: '16:9',
    });

    if (!result?.url) {
      return Response.json({ error: 'Falha ao gerar vídeo' }, { status: 500 });
    }

    await base44.asServiceRole.entities.Produto.update(produtoId, { video_demo_url: result.url });

    return Response.json({ success: true, produto: nome, video_url: result.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});