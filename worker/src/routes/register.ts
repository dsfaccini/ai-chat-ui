export async function handleRegister(request: Request, env: Env): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json<{ error: string }>({ error: 'invalid_json' }, 400)
  }
  const { success, data: registration } = RegistrationSchema.safeParse(body)
  if (!success) {
    return json({ error: 'invalid_registration' }, 400)
  }
  const { slug, token, port } = registration

  const key = `slug:${slug}`
  const existing = await env.REGISTRY.get<Registration>(key, {
    type: 'json',
  })

  if (existing && existing.token !== token) {
    // Somebody else trying to hijack this slug
    return json({ error: 'token_mismatch' }, 403)
  }

  const record: Registration = {
    slug,
    token,
    port,
    updatedAt: new Date().toISOString(),
  }

  await env.REGISTRY.put(key, JSON.stringify(record))

  return json({ ok: true }, 200)
}
