// Tipos generados desde el esquema de Supabase (proyecto redes-app).
// Regenerar tras cada migración: Supabase > generate_typescript_types.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      espacios: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          creado_en: string
          creado_por: string | null
          id: string
          nombre: string
          zona_horaria: string
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre: string
          zona_horaria?: string
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre?: string
          zona_horaria?: string
        }
        Relationships: []
      }
      invitaciones: {
        Row: {
          aceptada_en: string | null
          aceptada_por: string | null
          creada_en: string
          creada_por: string | null
          email: string
          espacio_id: string
          expira_en: string
          id: string
          rol: Database['public']['Enums']['rol_miembro']
          token: string
        }
        Insert: {
          aceptada_en?: string | null
          aceptada_por?: string | null
          creada_en?: string
          creada_por?: string | null
          email: string
          espacio_id: string
          expira_en?: string
          id?: string
          rol: Database['public']['Enums']['rol_miembro']
          token?: string
        }
        Update: {
          aceptada_en?: string | null
          aceptada_por?: string | null
          creada_en?: string
          creada_por?: string | null
          email?: string
          espacio_id?: string
          expira_en?: string
          id?: string
          rol?: Database['public']['Enums']['rol_miembro']
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invitaciones_espacio_id_fkey'
            columns: ['espacio_id']
            isOneToOne: false
            referencedRelation: 'espacios'
            referencedColumns: ['id']
          },
        ]
      }
      miembros: {
        Row: {
          creado_en: string
          espacio_id: string
          rol: Database['public']['Enums']['rol_miembro']
          usuario_id: string
        }
        Insert: {
          creado_en?: string
          espacio_id: string
          rol: Database['public']['Enums']['rol_miembro']
          usuario_id: string
        }
        Update: {
          creado_en?: string
          espacio_id?: string
          rol?: Database['public']['Enums']['rol_miembro']
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'miembros_espacio_id_fkey'
            columns: ['espacio_id']
            isOneToOne: false
            referencedRelation: 'espacios'
            referencedColumns: ['id']
          },
        ]
      }
      perfiles: {
        Row: {
          actualizado_en: string
          creado_en: string
          email: string
          id: string
          nombre: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          email: string
          id: string
          nombre?: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          email?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      aceptar_invitacion: { Args: { p_token: string }; Returns: string }
      crear_espacio: { Args: { p_nombre: string; p_zona_horaria?: string }; Returns: string }
      ver_invitacion: {
        Args: { p_token: string }
        Returns: {
          email: string
          espacio_nombre: string
          estado: string
          rol: Database['public']['Enums']['rol_miembro']
        }[]
      }
    }
    Enums: {
      rol_miembro: 'administrador' | 'editor' | 'revisor' | 'lector'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Rol = Database['public']['Enums']['rol_miembro']
export type Espacio = Database['public']['Tables']['espacios']['Row']
export type Miembro = Database['public']['Tables']['miembros']['Row']
export type Invitacion = Database['public']['Tables']['invitaciones']['Row']
export type Perfil = Database['public']['Tables']['perfiles']['Row']
