import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Interface para dados de um produto no carrinho
 */
interface CartProduct {
  id: string;
  name: string;
  weight: number; // peso em gramas
  length: number; // comprimento em cm
  height: number; // altura em cm
  width: number; // largura em cm
  quantity: number;
  price: number;
}

/**
 * Interface para requisição de cálculo de frete
 */
interface ShippingRequest {
  originCep: string; // CEP de origem (loja)
  destinyCep: string; // CEP de destino (cliente)
  products: CartProduct[]; // produtos no carrinho
  services?: string[]; // tipos de serviço (opcional, padrão PAC e SEDEX)
}

/**
 * Interface para opção de frete retornada
 */
interface ShippingOption {
  service: string; // código do serviço
  serviceName: string; // nome do serviço
  price: number; // preço em reais
  deliveryTime: number; // prazo em dias úteis
  error?: string; // mensagem de erro se houver
}

/**
 * Interface para resposta da API
 */
interface ShippingResponse {
  success: boolean;
  options: ShippingOption[];
  totalWeight: number;
  totalDimensions: {
    length: number;
    height: number;
    width: number;
  };
  origin: string;
  destiny: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ShippingRequest = await req.json();
    
    // Se não há produtos, criar simulação com 2 produtos
    let products = requestData.products;
    if (!products || products.length === 0) {
      console.log('Nenhum produto fornecido, criando simulação...');
      products = createSimulatedCart();
    }

    const { originCep, destinyCep, services = ['04014', '04510'] } = requestData;

    console.log('Calculando frete para:', { 
      originCep, 
      destinyCep, 
      productsCount: products.length,
      services 
    });

    // Validar CEPs
    if (!validateCep(originCep) || !validateCep(destinyCep)) {
      throw new Error('CEP de origem e destino devem ser válidos (formato: 12345-678 ou 12345678)');
    }

    // Calcular peso e dimensões totais do carrinho
    const cartDimensions = calculateCartDimensions(products);
    
    console.log('Dimensões calculadas do carrinho:', cartDimensions);

    // Limpar CEPs (remover hífen e espaços)
    const cleanOriginCep = originCep.replace(/\D/g, '');
    const cleanDestinyCep = destinyCep.replace(/\D/g, '');

    const shippingOptions: ShippingOption[] = [];

    // Calcular frete para cada serviço solicitado
    for (const serviceCode of services) {
      try {
        const option = await calculateShippingForService({
          serviceCode,
          originCep: cleanOriginCep,
          destinyCep: cleanDestinyCep,
          weight: cartDimensions.totalWeight,
          length: cartDimensions.length,
          height: cartDimensions.height,
          width: cartDimensions.width
        });

        if (option) {
          shippingOptions.push(option);
        }
      } catch (serviceError) {
        console.error(`Erro ao calcular serviço ${serviceCode}:`, serviceError);
        
        // Adicionar opção com valor estimado em caso de erro
        const estimatedOption = createEstimatedOption(serviceCode, cleanOriginCep, cleanDestinyCep, cartDimensions.totalWeight);
        shippingOptions.push(estimatedOption);
      }
    }

    // Se não conseguiu calcular nenhuma opção, adicionar valores padrão
    if (shippingOptions.length === 0) {
      shippingOptions.push(...createFallbackOptions());
    }

