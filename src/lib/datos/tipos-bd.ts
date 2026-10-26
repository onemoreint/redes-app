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
      marcas: {
        Row: {
          id: string
          espacio_id: string
          nombre: string
          descripcion: string
          color: string
          tono: string
          publico_objetivo: string
          frecuencia_publicacion: string
          archivada: boolean
          creado_por: string | null
          creado_en: string
          actualizado_por: string | null
          actualizado_en: string
        }
        Insert: {
          id?: string
          espacio_id: string
          nombre: string
          descripcion?: string
          color?: string
          tono?: string
          publico_objetivo?: string
          frecuencia_publicacion?: string
          archivada?: boolean
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Update: {
          id?: string
          espacio_id?: string
          nombre?: string
          descripcion?: string
          color?: string
          tono?: string
          publico_objetivo?: string
          frecuencia_publicacion?: string
          archivada?: boolean
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'marcas_espacio_id_fkey'
            columns: ['espacio_id']
            isOneToOne: false
            referencedRelation: 'espacios'
            referencedColumns: ['id']
          },
        ]
      }
      estrategias: {
        Row: {
          marca_id: string
          espacio_id: string
          empresa: string
          mision: string
          vision: string
          publico: string
          mensaje: string
          fortalezas: string
          debilidades: string
          competencia: string
          fortalezas_competencia: string
          ventaja: string
          diferenciacion: string
          obstaculos: string
          beneficios: string
          medir_estado_semanal: string
          medir_crecimiento: string
          medir_compromiso: string
          medir_influencia: string
          evaluacion: string
          check_mensaje: boolean
          check_grafica: boolean
          check_monitoreo: boolean
          check_id_social: boolean
          check_publicacion_diaria: boolean
          check_informes: boolean
          creado_por: string | null
          creado_en: string
          actualizado_por: string | null
          actualizado_en: string
        }
        Insert: {
          marca_id: string
          espacio_id: string
          empresa?: string
          mision?: string
          vision?: string
          publico?: string
          mensaje?: string
          fortalezas?: string
          debilidades?: string
          competencia?: string
          fortalezas_competencia?: string
          ventaja?: string
          diferenciacion?: string
          obstaculos?: string
          beneficios?: string
          medir_estado_semanal?: string
          medir_crecimiento?: string
          medir_compromiso?: string
          medir_influencia?: string
          evaluacion?: string
          check_mensaje?: boolean
          check_grafica?: boolean
          check_monitoreo?: boolean
          check_id_social?: boolean
          check_publicacion_diaria?: boolean
          check_informes?: boolean
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Update: {
          marca_id?: string
          espacio_id?: string
          empresa?: string
          mision?: string
          vision?: string
          publico?: string
          mensaje?: string
          fortalezas?: string
          debilidades?: string
          competencia?: string
          fortalezas_competencia?: string
          ventaja?: string
          diferenciacion?: string
          obstaculos?: string
          beneficios?: string
          medir_estado_semanal?: string
          medir_crecimiento?: string
          medir_compromiso?: string
          medir_influencia?: string
          evaluacion?: string
          check_mensaje?: boolean
          check_grafica?: boolean
          check_monitoreo?: boolean
          check_id_social?: boolean
          check_publicacion_diaria?: boolean
          check_informes?: boolean
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'estrategias_marca_id_fkey'
            columns: ['marca_id']
            isOneToOne: true
            referencedRelation: 'marcas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'estrategias_espacio_id_fkey'
            columns: ['espacio_id']
            isOneToOne: false
            referencedRelation: 'espacios'
            referencedColumns: ['id']
          },
        ]
      }
      objetivos: {
        Row: {
          id: string
          marca_id: string
          espacio_id: string
          descripcion: string
          canal: string | null
          metrica: string
          valor_inicial: number | null
          valor_meta: number | null
          fecha_limite: string | null
          estado: Database['public']['Enums']['estado_objetivo']
          nota_revision: string
          creado_por: string | null
          creado_en: string
          actualizado_por: string | null
          actualizado_en: string
        }
        Insert: {
          id?: string
          marca_id: string
          espacio_id: string
          descripcion: string
          canal?: string | null
          metrica?: string
          valor_inicial?: number | null
          valor_meta?: number | null
          fecha_limite?: string | null
          estado?: Database['public']['Enums']['estado_objetivo']
          nota_revision?: string
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Update: {
          id?: string
          marca_id?: string
          espacio_id?: string
          descripcion?: string
          canal?: string | null
          metrica?: string
          valor_inicial?: number | null
          valor_meta?: number | null
          fecha_limite?: string | null
          estado?: Database['public']['Enums']['estado_objetivo']
          nota_revision?: string
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'objetivos_marca_id_fkey'
            columns: ['marca_id']
            isOneToOne: false
            referencedRelation: 'marcas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'objetivos_espacio_id_fkey'
            columns: ['espacio_id']
            isOneToOne: false
            referencedRelation: 'espacios'
            referencedColumns: ['id']
          },
        ]
      }
      publicaciones: {
        Row: {
          id: string
          espacio_id: string
          marca_id: string
          titulo: string
          info_adicional: string
          categoria: string
          etapa: Database['public']['Enums']['etapa_embudo'] | null
          tipos: string[]
          texto: string
          hashtags: string
          cta: string
          recursos: string
          responsable_id: string | null
          fecha_prevista: string | null
          estado: Database['public']['Enums']['estado_publicacion']
          estado_anterior: Database['public']['Enums']['estado_publicacion'] | null
          notas: string
          campana_id: string | null
          creado_por: string | null
          creado_en: string
          actualizado_por: string | null
          actualizado_en: string
        }
        Insert: {
          id?: string
          espacio_id: string
          marca_id: string
          titulo: string
          info_adicional?: string
          categoria?: string
          etapa?: Database['public']['Enums']['etapa_embudo'] | null
          tipos?: string[]
          texto?: string
          hashtags?: string
          cta?: string
          recursos?: string
          responsable_id?: string | null
          fecha_prevista?: string | null
          estado?: Database['public']['Enums']['estado_publicacion']
          estado_anterior?: Database['public']['Enums']['estado_publicacion'] | null
          notas?: string
          campana_id?: string | null
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Update: {
          id?: string
          espacio_id?: string
          marca_id?: string
          titulo?: string
          info_adicional?: string
          categoria?: string
          etapa?: Database['public']['Enums']['etapa_embudo'] | null
          tipos?: string[]
          texto?: string
          hashtags?: string
          cta?: string
          recursos?: string
          responsable_id?: string | null
          fecha_prevista?: string | null
          estado?: Database['public']['Enums']['estado_publicacion']
          estado_anterior?: Database['public']['Enums']['estado_publicacion'] | null
          notas?: string
          campana_id?: string | null
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'publicaciones_marca_id_fkey'
            columns: ['marca_id']
            isOneToOne: false
            referencedRelation: 'marcas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'publicaciones_espacio_id_fkey'
            columns: ['espacio_id']
            isOneToOne: false
            referencedRelation: 'espacios'
            referencedColumns: ['id']
          },
        ]
      }
      publicacion_canales: {
        Row: {
          id: string
          publicacion_id: string
          espacio_id: string
          canal: string
          texto_adaptado: string
          kpi_esperado: string
          enlace_publicado: string
          fecha_publicada: string | null
          notas: string
          creado_por: string | null
          creado_en: string
          actualizado_por: string | null
          actualizado_en: string
        }
        Insert: {
          id?: string
          publicacion_id: string
          espacio_id: string
          canal: string
          texto_adaptado?: string
          kpi_esperado?: string
          enlace_publicado?: string
          fecha_publicada?: string | null
          notas?: string
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Update: {
          id?: string
          publicacion_id?: string
          espacio_id?: string
          canal?: string
          texto_adaptado?: string
          kpi_esperado?: string
          enlace_publicado?: string
          fecha_publicada?: string | null
          notas?: string
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'publicacion_canales_publicacion_id_fkey'
            columns: ['publicacion_id']
            isOneToOne: false
            referencedRelation: 'publicaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'publicacion_canales_espacio_id_fkey'
            columns: ['espacio_id']
            isOneToOne: false
            referencedRelation: 'espacios'
            referencedColumns: ['id']
          },
        ]
      }
      comentarios: {
        Row: {
          id: string
          publicacion_id: string
          espacio_id: string
          autor_id: string | null
          tipo: Database['public']['Enums']['tipo_comentario']
          texto: string
          creado_en: string
        }
        Insert: {
          id?: string
          publicacion_id: string
          espacio_id: string
          autor_id?: string | null
          tipo?: Database['public']['Enums']['tipo_comentario']
          texto?: string
          creado_en?: string
        }
        Update: {
          id?: string
          publicacion_id?: string
          espacio_id?: string
          autor_id?: string | null
          tipo?: Database['public']['Enums']['tipo_comentario']
          texto?: string
          creado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comentarios_publicacion_id_fkey'
            columns: ['publicacion_id']
            isOneToOne: false
            referencedRelation: 'publicaciones'
            referencedColumns: ['id']
          },
        ]
      }
      metricas: {
        Row: {
          id: string
          publicacion_canal_id: string
          publicacion_id: string
          espacio_id: string
          medido_el: string
          alcance: number | null
          impresiones: number | null
          me_gusta: number | null
          comentarios: number | null
          compartidos: number | null
          guardados: number | null
          clics: number | null
          menciones: number | null
          origen: Database['public']['Enums']['origen_dato']
          notas: string
          creado_por: string | null
          creado_en: string
          actualizado_por: string | null
          actualizado_en: string
        }
        Insert: {
          id?: string
          publicacion_canal_id: string
          publicacion_id: string
          espacio_id: string
          medido_el: string
          alcance?: number | null
          impresiones?: number | null
          me_gusta?: number | null
          comentarios?: number | null
          compartidos?: number | null
          guardados?: number | null
          clics?: number | null
          menciones?: number | null
          origen?: Database['public']['Enums']['origen_dato']
          notas?: string
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Update: {
          id?: string
          publicacion_canal_id?: string
          publicacion_id?: string
          espacio_id?: string
          medido_el?: string
          alcance?: number | null
          impresiones?: number | null
          me_gusta?: number | null
          comentarios?: number | null
          compartidos?: number | null
          guardados?: number | null
          clics?: number | null
          menciones?: number | null
          origen?: Database['public']['Enums']['origen_dato']
          notas?: string
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'metricas_publicacion_canal_id_fkey'
            columns: ['publicacion_canal_id']
            isOneToOne: false
            referencedRelation: 'publicacion_canales'
            referencedColumns: ['id']
          },
        ]
      }
      cuentas_red: {
        Row: {
          id: string
          espacio_id: string
          marca_id: string
          canal: string
          nombre_perfil: string
          enlace: string
          frecuencia_objetivo: string
          activa: boolean
          creado_por: string | null
          creado_en: string
          actualizado_por: string | null
          actualizado_en: string
        }
        Insert: {
          id?: string
          espacio_id: string
          marca_id: string
          canal: string
          nombre_perfil?: string
          enlace?: string
          frecuencia_objetivo?: string
          activa?: boolean
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Update: {
          id?: string
          espacio_id?: string
          marca_id?: string
          canal?: string
          nombre_perfil?: string
          enlace?: string
          frecuencia_objetivo?: string
          activa?: boolean
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cuentas_red_marca_id_fkey'
            columns: ['marca_id']
            isOneToOne: false
            referencedRelation: 'marcas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cuentas_red_espacio_id_fkey'
            columns: ['espacio_id']
            isOneToOne: false
            referencedRelation: 'espacios'
            referencedColumns: ['id']
          },
        ]
      }
      registros_auditoria: {
        Row: {
          id: string
          cuenta_id: string
          espacio_id: string
          fecha: string
          seguidores: number | null
          ultima_actividad: string | null
          frecuencia: string
          trafico_referencia: number | null
          clics_por_publicacion: number | null
          alcance: number | null
          notas: string
          creado_por: string | null
          creado_en: string
          actualizado_por: string | null
          actualizado_en: string
        }
        Insert: {
          id?: string
          cuenta_id: string
          espacio_id: string
          fecha: string
          seguidores?: number | null
          ultima_actividad?: string | null
          frecuencia?: string
          trafico_referencia?: number | null
          clics_por_publicacion?: number | null
          alcance?: number | null
          notas?: string
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Update: {
          id?: string
          cuenta_id?: string
          espacio_id?: string
          fecha?: string
          seguidores?: number | null
          ultima_actividad?: string | null
          frecuencia?: string
          trafico_referencia?: number | null
          clics_por_publicacion?: number | null
          alcance?: number | null
          notas?: string
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'registros_auditoria_cuenta_id_fkey'
            columns: ['cuenta_id']
            isOneToOne: false
            referencedRelation: 'cuentas_red'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'registros_auditoria_espacio_id_fkey'
            columns: ['espacio_id']
            isOneToOne: false
            referencedRelation: 'espacios'
            referencedColumns: ['id']
          },
        ]
      }
      campanas: {
        Row: {
          id: string
          espacio_id: string
          marca_id: string
          nombre: string
          tema: string
          objetivo: string
          etapa: Database['public']['Enums']['etapa_embudo'] | null
          inicio: string | null
          fin: string | null
          notas: string
          creado_por: string | null
          creado_en: string
          actualizado_por: string | null
          actualizado_en: string
        }
        Insert: {
          id?: string
          espacio_id: string
          marca_id: string
          nombre: string
          tema?: string
          objetivo?: string
          etapa?: Database['public']['Enums']['etapa_embudo'] | null
          inicio?: string | null
          fin?: string | null
          notas?: string
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Update: {
          id?: string
          espacio_id?: string
          marca_id?: string
          nombre?: string
          tema?: string
          objetivo?: string
          etapa?: Database['public']['Enums']['etapa_embudo'] | null
          inicio?: string | null
          fin?: string | null
          notas?: string
          creado_por?: string | null
          creado_en?: string
          actualizado_por?: string | null
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'campanas_marca_id_fkey'
            columns: ['marca_id']
            isOneToOne: false
            referencedRelation: 'marcas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campanas_espacio_id_fkey'
            columns: ['espacio_id']
            isOneToOne: false
            referencedRelation: 'espacios'
            referencedColumns: ['id']
          },
        ]
      }
      importaciones: {
        Row: {
          id: string
          espacio_id: string
          usuario_id: string | null
          archivo: string
          hoja: string
          destino: string
          filas_importadas: number
          filas_rechazadas: number
          detalle: Json
          creado_en: string
        }
        Insert: {
          id?: string
          espacio_id: string
          usuario_id?: string | null
          archivo: string
          hoja?: string
          destino: string
          filas_importadas: number
          filas_rechazadas: number
          detalle?: Json
          creado_en?: string
        }
        Update: {
          id?: string
          espacio_id?: string
          usuario_id?: string | null
          archivo?: string
          hoja?: string
          destino?: string
          filas_importadas?: number
          filas_rechazadas?: number
          detalle?: Json
          creado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'importaciones_espacio_id_fkey'
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
      solicitar_revision: {
        Args: { p_publicacion: string; p_mensaje?: string }
        Returns: Database['public']['Enums']['estado_publicacion']
      }
      revisar_publicacion: {
        Args: { p_publicacion: string; p_aprobar: boolean; p_mensaje?: string }
        Returns: Database['public']['Enums']['estado_publicacion']
      }
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
      estado_objetivo: 'activo' | 'logrado' | 'revisado' | 'abandonado'
      estado_publicacion: 'idea' | 'borrador' | 'en_revision' | 'aprobado' | 'programado' | 'publicado' | 'en_pausa' | 'descartado'
      etapa_embudo: 'conciencia' | 'investigacion' | 'decision' | 'compra' | 'retencion'
      tipo_comentario: 'comentario' | 'solicitud' | 'aprobacion' | 'devolucion'
      origen_dato: 'manual'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Rol = Database['public']['Enums']['rol_miembro']
export type Espacio = Database['public']['Tables']['espacios']['Row']
export type Miembro = Database['public']['Tables']['miembros']['Row']
export type Invitacion = Database['public']['Tables']['invitaciones']['Row']
export type Perfil = Database['public']['Tables']['perfiles']['Row']
export type Marca = Database['public']['Tables']['marcas']['Row']
export type Estrategia = Database['public']['Tables']['estrategias']['Row']
export type Objetivo = Database['public']['Tables']['objetivos']['Row']
export type EstadoObjetivo = Database['public']['Enums']['estado_objetivo']
export type Publicacion = Database['public']['Tables']['publicaciones']['Row']
export type PublicacionCanal = Database['public']['Tables']['publicacion_canales']['Row']
export type Comentario = Database['public']['Tables']['comentarios']['Row']
export type MetricaFila = Database['public']['Tables']['metricas']['Row']
export type CuentaRed = Database['public']['Tables']['cuentas_red']['Row']
export type RegistroAuditoria = Database['public']['Tables']['registros_auditoria']['Row']
export type Campana = Database['public']['Tables']['campanas']['Row']
export type Importacion = Database['public']['Tables']['importaciones']['Row']
