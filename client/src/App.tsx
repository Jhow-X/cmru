import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import AdminPage from "@/pages/admin-page";
import GptPage from "@/pages/gpt-page";
import FavoritesPage from "@/pages/favorites-page";
import MyGptsPage from "@/pages/my-gpts-page";
import ProfilePage from "@/pages/profile-page";
import SettingsPage from "@/pages/settings-page";
import AboutPage from "@/pages/about-page";
import CategoriesPage from "@/pages/categories-page";
import CategoryPage from "@/pages/category-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/about" component={AboutPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/favorites" component={FavoritesPage} />
      <ProtectedRoute path="/my-gpts" component={MyGptsPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/admin" component={AdminPage} adminOnly />
      <ProtectedRoute path="/gpt/:id" component={GptPage} />
      <ProtectedRoute path="/categories" component={CategoriesPage} />
      <ProtectedRoute path="/category/:categoryName" component={CategoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
