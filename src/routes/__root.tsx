import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider, ScreenDim } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { PurchaseProvider } from "@/lib/purchases";
import { AddonProvider } from "@/lib/addons";
import { HazardLayerProvider } from "@/lib/hazard-layer";
import { StopsProvider } from "@/lib/stops";
import { DeliveryProvider } from "@/lib/delivery";
import { PartsProviderRoot } from "@/lib/parts";
import { VoiceProvider } from "@/lib/voice";
import { ArrivalsProvider } from "@/lib/arrivals";
import { ArrivalBridge } from "@/components/hercules/ArrivalBridge";
import { ArrivalStack } from "@/components/hercules/ArrivalStack";
import { BoltProvider } from "@/lib/bolt";
import { VehicleProvider } from "@/lib/vehicles";
import { ComplianceProvider } from "@/lib/compliance";
import { ComplianceBridge } from "@/components/hercules/ComplianceBridge";
import { TripVehiclePrompt } from "@/components/hercules/TripVehiclePrompt";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HERCULES — Voice-First AI Dispatch for Drivers" },
      {
        name: "description",
        content:
          "HERCULES is a voice-first AI dispatch and driver operating system for lease owner-operators. The AI proposes, the driver decides.",
      },
      { name: "author", content: "ZEUS" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Barlow:wght@400;500;600;700&family=Roboto+Mono:wght@500;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" data-theme="night">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <PurchaseProvider>
            <AddonProvider>
            <HazardLayerProvider>

              <StopsProvider>
                <DeliveryProvider>
                <PartsProviderRoot>
                <BoltProvider>
                <VehicleProvider>
                <ArrivalsProvider>
                <ComplianceProvider>
                <VoiceProvider>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <TripVehiclePrompt />
            <ArrivalBridge />
            <ComplianceBridge />
            <ArrivalStack />
            <ScreenDim />
            <Toaster />
                </VoiceProvider>
                </ComplianceProvider>
                </ArrivalsProvider>
                </VehicleProvider>
                </BoltProvider>
                </PartsProviderRoot>


                </DeliveryProvider>
              </StopsProvider>
            </HazardLayerProvider>
            </AddonProvider>
          </PurchaseProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
