import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function redirectToSignInIfNeeded(error: unknown, router: AppRouterInstance) {
  if (error instanceof Error && error.message === "Authentication required") {
    router.push("/signin");
    return true;
  }

  return false;
}
