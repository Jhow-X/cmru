import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  adminOnly = false
}: {
  path: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen bg-primary-bg">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      </Route>
    );
  }

  // Not authenticated, redirect to login
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Route requires admin access but user is not an admin
  if (adminOnly && user.role !== 'admin') {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  // User is authenticated and has the correct role
  return <Route path={path} component={Component} />;
}
