-- Corrige race condition entre trg_sync_lote_modulo e processar_movimentacao_pastagem
-- que causava erro 23505 na unique index idx_lote_modulo_unico_ativo.
--
-- Causa: quando um registro de pastagens é inserido, a trigger
-- trg_registros_pastagens_mover_lote chama processar_movimentacao_pastagem(),
-- que no passo 4 insere em lote_pasto_historico (disparando trg_sync_lote_modulo,
-- que insere em lote_modulo_historico) e no passo 5 também insere em
-- lote_modulo_historico para o mesmo (lote_id, modulo_id), violando a
-- unique index parcial WHERE data_hora_saida IS NULL.
--
-- Correção: usar variável de sessão app.skip_sync_lote_modulo como flag.
-- processar_movimentacao_pastagem liga a flag antes do passo 4 e desliga
-- após o passo 5. trg_sync_lote_modulo_historico verifica a flag e pula
-- a inserção quando ela estiver ativa, deixando o passo 5 (mais completo,
-- que fecha o módulo antigo corretamente) responsável pela inserção.
-- trg_sync_lote_modulo continua funcionando normalmente quando o histórico
-- de pasto é criado por outras vias (UPDATE direto em lotes).

-- 1. Modificar trg_sync_lote_modulo_historico para pular quando a flag estiver ativa
CREATE OR REPLACE FUNCTION public.trg_sync_lote_modulo_historico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_modulo_id uuid;
  v_meta_dias integer;
  v_cabecas    integer;
  v_peso       numeric;
