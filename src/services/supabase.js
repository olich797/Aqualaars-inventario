import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tablas necesarias en Supabase:
// - inventario: id, nombre, cantidad, precio_usd, precio_bob, created_at
// - proformas: id, nombre_cliente, ci_nit, fecha_emision, fecha_vencimiento, productos, total, created_at
// - configuracion: id, clave, valor, updated_at