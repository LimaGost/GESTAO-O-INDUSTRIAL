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

    // A foto do cadastro é obrigatória — sem ela não há como garantir fidelidade visual
    if (!produto.foto_url) {
      return Response.json({ skipped: true, motivo: 'Produto sem foto cadastrada — vídeo não gerado para garantir fidelidade visual' });
    }

    const nome = produto.nome || 'Produto';
    const categoria = produto.categoria || '';

    // Análise visual rigorosa da foto exata do cadastro (modelo de alta qualidade com visão)
    const analise = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        'You are analyzing the EXACT registered photo of a product so a video generator can recreate it with total fidelity. ' +
        'Examine the image carefully and fill every field literally — describe ONLY what is visible, never invent or embellish. ' +
        'Include: precise object type and how many units are visible; exact shape and proportions; exact colors (be specific, e.g. "vivid opaque yellow"); ' +
        'material and surface texture; packaging details (transparent shrink-wrap plastic, box, etc.); every label with its background color, position, and ALL readable text transcribed verbatim; ' +
        'logos or illustrations on the label; barcode presence and position; and the background of the photo.',
      model: 'claude_sonnet_4_6',
      file_urls: [produto.foto_url],
      response_json_schema: {
        type: 'object',
        properties: {
          descricao_visual: { type: 'string', description: 'One extremely detailed English paragraph describing the product exactly as photographed' },
          texto_rotulo: { type: 'string', description: 'All text visible on the label, transcribed verbatim' },
          cores_principais: { type: 'string', description: 'Main exact colors of product and label' },
        },
        required: ['descricao_visual'],
      },
    });

    const descricaoVisual = analise.descricao_visual;

    const prompt =
      `Professional product demo video. CRITICAL: the product shown must be a PIXEL-FAITHFUL recreation of this exact real product — same shape, same colors, same packaging, same label, same quantity. Never redesign it. ` +
      `PRODUCT (exactly as photographed): ${descricaoVisual} ` +
      (analise.texto_rotulo ? `LABEL TEXT (must appear exactly as written): "${analise.texto_rotulo}". ` : '') +
      (analise.cores_principais ? `EXACT COLORS: ${analise.cores_principais}. ` : '') +
      `Product name: ${nome}${categoria ? ` (category: ${categoria})` : ''}. ` +
      `Scene: professional studio, elegant dark teal and gold background, soft warm lighting, camera slowly rotating around the product standing still on a reflective surface, cinematic style, premium atmosphere. ` +
      `The product must remain static and identical to the description above during the entire video — only the camera moves.`;

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