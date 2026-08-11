---
type: "query"
date: "2026-08-10T17:16:23.272239+00:00"
question: "Plan para informes docentes en ficha del alumno"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Documents", "TeacherDashboard", "ChildProfile", "Roles and Permissions System"]
---

# Q: Plan para informes docentes en ficha del alumno

## Answer

Expanded from original query via vocab: docente, teacher, document, documents, file, upload, permission, permissions, role, roles, user. Plan: crear una entidad propia de informes por alumno en children/{childId}/reports, con Storage en private/children/{childId}/reports/{reportId}/archivo; docentes suben y borran sus propios informes, admins gestionan todos, familias responsables leen y descargan desde ChildProfile; implementar studentReports.service.js, componentes de carga/listado, nueva ruta docente de alumnos/informes, reglas Firestore/Storage y tests de permisos.

## Outcome

- Signal: useful

## Source Nodes

- Documents
- TeacherDashboard
- ChildProfile
- Roles and Permissions System