import type { Rol } from './datos/tipos-bd'

export const ROLES: Rol[] = ['administrador', 'editor', 'revisor', 'lector']

export const NOMBRE_ROL: Record<Rol, string> = {
  administrador: 'Administrador',
  editor: 'Editor',
  revisor: 'Revisor',
  lector: 'Lector',
}

/** Qué puede hacer cada rol (tabla aprobada en la Etapa 2). */
export const DESCRIPCION_ROL: Record<Rol, string> = {
  administrador: 'Todo: crea marcas, invita y quita miembros, cambia roles y puede borrar el espacio.',
  editor: 'Crea y edita publicaciones, estrategia, métricas y auditorías; aprueba publicaciones; importa datos.',
  revisor: 'Ve todo, comenta y aprueba o devuelve publicaciones. No edita. Ideal para un cliente.',
  lector: 'Solo ve y exporta. No edita ni aprueba.',
}

export const puede = {
  administrarEspacio: (r: Rol | null | undefined) => r === 'administrador',
  editar: (r: Rol | null | undefined) => r === 'administrador' || r === 'editor',
  aprobar: (r: Rol | null | undefined) => r === 'administrador' || r === 'editor' || r === 'revisor',
}
