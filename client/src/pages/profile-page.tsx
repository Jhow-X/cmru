import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Esquema para atualização do perfil
const profileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  avatar: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  
  // Definir formulário com validação
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      avatar: user?.avatar || "",
    },
  });
  
  // Set document title
  document.title = "GPT da Câmara Regional de Caruaru do TJPE - Meu Perfil";
  
  // Mutação para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      
      setIsEditing(false);
      
      // Atualizar dados do usuário na aplicação
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Não foi possível atualizar seu perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Manipular submissão do formulário
  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };
  
  if (!user) return null;
  
  return (
    <div className="flex flex-col min-h-screen bg-primary-bg">
      <Header />
      
      <div className="flex flex-1">
        {!isMobile && <Sidebar />}
        
        <main className={`flex-1 ${!isMobile ? "ml-64" : ""} p-6`}>
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">Meu Perfil</h1>
            
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="profile">Informações Pessoais</TabsTrigger>
                <TabsTrigger value="activity">Atividade</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Perfil</CardTitle>
                    <CardDescription>
                      Gerencie suas informações pessoais e como elas aparecem na plataforma.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>E-mail</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="avatar"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL do Avatar (opcional)</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex justify-end space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsEditing(false)}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={updateProfileMutation.isPending}
                            >
                              {updateProfileMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-20 w-20">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-xl font-semibold">{user.name}</h3>
                            <p className="text-muted-foreground">{user.email}</p>
                            <p className="text-sm mt-1 capitalize">{user.role}</p>
                          </div>
                        </div>
                        
                        <div className="grid gap-4 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <Label className="font-medium">Nome</Label>
                            <div className="md:col-span-3">{user.name}</div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <Label className="font-medium">E-mail</Label>
                            <div className="md:col-span-3">{user.email}</div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <Label className="font-medium">Função</Label>
                            <div className="md:col-span-3 capitalize">{user.role}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  
                  {!isEditing && (
                    <CardFooter className="flex justify-end">
                      <Button onClick={() => setIsEditing(true)}>
                        Editar Perfil
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              </TabsContent>
              
              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Atividade Recente</CardTitle>
                    <CardDescription>
                      Histórico de suas interações e atividades na plataforma.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Em breve você poderá visualizar seu histórico de atividades aqui.</p>
                    </div>
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