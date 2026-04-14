/** Minimal Deno globals for Edge Functions; runtime is Deno, not Node. */
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
