import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Esquema para trocar senha
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
  confirmNewPassword: z.string().min(6, "Confirme a nova senha"),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "As senhas não coincidem",
  path: ["confirmNewPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  
  // Definir formulário com validação
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });
  
  // Set document title
  document.title = "GPT da Câmara Regional de Caruaru do TJPE - Configurações";
  
  // Mutação para trocar senha
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormValues) => {
      const response = await apiRequest("POST", "/api/user/change-password", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
      
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Não foi possível alterar sua senha. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Manipular submissão do formulário
  const onSubmit = (data: ChangePasswordFormValues) => {
    changePasswordMutation.mutate(data);
  };
  
  // Toggle theme
  const handleThemeChange = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  // Toggle notifications
  const handleNotificationsChange = (checked: boolean) => {
    setNotifications(checked);
    toast({
      title: checked ? "Notificações ativadas" : "Notificações desativadas",
      description: checked 
        ? "Você receberá notificações sobre atividades relevantes." 
        : "Você não receberá mais notificações.",
    });
  };
  
  if (!user) return null;
  
  return (
    <div className="flex flex-col min-h-screen bg-primary-bg">
      <Header />
      
      <div className="flex flex-1">
        {!isMobile && <Sidebar />}
        
        <main className={`flex-1 ${!isMobile ? "ml-64" : ""} p-6`}>
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">Configurações</h1>
            
            <Tabs defaultValue="appearance" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="appearance">Aparência</TabsTrigger>
                <TabsTrigger value="notifications">Notificações</TabsTrigger>
                <TabsTrigger value="security">Segurança</TabsTrigger>
              </TabsList>
              
              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle>Aparência</CardTitle>
                    <CardDescription>
                      Personalize a aparência da interface de acordo com suas preferências.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="theme-mode">Modo Escuro</Label>
                        <p className="text-sm text-muted-foreground">
                          Ative o modo escuro para reduzir o cansaço visual.
                        </p>
                      </div>
                      <Switch
                        id="theme-mode"
                        checked={theme === "dark"}
                        onCheckedChange={handleThemeChange}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notificações</CardTitle>
                    <CardDescription>
                      Configure quais notificações você deseja receber.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-notifications">E-mail</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba notificações por e-mail sobre atividades importantes.
                        </p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={notifications}
                        onCheckedChange={handleNotificationsChange}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Segurança</CardTitle>
                    <CardDescription>
                      Gerencie sua senha e configurações de segurança da conta.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha Atual</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nova Senha</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormDescription>
                                Sua senha deve ter pelo menos 6 caracteres.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="confirmNewPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirmar Nova Senha</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          disabled={changePasswordMutation.isPending}
                        >
                          {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}