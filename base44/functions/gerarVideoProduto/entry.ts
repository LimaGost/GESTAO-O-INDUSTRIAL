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

    // Se o produto tem foto, extrai uma descrição visual detalhada com IA para o vídeo ser fiel ao produto real
    let descricaoVisual = '';
    if (produto.foto_url) {
      try {
        descricaoVisual = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: 'Look at this product photo and write, in English, an extremely precise visual description so a video generator can recreate it EXACTLY: object type, exact shape, exact colors, material, texture, packaging (wrapping, plastic, box), labels and any text visible, quantity of items shown, and proportions. Be literal — describe only what is visible in the photo, do not invent details. Answer with one long objective sentence, no introduction.',
          file_urls: [produto.foto_url],
        });
      } catch { /* segue sem descrição visual */ }
    }

    const prompt = descricaoVisual
      ? `Professional product demo video. THE PRODUCT MUST LOOK EXACTLY LIKE THIS, do not change its appearance, colors, packaging or quantity: ${descricaoVisual} ` +
        `Product name: ${nome}${categoria ? ` (category: ${categoria})` : ''}. ` +
        `Scene: professional studio, elegant dark teal and gold background, soft warm lighting, camera slowly rotating around the product placed on a reflective surface, cinematic style, detailed close-up, premium atmosphere. The product itself must remain identical to the description above at all times.`
      : `Vídeo de demonstração de produto para catálogo comercial: ${nome}${categoria ? `, categoria ${categoria}` : ''}. ${descricao}. ` +
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