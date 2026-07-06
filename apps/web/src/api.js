export async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error?.message || res.statusText);
    err.code = body.error?.code;
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}
