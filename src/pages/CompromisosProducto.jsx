import React from 'react';
import Compromisos from './Compromisos';

// Compromisos que se acuerdan al final de una Auditoría de Producto: módulo propio, separado de
// "Todos los compromisos" (revisiones, mentorías y tutorías). Usa la misma pantalla de seguimiento
// (lista, evidencia, validación, vista general) pero solo con los compromisos de origen "producto".
export default function CompromisosProducto() {
  return <Compromisos origen="producto" />;
}
