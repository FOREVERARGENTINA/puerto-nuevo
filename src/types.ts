export type Role = 'docente' | 'padre' | 'alumno';
export type Classroom = 'Taller 1' | 'Taller 2';

export interface Person {
  id: string;
  name: string;
  roles: Role[];
  photo: string;
  phone?: string;
  email?: string;
  classroom?: Classroom; // Only for alumnos and potentially docentes
}

export interface Relationship {
  source: string;
  target: string;
  type: 'padre-hijo' | 'docente-alumno' | 'padre-docente' | 'compañero';
}

export interface GraphData {
  nodes: Person[];
  links: Relationship[];
}
