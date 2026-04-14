/** IDE/tsserver only: Deno resolves this URL at runtime. */
declare module "https://esm.sh/stripe@14.25.0?target=deno" {
  class Stripe {
    webhooks: {
      constructEvent(body: string, sig: string, secret: string): Stripe.Event;
      constructEventAsync(
        body: string,
        sig: string,
        secret: string,
      ): Promise<Stripe.Event>;
    };
    checkout: {
      sessions: {
        create(
          params: Record<string, unknown>,
        ): Promise<{ url: string | null }>;
      };
    };
    constructor(apiKey: string, options?: { apiVersion?: string });
  }
  namespace Stripe {
    interface Event {
      type: string;
      data: { object: unknown };
    }
    namespace Checkout {
      interface Session {
        mode: string;
        metadata?: Record<string, string>;
        subscription?: string | { id: string };
        customer?: string | { id: string };
      }
    }
    interface Subscription {
      id: string;
      status: string;
      metadata?: Record<string, string>;
      customer: string | { id: string };
    }
  }
  export default Stripe;
}