    const response: ShippingResponse = {
      success: true,
      options: shippingOptions,
      totalWeight: cartDimensions.totalWeight,
      totalDimensions: {
        length: cartDimensions.length,
        height: cartDimensions.height,
        width: cartDimensions.width
      },
      origin: originCep,
      destiny: destinyCep
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro no cálculo de frete:', error);
    
    const errorResponse: ShippingResponse = {
      success: false,
      options: createFallbackOptions(),
      totalWeight: 0,
      totalDimensions: { length: 0, height: 0, width: 0 },
      origin: '',
      destiny: '',
      error: error.message || 'Erro interno no cálculo de frete'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Não quebrar o frontend
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Cria um carrinho simulado com 2 produtos para demonstração
 */
function createSimulatedCart(): CartProduct[] {
  return [
    {
      id: '1',
      name: 'Camiseta Básica',
      weight: 200, // 200g
      length: 30,  // 30cm
      height: 2,   // 2cm (espessura dobrada)
      width: 25,   // 25cm
      quantity: 2,
      price: 39.90
    },
    {
      id: '2', 
      name: 'Calça Jeans',
      weight: 500, // 500g
      length: 35,  // 35cm
      height: 5,   // 5cm (espessura dobrada)
      width: 30,   // 30cm
      quantity: 1,
      price: 89.90
    }
  ];
}

/**
 * Valida formato do CEP brasileiro
 */
function validateCep(cep: string): boolean {
  if (!cep) return false;
  const cleanCep = cep.replace(/\D/g, '');
  return cleanCep.length === 8 && /^\d{8}$/.test(cleanCep);
}

/**
 * Calcula peso e dimensões totais do carrinho
 * Soma os pesos e calcula dimensões baseado no empacotamento
 */
function calculateCartDimensions(products: CartProduct[]) {
  let totalWeight = 0;
  let totalVolume = 0;
  let maxLength = 0;
  let maxWidth = 0;
  let totalHeight = 0;

  // Somar peso total e calcular dimensões
  for (const product of products) {
    const productWeight = product.weight * product.quantity;
    const productVolume = product.length * product.width * product.height * product.quantity;
    
    totalWeight += productWeight;
    totalVolume += productVolume;
    
    // Para empacotamento, considerar as maiores dimensões
    maxLength = Math.max(maxLength, product.length);
    maxWidth = Math.max(maxWidth, product.width);
    
    // Altura pode ser somada (empilhamento)
    totalHeight += product.height * product.quantity;
  }

  // Ajustar dimensões para limites dos Correios
  const length = Math.min(Math.max(maxLength, 16), 105); // min 16cm, max 105cm
  const width = Math.min(Math.max(maxWidth, 11), 105);   // min 11cm, max 105cm
  const height = Math.min(Math.max(totalHeight, 2), 105); // min 2cm, max 105cm

  console.log(`Carrinho: ${products.length} produtos, Peso total: ${totalWeight}g, Dimensões: ${length}x${width}x${height}cm`);

  return {
    totalWeight,
    length,
    width,
    height
  };
}

/**
 * Calcula frete para um serviço específico usando API dos Correios
 */
async function calculateShippingForService(params: {
  serviceCode: string;
  originCep: string;
  destinyCep: string;
  weight: number;
  length: number;
  height: number;
  width: number;
}): Promise<ShippingOption | null> {
  
  const { serviceCode, originCep, destinyCep, weight, length, height, width } = params;

  // Construir URL da API dos Correios
  const url = new URL('http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx');
  url.searchParams.set('nCdEmpresa', '');
  url.searchParams.set('sDsSenha', '');
  url.searchParams.set('nCdServico', serviceCode);
  url.searchParams.set('sCepOrigem', originCep);
  url.searchParams.set('sCepDestino', destinyCep);
  url.searchParams.set('nVlPeso', (weight / 1000).toString()); // converter para kg
  url.searchParams.set('nCdFormato', '1'); // 1=caixa/pacote
  url.searchParams.set('nVlComprimento', length.toString());
  url.searchParams.set('nVlAltura', height.toString());
  url.searchParams.set('nVlLargura', width.toString());
  url.searchParams.set('nVlDiametro', '0');
  url.searchParams.set('sCdMaoPropria', 'N');
  url.searchParams.set('nVlValorDeclarado', '0');
  url.searchParams.set('sCdAvisoRecebimento', 'N');
  url.searchParams.set('StrRetorno', 'xml');

  console.log(`Consultando ${getServiceName(serviceCode)} - URL:`, url.toString());

  // Configurar timeout para evitar espera excessiva
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; E-commerce Bot 1.0)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Erro HTTP ${response.status} para ${serviceCode}`);
      return null;
    }

    const xmlText = await response.text();
    console.log(`Resposta XML para ${serviceCode}:`, xmlText.substring(0, 200) + '...');

    // Parse da resposta XML
    return parseCorreiosResponse(xmlText, serviceCode);

  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    
    if (fetchError.name === 'AbortError') {
      console.log(`Timeout para ${serviceCode}`);
    } else {
      console.error(`Erro de fetch para ${serviceCode}:`, fetchError.message);
    }
    
    return null;
  }
}

/**
 * Faz parse da resposta XML dos Correios
 */
function parseCorreiosResponse(xmlText: string, serviceCode: string): ShippingOption | null {
  try {
    // Extrair dados usando regex (XML parsing simples)
    const priceMatch = xmlText.match(/<Valor>([\d,]+)<\/Valor>/);
    const timeMatch = xmlText.match(/<PrazoEntrega>(\d+)<\/PrazoEntrega>/);
    const errorCodeMatch = xmlText.match(/<Erro>(\d+)<\/Erro>/);
    const errorMsgMatch = xmlText.match(/<MsgErro>([^<]*)<\/MsgErro>/);

    // Verificar se há erro na resposta
    if (errorCodeMatch && errorCodeMatch[1] !== '0') {
      const errorMsg = errorMsgMatch?.[1] || 'Erro desconhecido';
      console.error(`Erro dos Correios para ${serviceCode}:`, errorMsg);
      return null;
    }

    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
    const deliveryTime = timeMatch ? parseInt(timeMatch[1]) : 0;

    if (price <= 0 || deliveryTime <= 0) {
      console.warn(`Dados inválidos para ${serviceCode}: preço=${price}, prazo=${deliveryTime}`);
      return null;
    }

    return {
      service: serviceCode,
      serviceName: getServiceName(serviceCode),
      price: Math.round(price * 100) / 100, // arredondar para 2 casas decimais
      deliveryTime
    };

  } catch (parseError) {
    console.error(`Erro ao parsear XML para ${serviceCode}:`, parseError);
    return null;
  }
}

/**
 * Retorna nome amigável do serviço
 */
function getServiceName(serviceCode: string): string {
  const serviceNames: { [key: string]: string } = {
    '04014': 'SEDEX',
    '04510': 'PAC',
    '04782': 'SEDEX 12',
    '04790': 'SEDEX 10',
    '04804': 'SEDEX Hoje'
  };
  
  return serviceNames[serviceCode] || `Correios ${serviceCode}`;
}

/**
 * Cria opção de frete estimada quando API falha
 */
function createEstimatedOption(serviceCode: string, originCep: string, destinyCep: string, weight: number): ShippingOption {
  const distance = calculateEstimatedDistance(originCep, destinyCep);
  const basePrice = serviceCode === '04014' ? 20 : 12; // SEDEX vs PAC
  const weightFactor = (weight / 1000) * 3; // R$ 3 por kg
  const distanceFactor = (distance / 1000) * 0.02; // R$ 0,02 por km
  
  const estimatedPrice = basePrice + weightFactor + distanceFactor;
  const estimatedDays = serviceCode === '04014' ? 
    Math.max(1, Math.floor(distance / 800)) : // SEDEX: 800km/dia
    Math.max(3, Math.floor(distance / 400));   // PAC: 400km/dia

  return {
    service: serviceCode,
    serviceName: getServiceName(serviceCode),
    price: Math.round(estimatedPrice * 100) / 100,
    deliveryTime: estimatedDays,
    error: 'Valor estimado (API temporariamente indisponível)'
  };
}

/**
 * Calcula distância estimada entre CEPs baseada nos primeiros dígitos
 */
function calculateEstimatedDistance(originCep: string, destinyCep: string): number {
  const originRegion = parseInt(originCep.substring(0, 1));
  const destinyRegion = parseInt(destinyCep.substring(0, 1));
  
  // Mapeamento básico de regiões brasileiras por CEP
  const regionDistances: { [key: number]: { lat: number, lng: number } } = {
    0: { lat: -23.5505, lng: -46.6333 }, // SP
    1: { lat: -23.5505, lng: -46.6333 }, // SP
    2: { lat: -22.9068, lng: -43.1729 }, // RJ
    3: { lat: -19.9167, lng: -43.9345 }, // MG
    4: { lat: -12.9714, lng: -38.5014 }, // BA
    5: { lat: -8.0476, lng: -34.8770 },  // PE
    6: { lat: -3.7275, lng: -38.5275 },  // CE
    7: { lat: -15.7801, lng: -47.9292 }, // DF/GO
    8: { lat: -30.0346, lng: -51.2177 }, // RS
    9: { lat: -25.4284, lng: -49.2733 }  // PR
  };

  const origin = regionDistances[originRegion] || regionDistances[0];
  const destiny = regionDistances[destinyRegion] || regionDistances[0];

  // Cálculo simplificado de distância usando diferença de coordenadas
  const latDiff = Math.abs(origin.lat - destiny.lat);
  const lngDiff = Math.abs(origin.lng - destiny.lng);
  
  // Aproximação: 1 grau ≈ 111km
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
  
  return Math.max(50, distance); // distância mínima de 50km
}

/**
 * Cria opções de frete padrão quando tudo falha
 */
function createFallbackOptions(): ShippingOption[] {
  return [
    {
      service: '04014',
      serviceName: 'SEDEX',
      price: 28.90,
      deliveryTime: 3,
      error: 'Valor padrão (sistema temporariamente indisponível)'
    },
    {
      service: '04510',
      serviceName: 'PAC',
      price: 18.90,
      deliveryTime: 8,
      error: 'Valor padrão (sistema temporariamente indisponível)'
    }
  ];
}