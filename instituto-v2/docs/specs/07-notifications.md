# Spec 07 — Notificaciones

## Canales
- **Email** (Resend)
- **In-app** (tabla `notifications` + Supabase Realtime)

No hay WhatsApp ni SMS en MVP.

---

## Tipos de notificación

| Código | Canal | Destinatario | Disparador |
|---|---|---|---|
| `grade.published` | email + in-app | estudiante | profe publica notas |
| `grade.modified_after_publish` | email + in-app | estudiante | edición post-publicación con razón |
| `payment.recorded` | email + in-app | estudiante | admin registra pago |
| `payment.voided` | email + in-app | estudiante | admin anula pago |
| `charge.due_reminder_1` | email + in-app | estudiante | cargo en mora día 1 |
| `charge.due_reminder_5` | email + in-app | estudiante | cargo en mora día 5 |
| `charge.due_reminder_15` | email + in-app | estudiante | cargo en mora día 15 |
| `charge.overdue_admin_digest` | email + in-app | admin/treasurer | día 30+, resumen diario |
| `account.invitation` | email | usuario nuevo | admin invita |
| `account.password_reset` | email | usuario | auto solicitud |
| `course.closed` | in-app | estudiante | admin cierra curso |

---

## Batching y cooldowns

**Batching**: si un profesor publica N notas del mismo curso en una ventana de 5 minutos, se envía un solo email al estudiante con resumen: "Se publicaron N notas del curso X".

Implementación:
- Al disparar un `grade.published`, no se envía email inmediatamente.
- Se encola en una tabla `notification_queue` con `ready_at = now() + 5min`.
- Job cada 2min procesa la cola, agrupa por `(user_id, course_id, kind)` y envía un solo email.
- In-app se crea de una vez (no se batchea).

**Cooldowns**: para recordatorios de mora, no enviar el mismo tipo dos veces a la misma persona para el mismo charge en menos de 24h.

---

## Email templates

Estructura:
- `/lib/email/templates/`
  - `grade-published.tsx`
  - `payment-recorded.tsx`
  - `charge-reminder.tsx`
  - `account-invitation.tsx`
  - etc.

Construidos con `@react-email/components` para tener templates React reutilizables.

Cada template recibe props tipados y exporta:
- `subject(props): string` — asunto del email
- Componente React que renderiza el cuerpo

### Ejemplo conceptual

```tsx
// lib/email/templates/grade-published.tsx
export function subject(p: { courseName: string; count: number }) {
  return p.count === 1
    ? `Nueva nota publicada en ${p.courseName}`
    : `${p.count} nuevas notas publicadas en ${p.courseName}`
}

export default function GradePublishedEmail(props: {...}) {
  return (
    <EmailLayout>
      <Heading>Se publicaron tus notas</Heading>
      <Text>Hola {props.studentName},</Text>
      <Text>Se publicaron {props.count} notas del curso {props.courseName}.</Text>
      <Button href={props.url}>Ver notas</Button>
    </EmailLayout>
  )
}
```

---

## In-app notifications

### Creación
Helper:
```ts
// lib/notifications/in-app.ts
export async function notifyInApp(params: {
  tenantId: string
  userId: string
  kind: string
  title: string
  body: string
  link?: string
}): Promise<void>
```

Inserta en `notifications`. Supabase Realtime lo propaga al cliente suscrito.

### Consumo en el cliente
Cada portal tiene un componente `<NotificationBell />` que:
- Suscribe a cambios en `notifications` del user_id actual vía Supabase Realtime.
- Muestra badge con count de `read_at IS NULL`.
- Dropdown con últimas 10.
- Click en una → marca como leída + navega al `link`.

### Marcar como leída
Server Action `markNotificationRead(id)`. RLS: un usuario solo puede marcar sus propias notificaciones.

---

## Preferencias del usuario

MVP: todas las notificaciones se envían, sin opt-out granular. Solo se puede silenciar el email completamente desde el perfil (flag `email_notifications_enabled` en `user_profiles`).

Fase 2: matriz de preferencias por `notification_kind`.

---

## Envío de email

### Servicio
Resend. API key en `RESEND_API_KEY`.

### Pipeline
1. App llama `sendEmail({to, template, props})`.
2. Helper renderiza template React a HTML.
3. Inserta fila en `email_deliveries` con status `queued`.
4. Llama API de Resend.
5. Actualiza `status` a `sent` (con `provider_message_id`) o `failed` (con error).
6. Reintentos: si falla por razón transitoria (network, 5xx), reintenta 3 veces con backoff exponencial.
7. Si falla definitivamente → log + notificar a admin via in-app.

### Desde/Reply-to
- `from`: `"[Nombre del tenant] <noreply@[slug].instituto.app>"` (o email configurado por tenant).
- `reply_to`: email del tenant (configurable).

---

## Tests críticos

1. Publicar una nota → se crea notification in-app y email delivery (en modo test, no se envía realmente).
2. Publicar 10 notas del mismo curso en 1 min → **una sola** email delivery.
3. Un usuario no puede leer `notifications` de otro (RLS).
4. Recordatorios de mora respetan cooldown de 24h.
5. Template de email renderiza sin errores con props válidos.
6. Si Resend falla con 5xx → se reintenta; si falla con 4xx → se marca failed sin reintentar.
