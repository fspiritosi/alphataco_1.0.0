export interface AptitudTecnica {
  id: string;
  nombre: string;
  descripcion?: string | null;
  puestos: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAptitudTecnicaData {
  nombre: string;
  descripcion?: string | null;
  puestos: string[];
  is_active?: boolean;
}

export interface UpdateAptitudTecnicaData {
  id: string;
  nombre?: string;
  descripcion?: string | null;
  puestos?: string[];
  is_active?: boolean;
}
