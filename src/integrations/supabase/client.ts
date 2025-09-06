// src/integrations/supabase/client.ts

import { createClient } from '@supabase/supabase-js';

// Carrega as variáveis de ambiente do Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação para garantir que as variáveis de ambiente foram carregadas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in .env file');
}

// Cria e exporta o cliente Supabase para ser usado em todo o app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Invoca uma Supabase Edge Function de forma segura.
 * * @param functionName O nome da função a ser chamada (ex: 'get-mp-config').
 * @param body O corpo da requisição (opcional, para métodos POST).
 * @returns Um objeto contendo { data, error }.
 */
export const invokeSupabaseFunction = async (functionName: string, body?: object) => {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body ? JSON.stringify(body) : undefined,
  });

  if (error) {
    console.error(`Error invoking Supabase function '${functionName}':`, error);
    // Retorna o erro para que a função que chamou possa tratá-lo
    return { data: null, error };
  }

  // Se a função retornar um JSON como string, faz o parse
  if (typeof data === 'string') {
    try {
      return { data: JSON.parse(data), error: null };
    } catch (parseError) {
      console.error('Error parsing JSON response from function:', parseError);
      return { data: null, error: parseError };
    }
  }

  return { data, error: null };
};