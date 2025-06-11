// supabase/functions/hello.ts
export default async (req: Request) => {
  return new Response('¡Hola mundo desde Supabase Edge Runtime!', {
    headers: { 'Content-Type': 'text/plain' },
  });
};
