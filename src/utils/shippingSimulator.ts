/**
 * Simulador de cálculo de frete usando a API dos Correios
 * Este arquivo demonstra como integrar o sistema de frete em um e-commerce
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Interface para produto no carrinho
 */
export interface CartProduct {
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
 * Interface para opção de frete
 */
export interface ShippingOption {
  service: string;
  serviceName: string;
  price: number;
  deliveryTime: number;
  error?: string;
}

/**
 * Interface para resposta do cálculo de frete
 */
export interface ShippingCalculationResult {
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

/**
 * Simula um carrinho com 2 produtos para demonstração
 * 
 * @returns Array com produtos simulados
 */
export function createSampleCart(): CartProduct[] {
  return [
    {
      id: 'product-1',
      name: 'Camiseta Básica 100% Algodão',
      weight: 200, // 200g - peso típico de uma camiseta
      length: 30,  // 30cm - comprimento dobrado
      height: 2,   // 2cm - espessura quando dobrada
      width: 25,   // 25cm - largura dobrada
      quantity: 2, // 2 unidades
      price: 39.90
    },
    {
      id: 'product-2',
      name: 'Calça Jeans Masculina',
      weight: 600, // 600g - peso típico de uma calça jeans
      length: 40,  // 40cm - comprimento dobrado
      height: 6,   // 6cm - espessura quando dobrada
      width: 35,   // 35cm - largura dobrada  
      quantity: 1, // 1 unidade
      price: 129.90
    }
  ];
}

/**
 * Calcula frete para um carrinho de produtos
 * 
 * @param products - Array de produtos no carrinho
 * @param originCep - CEP de origem (loja)
 * @param destinyCep - CEP de destino (cliente)
 * @param services - Serviços desejados (opcional)
 * @returns Promise com resultado do cálculo
 */
export async function calculateShippingForCart(
  products: CartProduct[],
  originCep: string,
  destinyCep: string,
  services: string[] = ['04014', '04510'] // SEDEX e PAC por padrão
): Promise<ShippingCalculationResult> {
  
  try {
    console.log('🚚 Iniciando cálculo de frete...');
    console.log(`📦 Produtos no carrinho: ${products.length}`);
    console.log(`📍 Origem: ${originCep} → Destino: ${destinyCep}`);
    
    // Chamar a função Edge do Supabase
    const { data, error } = await supabase.functions.invoke('calculate-shipping-advanced', {
      body: {
        originCep,
        destinyCep,
        products,
        services
      }
    });

    if (error) {
      console.error('❌ Erro na função de frete:', error);
      throw new Error(error.message || 'Erro ao calcular frete');
    }

    const result = data as ShippingCalculationResult;
    
    console.log('✅ Cálculo de frete concluído:');
    console.log(`   Peso total: ${result.totalWeight}g`);
    console.log(`   Dimensões: ${result.totalDimensions.length}x${result.totalDimensions.width}x${result.totalDimensions.height}cm`);
    console.log(`   Opções encontradas: ${result.options.length}`);
    
    result.options.forEach(option => {
      console.log(`   • ${option.serviceName}: R$ ${option.price.toFixed(2)} em ${option.deliveryTime} dias úteis`);
      if (option.error) {
        console.log(`     ⚠️  ${option.error}`);
      }
    });

    return result;

  } catch (error) {
    console.error('❌ Erro ao calcular frete:', error);
    
    // Retornar resultado com valores fallback
    return {
      success: false,
      options: [
        {
          service: '04510',
          serviceName: 'PAC',
          price: 19.90,
          deliveryTime: 8,
          error: 'Valor estimado devido a erro no cálculo'
        },
        {
          service: '04014', 
          serviceName: 'SEDEX',
          price: 29.90,
          deliveryTime: 3,
          error: 'Valor estimado devido a erro no cálculo'
        }
      ],
      totalWeight: calculateTotalWeight(products),
      totalDimensions: calculatePackageDimensions(products),
      origin: originCep,
      destiny: destinyCep,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Demonstração completa de uso do sistema de frete
 * Esta função mostra como integrar o cálculo em um fluxo de e-commerce
 */
export async function demonstrateShippingCalculation(): Promise<void> {
  console.log('🛒 === DEMONSTRAÇÃO DO SISTEMA DE FRETE ===');
  
  // 1. Criar carrinho simulado
  const cart = createSampleCart();
  console.log('\n📦 Carrinho criado com produtos:');
  cart.forEach((product, index) => {
    console.log(`   ${index + 1}. ${product.name}`);
    console.log(`      Quantidade: ${product.quantity}`);
    console.log(`      Peso: ${product.weight}g`);
    console.log(`      Dimensões: ${product.length}x${product.width}x${product.height}cm`);
    console.log(`      Valor: R$ ${product.price.toFixed(2)}`);
  });

  // 2. Configurar CEPs (exemplo: São Paulo → Rio de Janeiro)
  const originCep = '01310-100'; // Av. Paulista, São Paulo
  const destinyCep = '22071-900'; // Copacabana, Rio de Janeiro
  
  console.log(`\n🗺️  Calculando frete:`);
  console.log(`   Origem: ${originCep} (São Paulo - SP)`);
  console.log(`   Destino: ${destinyCep} (Rio de Janeiro - RJ)`);

  // 3. Calcular frete
  const result = await calculateShippingForCart(cart, originCep, destinyCep);

  // 4. Exibir resultados
  console.log('\n📊 RESULTADO DO CÁLCULO:');
  console.log(`   Status: ${result.success ? '✅ Sucesso' : '❌ Erro'}`);
  
  if (result.error) {
    console.log(`   Erro: ${result.error}`);
  }

  console.log(`\n📏 RESUMO DO PACOTE:`);
  console.log(`   Peso total: ${result.totalWeight}g`);
  console.log(`   Dimensões finais: ${result.totalDimensions.length}x${result.totalDimensions.width}x${result.totalDimensions.height}cm`);

  console.log(`\n🚚 OPÇÕES DE FRETE DISPONÍVEIS:`);
  result.options.forEach((option, index) => {
    console.log(`\n   ${index + 1}. ${option.serviceName} (${option.service})`);
    console.log(`      💰 Preço: R$ ${option.price.toFixed(2)}`);
    console.log(`      ⏱️  Prazo: ${option.deliveryTime} dias úteis`);
    if (option.error) {
      console.log(`      ⚠️  Observação: ${option.error}`);
    }
  });

  // 5. Simular escolha do cliente
  const cheapestOption = result.options.reduce((prev, current) => 
    prev.price < current.price ? prev : current
  );
  
  const fastestOption = result.options.reduce((prev, current) => 
    prev.deliveryTime < current.deliveryTime ? prev : current
  );

  console.log(`\n🎯 RECOMENDAÇÕES:`);
  console.log(`   💰 Mais barato: ${cheapestOption.serviceName} - R$ ${cheapestOption.price.toFixed(2)}`);
  console.log(`   ⚡ Mais rápido: ${fastestOption.serviceName} - ${fastestOption.deliveryTime} dias`);

  // 6. Calcular valor total do pedido
  const cartTotal = cart.reduce((total, product) => total + (product.price * product.quantity), 0);
  const totalWithShipping = cartTotal + cheapestOption.price;

  console.log(`\n💳 RESUMO DO PEDIDO:`);
  console.log(`   Subtotal produtos: R$ ${cartTotal.toFixed(2)}`);
  console.log(`   Frete (${cheapestOption.serviceName}): R$ ${cheapestOption.price.toFixed(2)}`);
  console.log(`   TOTAL: R$ ${totalWithShipping.toFixed(2)}`);
  
  console.log('\n✨ Demonstração concluída!');
}

/**
 * Calcula peso total do carrinho
 */
function calculateTotalWeight(products: CartProduct[]): number {
  return products.reduce((total, product) => 
    total + (product.weight * product.quantity), 0
  );
}

/**
 * Calcula dimensões do pacote para envio
 * Considera empilhamento e limites dos Correios
 */
function calculatePackageDimensions(products: CartProduct[]) {
  let maxLength = 0;
  let maxWidth = 0;
  let totalHeight = 0;

  products.forEach(product => {
    maxLength = Math.max(maxLength, product.length);
    maxWidth = Math.max(maxWidth, product.width);
    totalHeight += product.height * product.quantity;
  });

  // Aplicar limites dos Correios
  return {
    length: Math.min(Math.max(maxLength, 16), 105),
    width: Math.min(Math.max(maxWidth, 11), 105),
    height: Math.min(Math.max(totalHeight, 2), 105)
  };
}

/**
 * Utilitários para formatação de CEP
 */
export const cepUtils = {
  /**
   * Formata CEP no padrão brasileiro (12345-678)
   */
  format(cep: string): string {
    const clean = cep.replace(/\D/g, '');
    return clean.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  },

  /**
   * Remove formatação do CEP
   */
  clean(cep: string): string {
    return cep.replace(/\D/g, '');
  },

  /**
   * Valida formato do CEP
   */
  isValid(cep: string): boolean {
    const clean = this.clean(cep);
    return clean.length === 8 && /^\d{8}$/.test(clean);
  }
};

/**
 * Constantes úteis para integração
 */
export const SHIPPING_CONSTANTS = {
  // Códigos de serviços dos Correios
  SERVICES: {
    PAC: '04510',
    SEDEX: '04014',
    SEDEX_12: '04782',
    SEDEX_10: '04790',
    SEDEX_HOJE: '04804'
  },
  
  // Limites de peso e dimensões dos Correios
  LIMITS: {
    MIN_WEIGHT: 0.1, // kg
    MAX_WEIGHT: 30,  // kg
    MIN_LENGTH: 16,  // cm
    MAX_LENGTH: 105, // cm
    MIN_WIDTH: 11,   // cm
    MAX_WIDTH: 105,  // cm  
    MIN_HEIGHT: 2,   // cm
    MAX_HEIGHT: 105  // cm
  },

  // CEPs de teste
  TEST_CEPS: {
    SP_PAULISTA: '01310-100',
    RJ_COPACABANA: '22071-900',
    BH_CENTRO: '30112-000',
    BRASILIA: '70040-010',
    SALVADOR: '40070-110'
  }
};