BEGIN
  -- Pular quando chamada de dentro de processar_movimentacao_pastagem,
  -- que gerencia lote_modulo_historico diretamente no passo 5.
  IF current_setting('app.skip_sync_lote_modulo', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Buscar módulo ao qual o pasto pertence (se existir)
  SELECT rp.modulo_id, m.meta_intervalo_ocupacao_dias
  INTO v_modulo_id, v_meta_dias
  FROM public.rotacao_pastos rp
  JOIN public.modulos_pastos m ON m.id = rp.modulo_id
  WHERE rp.pasto_id = NEW.pasto_id
    AND rp.ativo = true
  LIMIT 1;

  IF v_modulo_id IS NULL THEN
    RETURN NEW; -- Pasto não pertence a módulo, nada a fazer
  END IF;

  -- Usar cabecas/peso do próprio registro de entrada se disponíveis,
  -- senão buscar de lote_categorias (mais atual)
  v_cabecas := COALESCE(
    NEW.cabecas_entrada,
    (SELECT SUM(lc.quant_atual) FROM public.lote_categorias lc WHERE lc.lote_id = NEW.lote_id AND lc.quant_atual > 0)
  );

  v_peso := COALESCE(
    NEW.peso_vivo_medio_entrada_kg,
    public.calcular_peso_medio_lote(NEW.lote_id)
  );

  -- Fechar entrada anterior no módulo se existir (lote saiu e entrou de novo)
  UPDATE public.lote_modulo_historico
  SET
    data_hora_saida          = NEW.data_hora_entrada,
    cabecas_saida            = v_cabecas,
    peso_vivo_medio_saida_kg = v_peso,
    taxa_lotacao_ua_ha       = public.calcular_taxa_lotacao_modulo(v_modulo_id)
  WHERE lote_id = NEW.lote_id
    AND modulo_id = v_modulo_id
    AND data_hora_saida IS NULL;

  -- Inserir nova entrada no módulo
  INSERT INTO public.lote_modulo_historico (
    lote_id,
    modulo_id,
    data_hora_entrada,
    cabecas_entrada,
    peso_vivo_medio_entrada_kg,
    meta_intervalo_ocupacao_dias
  ) VALUES (
    NEW.lote_id,
    v_modulo_id,
    NEW.data_hora_entrada,
    v_cabecas,
    v_peso,
    COALESCE(NEW.meta_intervalo_ocupacao_dias, v_meta_dias)
  );

  RETURN NEW;
END;
$function$;

-- 2. Modificar processar_movimentacao_pastagem para setar/clear a flag
--    ao redor dos passos 4 e 5
CREATE OR REPLACE FUNCTION public.processar_movimentacao_pastagem()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_lote_id uuid;
  v_pasto_entrada_id uuid;
  v_pasto_saida_id uuid;
  v_modulo_entrada_id uuid;
  v_modulo_saida_id uuid;
  v_cabecas_atual integer;
  v_peso_atual numeric;
  v_meta_pasto integer;
  v_meta_modulo integer;
  v_historico_pasto_fechado_id uuid;
  v_dias_ocupacao numeric;
  v_desvio numeric;
  v_historico_modulo_aberto_id uuid;
  v_historico_modulo_aberto_modulo_id uuid;
  v_lote_nome text;
  v_pasto_nome text;
  v_modulo_nome text;
  v_pasto_saida_nome text;
  v_modulo_saida_nome text;
  v_novo_historico_pasto_id uuid;
  v_novo_historico_modulo_id uuid;
BEGIN
  -- Determinar lote_id (prioriza ID, fallback para nome do pasto de saída)
  v_lote_id := NEW.lote_id;

  IF v_lote_id IS NULL THEN
    IF NEW.pasto_saida_id IS NOT NULL THEN
      SELECT l.id INTO v_lote_id
      FROM public.lotes l
      WHERE l.pasto_id = NEW.pasto_saida_id AND l.fazenda_id = NEW.fazenda_id
      LIMIT 1;
    ELSE
      SELECT l.id INTO v_lote_id
      FROM public.lotes l
      JOIN public.pastos p ON l.pasto_id = p.id
      WHERE p.fazenda_id = NEW.fazenda_id AND p.nome = NEW.pasto_saida
      LIMIT 1;
    END IF;
  END IF;

  -- Determinar pasto de entrada
  IF NEW.pasto_entrada_id IS NOT NULL THEN
    v_pasto_entrada_id := NEW.pasto_entrada_id;
  ELSE
    SELECT id INTO v_pasto_entrada_id
    FROM public.pastos
    WHERE fazenda_id = NEW.fazenda_id AND nome = NEW.pasto_entrada
    LIMIT 1;
  END IF;

  -- Determinar pasto de saída
  IF NEW.pasto_saida_id IS NOT NULL THEN
    v_pasto_saida_id := NEW.pasto_saida_id;
  ELSE
    SELECT id INTO v_pasto_saida_id
    FROM public.pastos
    WHERE fazenda_id = NEW.fazenda_id AND nome = NEW.pasto_saida
    LIMIT 1;
  END IF;

  -- Se não achou lote ou pasto de entrada, não faz nada
  IF v_lote_id IS NULL OR v_pasto_entrada_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar nomes e módulos
  SELECT nome, modulo_id INTO v_pasto_nome, v_modulo_entrada_id
  FROM public.pastos WHERE id = v_pasto_entrada_id;

  SELECT nome, modulo_id INTO v_pasto_saida_nome, v_modulo_saida_id
  FROM public.pastos WHERE id = v_pasto_saida_id;

  SELECT nome INTO v_lote_nome FROM public.lotes WHERE id = v_lote_id;
  SELECT nome INTO v_modulo_nome FROM public.modulos_pastos WHERE id = v_modulo_entrada_id;
  SELECT nome INTO v_modulo_saida_nome FROM public.modulos_pastos WHERE id = v_modulo_saida_id;

  -- Buscar métricas atuais do lote
  v_cabecas_atual := public.calcular_cabecas_lote(v_lote_id);
  v_peso_atual := public.calcular_peso_medio_lote(v_lote_id);

  -- Buscar metas
  SELECT meta_intervalo_ocupacao_dias INTO v_meta_pasto
  FROM public.pastos WHERE id = v_pasto_entrada_id;
  SELECT meta_intervalo_ocupacao_dias INTO v_meta_modulo
  FROM public.modulos_pastos WHERE id = v_modulo_entrada_id;

  -- 1. Fechar histórico de pasto aberto (se existir)
  UPDATE public.lote_pasto_historico
  SET
    data_hora_saida = NEW.data,
    cabecas_saida = v_cabecas_atual,
    peso_vivo_medio_saida_kg = v_peso_atual,
    desvio_tempo_ocupacao_percent = CASE
      WHEN meta_intervalo_ocupacao_dias IS NOT NULL AND meta_intervalo_ocupacao_dias > 0 THEN
        ROUND(
          ((EXTRACT(EPOCH FROM (NEW.data - data_hora_entrada)) / 86400.0 - meta_intervalo_ocupacao_dias)
          / meta_intervalo_ocupacao_dias * 100)::numeric, 2
        )
      ELSE NULL
    END,
    updated_at = now()
  WHERE lote_id = v_lote_id AND data_hora_saida IS NULL
  RETURNING id INTO v_historico_pasto_fechado_id;

  -- 2. Atualizar lote para o novo pasto e módulo
  UPDATE public.lotes
  SET pasto_id = v_pasto_entrada_id,
      modulo_id = v_modulo_entrada_id,
      updated_at = now()
  WHERE id = v_lote_id;

  -- 3. Atualizar individuos
  UPDATE public.individuos
  SET pasto_atual = v_pasto_entrada_id,
      updated_at = now()
  WHERE fazenda_id = NEW.fazenda_id AND lote_atual = v_lote_id;

  -- Ativar flag para que trg_sync_lote_modulo não duplique a inserção
  -- em lote_modulo_historico (passo 5 abaixo gerencia isso)
  PERFORM set_config('app.skip_sync_lote_modulo', 'true', true);

  -- 4. Abrir novo histórico de pasto
  INSERT INTO public.lote_pasto_historico (
    lote_id, pasto_id, data_hora_entrada, data_hora_saida,
    cabecas_entrada, peso_vivo_medio_entrada_kg,
    modulo_id, meta_intervalo_ocupacao_dias,
    created_at, updated_at
  )
  VALUES (
    v_lote_id, v_pasto_entrada_id, NEW.data, NULL,
    v_cabecas_atual, v_peso_atual,
    v_modulo_entrada_id, v_meta_pasto,
    now(), now()
  )
  RETURNING id INTO v_novo_historico_pasto_id;

  -- Desativar flag: passo 5 agora gerencia lote_modulo_historico
  PERFORM set_config('app.skip_sync_lote_modulo', 'false', true);

  -- 5. Gerenciar histórico de módulo
  IF v_modulo_entrada_id IS NOT NULL THEN
    -- Verificar se já existe histórico de módulo aberto para este lote
    SELECT id, modulo_id
    INTO v_historico_modulo_aberto_id, v_historico_modulo_aberto_modulo_id
    FROM public.lote_modulo_historico
    WHERE lote_id = v_lote_id AND data_hora_saida IS NULL
    LIMIT 1;

    IF v_historico_modulo_aberto_id IS NULL THEN
      -- Primeiro pasto do módulo: abrir histórico
      INSERT INTO public.lote_modulo_historico (
        lote_id, modulo_id, data_hora_entrada,
        cabecas_entrada, peso_vivo_medio_entrada_kg,
        meta_intervalo_ocupacao_dias,
        created_at, updated_at
      )
      VALUES (
        v_lote_id, v_modulo_entrada_id, NEW.data,
        v_cabecas_atual, v_peso_atual,
        v_meta_modulo,
        now(), now()
      )
      RETURNING id INTO v_novo_historico_modulo_id;
    ELSIF v_historico_modulo_aberto_modulo_id <> v_modulo_entrada_id THEN
      -- Lote mudou de módulo: fechar antigo e abrir novo
      UPDATE public.lote_modulo_historico
      SET
        data_hora_saida = NEW.data,
        cabecas_saida = v_cabecas_atual,
        peso_vivo_medio_saida_kg = v_peso_atual,
        desvio_tempo_ocupacao_percent = CASE
          WHEN meta_intervalo_ocupacao_dias IS NOT NULL AND meta_intervalo_ocupacao_dias > 0 THEN
            ROUND(
              ((EXTRACT(EPOCH FROM (NEW.data - data_hora_entrada)) / 86400.0 - meta_intervalo_ocupacao_dias)
              / meta_intervalo_ocupacao_dias * 100)::numeric, 2
            )
          ELSE NULL
        END,
        updated_at = now()
      WHERE id = v_historico_modulo_aberto_id;

      INSERT INTO public.lote_modulo_historico (
        lote_id, modulo_id, data_hora_entrada,
        cabecas_entrada, peso_vivo_medio_entrada_kg,
        meta_intervalo_ocupacao_dias,
        created_at, updated_at
      )
      VALUES (
        v_lote_id, v_modulo_entrada_id, NEW.data,
        v_cabecas_atual, v_peso_atual,
        v_meta_modulo,
        now(), now()
      )
      RETURNING id INTO v_novo_historico_modulo_id;
    END IF;
  ELSE
    -- Lote entrou em pasto sem módulo: fechar qualquer histórico de módulo aberto
    SELECT id INTO v_historico_modulo_aberto_id
    FROM public.lote_modulo_historico
    WHERE lote_id = v_lote_id AND data_hora_saida IS NULL
    LIMIT 1;

    IF v_historico_modulo_aberto_id IS NOT NULL THEN
      UPDATE public.lote_modulo_historico
      SET
        data_hora_saida = NEW.data,
        cabecas_saida = v_cabecas_atual,
        peso_vivo_medio_saida_kg = v_peso_atual,
        desvio_tempo_ocupacao_percent = CASE
          WHEN meta_intervalo_ocupacao_dias IS NOT NULL AND meta_intervalo_ocupacao_dias > 0 THEN
            ROUND(
              ((EXTRACT(EPOCH FROM (NEW.data - data_hora_entrada)) / 86400.0 - meta_intervalo_ocupacao_dias)
              / meta_intervalo_ocupacao_dias * 100)::numeric, 2
            )
          ELSE NULL
        END,
        updated_at = now()
      WHERE id = v_historico_modulo_aberto_id;
    END IF;
  END IF;

  -- 6. Verificar alertas de meta excedida para ocupações retroativas
  IF v_meta_pasto IS NOT NULL THEN
    v_dias_ocupacao := EXTRACT(EPOCH FROM (now() - NEW.data)) / 86400.0;
    IF v_dias_ocupacao > v_meta_pasto THEN
      v_desvio := ((v_dias_ocupacao - v_meta_pasto) / v_meta_pasto * 100)::numeric;
      PERFORM public.gerar_notificacao_ocupacao(
        NEW.fazenda_id, v_lote_id, v_lote_nome,
        v_pasto_entrada_id, v_pasto_nome,
        NULL, NULL,
        'pasto', v_dias_ocupacao, v_meta_pasto, v_desvio,
        '/controller/pastos'
      );
    END IF;
  END IF;

  IF v_novo_historico_modulo_id IS NOT NULL AND v_meta_modulo IS NOT NULL THEN
    v_dias_ocupacao := EXTRACT(EPOCH FROM (now() - NEW.data)) / 86400.0;
    IF v_dias_ocupacao > v_meta_modulo THEN
      v_desvio := ((v_dias_ocupacao - v_meta_modulo) / v_meta_modulo * 100)::numeric;
      PERFORM public.gerar_notificacao_ocupacao(
        NEW.fazenda_id, v_lote_id, v_lote_nome,
        NULL, NULL,
        v_modulo_entrada_id, v_modulo_nome,
        'modulo', v_dias_ocupacao, v_meta_modulo, v_desvio,
        '/controller/modulos-pastos'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
