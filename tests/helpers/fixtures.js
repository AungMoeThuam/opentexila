export const profile = {
  id: 1,
  name: 'Demo',
  email: 'demo@example.test',
  role: 'student',
  status: 'active',
};
export const json = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
export const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
