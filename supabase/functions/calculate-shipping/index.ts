import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShippingRequest {
  originCep: string;
  destinyCep: string;
  weight: number; // em gramas
  length: number; // em cm
  height: number; // em cm
  width: number; // em cm
  services?: string[]; // tipos de serviço (PAC, SEDEX)
}

interface ShippingOption {
  service: string;
  serviceName: string;
  price: number;
  deliveryTime: number;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originCep, destinyCep, weight, length, height, width, services = ['04014', '04510'] }: ShippingRequest = await req.json();

    console.log('Calculating shipping for:', { originCep, destinyCep, weight, length, height, width });

    // Validar CEPs
    const cepRegex = /^\d{5}-?\d{3}$/;
    if (!originCep || !destinyCep) {
      throw new Error('CEP de origem e destino são obrigatórios');
    }
    
    if (!cepRegex.test(originCep) || !cepRegex.test(destinyCep)) {
      throw new Error('CEP inválido');
    }

    // Limpar CEPs (remover hífen)
    const cleanOriginCep = originCep.replace('-', '');
    const cleanDestinyCep = destinyCep.replace('-', '');

    const shippingOptions: ShippingOption[] = [];

    // Calcular para cada serviço
    for (const serviceCode of services) {
      try {
        // Usando API dos Correios via web service
        const url = new URL('http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx');
        url.searchParams.set('nCdEmpresa', '');
        url.searchParams.set('sDsSenha', '');
        url.searchParams.set('nCdServico', serviceCode);
        url.searchParams.set('sCepOrigem', cleanOriginCep);
        url.searchParams.set('sCepDestino', cleanDestinyCep);
        url.searchParams.set('nVlPeso', (weight / 1000).toString()); // converter para kg
        url.searchParams.set('nCdFormato', '1'); // caixa/pacote
        url.searchParams.set('nVlComprimento', length.toString());
        url.searchParams.set('nVlAltura', height.toString());
        url.searchParams.set('nVlLargura', width.toString());
        url.searchParams.set('nVlDiametro', '0');
        url.searchParams.set('sCdMaoPropria', 'N');
        url.searchParams.set('nVlValorDeclarado', '0');
        url.searchParams.set('sCdAvisoRecebimento', 'N');
        url.searchParams.set('StrRetorno', 'xml');

        console.log('Calling Correios API:', url.toString());

        // Timeout para evitar espera excessiva
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos

        try {
          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            console.error('Correios API error:', response.status, response.statusText);
            // Fallback para valores estimados
            const serviceName = serviceCode === '04014' ? 'SEDEX' : serviceCode === '04510' ? 'PAC' : 'Correios';
            shippingOptions.push({
              service: serviceCode,
              serviceName,
              price: serviceCode === '04014' ? 25.90 : 15.90, // valores de exemplo
              deliveryTime: serviceCode === '04014' ? 2 : 7, // dias úteis
              error: 'Estimativa (API temporariamente indisponível)'
            });
            continue;
          }

          const xmlText = await response.text();
          console.log('Correios response:', xmlText);

          // Parse XML simplificado (pode ser melhorado com um parser XML)
          const priceMatch = xmlText.match(/<Valor>([\d,]+)<\/Valor>/);
          const timeMatch = xmlText.match(/<PrazoEntrega>(\d+)<\/PrazoEntrega>/);
          const errorMatch = xmlText.match(/<Erro>(\d+)<\/Erro>/);
          const errorMsgMatch = xmlText.match(/<MsgErro>([^<]+)<\/MsgErro>/);

          if (errorMatch && errorMatch[1] !== '0') {
            console.error('Correios service error:', errorMsgMatch?.[1] || 'Erro desconhecido');
            continue;
          }

          const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
          const deliveryTime = timeMatch ? parseInt(timeMatch[1]) : 0;

          const serviceName = serviceCode === '04014' ? 'SEDEX' : 
                            serviceCode === '04510' ? 'PAC' : 
                            `Correios ${serviceCode}`;

          if (price > 0) {
            shippingOptions.push({
              service: serviceCode,
              serviceName,
              price,
              deliveryTime
            });
          }

        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          if (fetchError.name === 'AbortError') {
            console.log(`Timeout para serviço ${serviceCode}`);
          } else {
            console.error(`Fetch error for service ${serviceCode}:`, fetchError);
          }
          
          // Fallback para valores estimados quando timeout ou erro
          const serviceName = serviceCode === '04014' ? 'SEDEX' : serviceCode === '04510' ? 'PAC' : 'Correios';
          const distance = calculateEstimatedDistance(cleanOriginCep, cleanDestinyCep);
          const basePrice = serviceCode === '04014' ? 20 : 12;
          const estimatedPrice = basePrice + (distance * 0.1) + (weight / 1000 * 2);
          
          shippingOptions.push({
            service: serviceCode,
            serviceName,
            price: Math.round(estimatedPrice * 100) / 100,
            deliveryTime: serviceCode === '04014' ? Math.max(2, Math.floor(distance / 500)) : Math.max(5, Math.floor(distance / 300)),
            error: fetchError.name === 'AbortError' ? 'Timeout - Valor estimado' : 'Estimativa baseada na distância'
          });
        }

      } catch (serviceError) {
        console.error(`Error calculating service ${serviceCode}:`, serviceError);
        
        // Fallback para valores estimados quando a API falha
        const serviceName = serviceCode === '04014' ? 'SEDEX' : serviceCode === '04510' ? 'PAC' : 'Correios';
        const distance = calculateEstimatedDistance(cleanOriginCep, cleanDestinyCep);
        const basePrice = serviceCode === '04014' ? 20 : 12;
        const estimatedPrice = basePrice + (distance * 0.1) + (weight / 1000 * 2);
        
        shippingOptions.push({
          service: serviceCode,
          serviceName,
          price: Math.round(estimatedPrice * 100) / 100,
          deliveryTime: serviceCode === '04014' ? Math.max(2, Math.floor(distance / 500)) : Math.max(5, Math.floor(distance / 300)),
          error: 'Estimativa baseada na distância'
        });
      }
    }

    // Se não conseguiu calcular nenhum frete, retorna valores padrão
    if (shippingOptions.length === 0) {
      shippingOptions.push(
        {
          service: '04014',
          serviceName: 'SEDEX',
          price: 25.90,
          deliveryTime: 3,
          error: 'Valor estimado'
        },
        {
          service: '04510',
          serviceName: 'PAC',
          price: 15.90,
          deliveryTime: 8,
          error: 'Valor estimado'
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        options: shippingOptions,
        origin: originCep,
        destiny: destinyCep 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error calculating shipping:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro ao calcular frete',
        options: [
          {
            service: 'standard',
            serviceName: 'Frete Padrão',
            price: 19.90,
            deliveryTime: 5,
            error: 'Valor fixo (erro no cálculo)'
          }
        ]
      }),
      { 
        status: 200, // Não retorna erro HTTP para não quebrar o frontend
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

// Função auxiliar para estimar distância baseada nos primeiros dígitos do CEP
function calculateEstimatedDistance(originCep: string, destinyCep: string): number {
  const originRegion = parseInt(originCep.substring(0, 1));
  const destinyRegion = parseInt(destinyCep.substring(0, 1));
  
  // Estimativa simples baseada na diferença entre regiões do CEP
  const regionDistance = Math.abs(originRegion - destinyRegion);
  
  // Distância estimada em km
  const baseDistance = regionDistance * 500; // 500km por região
  const subRegionDiff = Math.abs(parseInt(originCep.substring(0, 2)) - parseInt(destinyCep.substring(0, 2)));
  
  return baseDistance + (subRegionDiff * 50); // 50km por sub-região
}